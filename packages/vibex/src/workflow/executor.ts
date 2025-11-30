/**
 * Executor - Parallel Task Execution with Dependency Graph
 *
 * Responsibilities:
 * - Execute tasks respecting dependency order
 * - Parallel execution up to concurrency limit
 * - Task retry on failure
 * - Progress tracking and events
 */

import { EventEmitter } from "events";
import { Plan } from "../space/plan";
import { Task, TaskStatus } from "../space/task";
import type { Space } from "../space";
import type { Agent } from "../runtime/agent";

// ============================================================================
// Types
// ============================================================================

export interface TaskEvent {
  type: "start" | "progress" | "complete" | "failed" | "retry";
  taskId: string;
  taskTitle: string;
  agentId?: string;
  agentName?: string;
  progress?: number;
  result?: unknown;
  error?: string;
  retryCount?: number;
  toolCalls?: Array<{ name: string; args: unknown; result?: unknown }>;
  timestamp: number;
}

export interface ExecutorConfig {
  /** Maximum concurrent tasks (default: 3) */
  maxConcurrency?: number;
  /** Auto-retry failed tasks (default: true) */
  retryOnFailure?: boolean;
  /** Max retries per task (default: 2) */
  maxRetries?: number;
  /** Timeout per task in ms (default: 300000 = 5 min) */
  taskTimeout?: number;
}

export interface ExecutorState {
  completedTaskIds: Set<string>;
  taskResults: Map<string, unknown>;
  failedTaskIds: Set<string>;
  isRunning: boolean;
}

// ============================================================================
// Executor
// ============================================================================

export class Executor extends EventEmitter {
  private space: Space;
  private config: Required<ExecutorConfig>;

  // Execution state
  private completedTaskIds: Set<string> = new Set();
  private taskResults: Map<string, unknown> = new Map();
  private failedTaskIds: Set<string> = new Set();
  private taskRetries: Map<string, number> = new Map();

  // Active task tracking
  private activeTasks: Map<string, Promise<void>> = new Map();
  private isRunning: boolean = false;
  private abortController: AbortController | null = null;

  constructor(space: Space, config: ExecutorConfig = {}) {
    super();
    this.space = space;
    this.config = {
      maxConcurrency: config.maxConcurrency ?? 3,
      retryOnFailure: config.retryOnFailure ?? true,
      maxRetries: config.maxRetries ?? 2,
      taskTimeout: config.taskTimeout ?? 300000,
    };
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Get current execution state
   */
  getState(): ExecutorState {
    return {
      completedTaskIds: new Set(this.completedTaskIds),
      taskResults: new Map(this.taskResults),
      failedTaskIds: new Set(this.failedTaskIds),
      isRunning: this.isRunning,
    };
  }

  /**
   * Restore state from a previous execution
   */
  restoreState(state: Partial<ExecutorState>): void {
    if (state.completedTaskIds) {
      this.completedTaskIds = new Set(state.completedTaskIds);
    }
    if (state.taskResults) {
      this.taskResults = new Map(state.taskResults);
    }
    if (state.failedTaskIds) {
      this.failedTaskIds = new Set(state.failedTaskIds);
    }
  }

  /**
   * Execute a plan's tasks
   * Returns when all tasks are complete or execution is stopped
   */
  async execute(plan: Plan): Promise<ExecutorState> {
    if (this.isRunning) {
      throw new Error("Executor is already running");
    }

    this.isRunning = true;
    this.abortController = new AbortController();

    try {
      await this.executeLoop(plan);
    } finally {
      this.isRunning = false;
      this.abortController = null;
    }

    return this.getState();
  }

  /**
   * Stop execution gracefully (waits for active tasks)
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;

    // Wait for active tasks to complete
    if (this.activeTasks.size > 0) {
      await Promise.allSettled(Array.from(this.activeTasks.values()));
    }
  }

  /**
   * Abort execution immediately
   */
  abort(): void {
    this.isRunning = false;
    this.abortController?.abort();
  }

  /**
   * Check if a task is complete
   */
  isTaskComplete(taskId: string): boolean {
    return this.completedTaskIds.has(taskId);
  }

  /**
   * Get result of a completed task
   */
  getTaskResult(taskId: string): unknown {
    return this.taskResults.get(taskId);
  }

  // ============================================================================
  // Private Execution Logic
  // ============================================================================

  private async executeLoop(plan: Plan): Promise<void> {
    while (this.isRunning) {
      // Check for abort
      if (this.abortController?.signal.aborted) {
        break;
      }

      // Get actionable tasks
      const actionableTasks = this.getActionableTasks(plan);

      if (actionableTasks.length === 0) {
        // Check if we're done or blocked
        const pendingTasks = plan.getTasksByStatus(TaskStatus.PENDING);
        const runningTasks = plan.getTasksByStatus(TaskStatus.RUNNING);

        if (pendingTasks.length === 0 && runningTasks.length === 0) {
          break; // All done
        }

        if (runningTasks.length > 0) {
          // Wait for a running task to complete
          await Promise.race(Array.from(this.activeTasks.values()));
          continue;
        }

        // Blocked - no actionable tasks but pending tasks exist
        console.warn("[Executor] Blocked - no actionable tasks");
        break;
      }

      // Start tasks up to concurrency limit
      const availableSlots = this.config.maxConcurrency - this.activeTasks.size;
      const tasksToStart = actionableTasks.slice(0, availableSlots);

      for (const task of tasksToStart) {
        if (!this.isRunning) break;

        const taskPromise = this.executeTask(task, plan);
        this.activeTasks.set(task.id, taskPromise);

        taskPromise.finally(() => {
          this.activeTasks.delete(task.id);
        });
      }

      // Wait for at least one task to complete
      if (this.activeTasks.size > 0) {
        await Promise.race(Array.from(this.activeTasks.values()));
      }
    }
  }

  private getActionableTasks(plan: Plan): Task[] {
    return plan.tasks.filter((task) => {
      // Skip non-pending tasks
      if (task.status !== TaskStatus.PENDING) return false;

      // Skip already active tasks
      if (this.activeTasks.has(task.id)) return false;

      // Check dependencies
      for (const dep of task.dependencies) {
        if (dep.type === "required" && !this.completedTaskIds.has(dep.taskId)) {
          return false;
        }
      }

      return true;
    });
  }

  private async executeTask(task: Task, plan: Plan): Promise<void> {
    const agentId = task.assignedTo;
    if (!agentId) {
      this.handleTaskFailure(task, "No agent assigned");
      return;
    }

    const agent = this.space.getAgent(agentId);
    if (!agent) {
      this.handleTaskFailure(task, `Agent ${agentId} not found`);
      return;
    }

    // Start task
    task.start();
    this.emitTaskEvent("start", task, agent);

    try {
      // Build context from dependencies
      const context = this.buildTaskContext(task, plan);
      const prompt = context
        ? `Context from previous work:\n${context}\n\nYour task: ${task.description}`
        : task.description;

      // Execute with timeout
      const result = await this.executeWithTimeout(task, agent, prompt);

      // Success
      task.complete(result.text);
      this.completedTaskIds.add(task.id);
      this.taskResults.set(task.id, result.text);

      this.emitTaskEvent("complete", task, agent, {
        result: result.text,
        toolCalls: result.toolCalls,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.handleTaskFailure(task, errorMessage, agent);
    }
  }

  private async executeWithTimeout(
    task: Task,
    agent: Agent,
    prompt: string
  ): Promise<{
    text: string;
    toolCalls: Array<{ name: string; args: unknown; result?: unknown }>;
  }> {
    const toolCalls: Array<{ name: string; args: unknown; result?: unknown }> =
      [];

    const executionPromise = (async () => {
      const stream = await agent.streamText({
        messages: [{ role: "user", content: prompt }],
        spaceId: this.space.spaceId,
        metadata: { taskId: task.id },
      });

      let text = "";
      for await (const chunk of stream.fullStream) {
        if (this.abortController?.signal.aborted) {
          throw new Error("Execution aborted");
        }

        if (chunk.type === "text-delta") {
          const delta = (chunk as any).delta || (chunk as any).textDelta || "";
          text += delta;

          // Emit progress
          this.emitTaskEvent("progress", task, agent, {
            progress: Math.min(text.length / 1000, 0.99),
          });
        } else if (chunk.type === "tool-call") {
          toolCalls.push({ name: chunk.toolName, args: chunk.args });
        } else if (chunk.type === "tool-result") {
          const tc = toolCalls.find((t) => t.name === chunk.toolName);
          if (tc) tc.result = chunk.result;
        }
      }

      // Get final text if stream didn't produce any
      if (!text) {
        try {
          text = await stream.text;
        } catch {
          // Ignore
        }
      }

      return { text, toolCalls };
    })();

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("Task timeout")),
        this.config.taskTimeout
      );
    });

    return Promise.race([executionPromise, timeoutPromise]);
  }

  private handleTaskFailure(task: Task, error: string, agent?: Agent): void {
    const retries = this.taskRetries.get(task.id) || 0;

    if (this.config.retryOnFailure && retries < this.config.maxRetries) {
      // Retry
      this.taskRetries.set(task.id, retries + 1);
      task.status = TaskStatus.PENDING;
      this.emitTaskEvent("retry", task, agent, {
        error,
        retryCount: retries + 1,
      });
    } else {
      // Final failure
      task.fail(error);
      this.failedTaskIds.add(task.id);
      this.emitTaskEvent("failed", task, agent, { error });
    }
  }

  private buildTaskContext(task: Task, plan: Plan): string {
    let context = "";
    for (const dep of task.dependencies) {
      const result = this.taskResults.get(dep.taskId);
      if (result) {
        const depTask = plan.getTaskById(dep.taskId);
        context += `\n[Result from "${depTask?.title || dep.taskId}"]:\n${result}\n`;
      }
    }
    return context;
  }

  private emitTaskEvent(
    type: TaskEvent["type"],
    task: Task,
    agent?: Agent,
    extra?: Partial<TaskEvent>
  ): void {
    const event: TaskEvent = {
      type,
      taskId: task.id,
      taskTitle: task.title,
      agentId: task.assignedTo,
      agentName: agent?.name,
      timestamp: Date.now(),
      ...extra,
    };
    this.emit("task", event);
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createExecutor(
  space: Space,
  config?: ExecutorConfig
): Executor {
  return new Executor(space, config);
}
