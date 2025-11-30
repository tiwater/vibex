/**
 * Controller - Workflow Lifecycle Management
 *
 * Responsibilities:
 * - Pause/Resume/Abort workflow execution
 * - State persistence (snapshots)
 * - Human-in-the-loop interactions
 * - Coordinates Planner and Executor
 */

import { EventEmitter } from "events";
import { v4 as uuidv4 } from "uuid";
import type { LanguageModel } from "ai";
import { Plan } from "../space/plan";
import type { Space } from "../space";
import {
  Planner,
  AgentInfo,
  PlanningChunk,
  ReplanAction,
  ReplanCheckResult,
} from "./planner";
import { Executor, ExecutorConfig, ExecutorState, TaskEvent } from "./executor";

// ============================================================================
// Types
// ============================================================================

export type ControllerStatus =
  | "idle"
  | "planning"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "aborted";

export type PauseReason =
  | "user_requested"
  | "human_input_required"
  | "approval_required"
  | "error_recovery"
  | "rate_limit";

export interface ControllerSnapshot {
  id: string;
  workflowId: string;
  status: ControllerStatus;
  plan: ReturnType<Plan["toJSON"]> | null;
  executorState: {
    completedTaskIds: string[];
    taskResults: Record<string, unknown>;
    failedTaskIds: string[];
  };
  variables: Record<string, unknown>;
  pauseReason?: PauseReason;
  pauseData?: Record<string, unknown>;
  error?: string;
  createdAt: string;
}

export interface ControllerEvent {
  type:
    | "workflow_start"
    | "workflow_paused"
    | "workflow_resumed"
    | "workflow_complete"
    | "workflow_failed"
    | "workflow_aborted"
    | "replan_start"
    | "replan_complete"
    | "replan_check"
    | "replan_suggested";
  workflowId: string;
  status: ControllerStatus;
  pauseReason?: PauseReason;
  pauseData?: Record<string, unknown>;
  result?: unknown;
  error?: string;
  timestamp: number;
}

export interface ReplanCheckEvent {
  taskId: string;
  taskTitle: string;
  needsReplan: boolean;
  reasoning: string;
  suggestedAction?: string;
  timestamp: number;
}

export interface ReplanSuggestedEvent {
  workflowId: string;
  reason: string;
  suggestedAction?: string;
  timestamp: number;
}

export interface ControllerConfig extends ExecutorConfig {
  /** Enable streaming for planning (default: true) */
  streamPlanning?: boolean;
  /** Enable auto-replan detection after each task (default: false) */
  autoReplan?: boolean;
}

// ============================================================================
// Controller
// ============================================================================

export class WorkflowController extends EventEmitter {
  private planner: Planner;
  private executor: Executor;
  private autoReplan: boolean;

  // Workflow state
  private workflowId: string | null = null;
  private status: ControllerStatus = "idle";
  private plan: Plan | null = null;
  private variables: Record<string, unknown> = {};
  private pauseReason?: PauseReason;
  private pauseData?: Record<string, unknown>;
  private error?: string;

  // Auto-replan tracking
  private lastReplanCheck: ReplanCheckResult | null = null;

  constructor(
    space: Space,
    model: LanguageModel,
    config: ControllerConfig = {}
  ) {
    super();

    this.planner = new Planner(model);
    this.executor = new Executor(space, config);
    this.autoReplan = config.autoReplan ?? false;

    // Forward executor events and handle auto-replan
    this.executor.on("task", (event: TaskEvent) => {
      this.emit("task", event);

      // Trigger auto-replan check on task completion
      if (this.autoReplan && event.type === "complete" && this.plan) {
        this.handleAutoReplanCheck(event).catch((err) => {
          console.warn("[WorkflowController] Auto-replan check failed:", err);
        });
      }
    });
  }

  /**
   * Handle auto-replan detection after task completion
   */
  private async handleAutoReplanCheck(event: TaskEvent): Promise<void> {
    if (!this.plan || this.status !== "running") return;

    const executorState = this.executor.getState();

    try {
      const checkResult = await this.planner.checkReplanNeeded(
        this.plan,
        {
          id: event.taskId,
          title: event.taskTitle,
          result: event.result,
        },
        {
          completedTaskIds: executorState.completedTaskIds,
          taskResults: executorState.taskResults,
        }
      );

      this.lastReplanCheck = checkResult;

      // Emit replan check event
      this.emit("replan_check", {
        taskId: event.taskId,
        taskTitle: event.taskTitle,
        ...checkResult,
        timestamp: Date.now(),
      });

      // If replan is needed, pause and trigger replan
      if (checkResult.needsReplan) {
        console.log(
          `[WorkflowController] Auto-replan triggered: ${checkResult.reasoning}`
        );

        // Pause execution
        await this.pause("user_requested", {
          autoReplan: true,
          reason: checkResult.reasoning,
          suggestedAction: checkResult.suggestedAction,
        });

        // Emit event so caller can decide to replan or resume
        this.emit("replan_suggested", {
          workflowId: this.workflowId,
          reason: checkResult.reasoning,
          suggestedAction: checkResult.suggestedAction,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.warn("[WorkflowController] Auto-replan check error:", error);
    }
  }

  /**
   * Get the last replan check result
   */
  getLastReplanCheck(): ReplanCheckResult | null {
    return this.lastReplanCheck;
  }

  // ============================================================================
  // Public API - Status
  // ============================================================================

  getStatus(): ControllerStatus {
    return this.status;
  }

  getWorkflowId(): string | null {
    return this.workflowId;
  }

  getPlan(): Plan | null {
    return this.plan;
  }

  getVariables(): Record<string, unknown> {
    return { ...this.variables };
  }

  // ============================================================================
  // Public API - Snapshots
  // ============================================================================

  /**
   * Create a snapshot for persistence
   */
  createSnapshot(): ControllerSnapshot {
    const executorState = this.executor.getState();
    return {
      id: uuidv4(),
      workflowId: this.workflowId || "",
      status: this.status,
      plan: this.plan?.toJSON() || null,
      executorState: {
        completedTaskIds: Array.from(executorState.completedTaskIds),
        taskResults: Object.fromEntries(executorState.taskResults),
        failedTaskIds: Array.from(executorState.failedTaskIds),
      },
      variables: { ...this.variables },
      pauseReason: this.pauseReason,
      pauseData: this.pauseData,
      error: this.error,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Restore from a snapshot
   */
  restoreFromSnapshot(snapshot: ControllerSnapshot): void {
    if (this.status === "running") {
      throw new Error("Cannot restore while workflow is running");
    }

    this.workflowId = snapshot.workflowId;
    this.status = snapshot.status;
    this.plan = snapshot.plan ? Plan.fromJSON(snapshot.plan) : null;
    this.variables = { ...snapshot.variables };
    this.pauseReason = snapshot.pauseReason;
    this.pauseData = snapshot.pauseData;
    this.error = snapshot.error;

    // Restore executor state
    this.executor.restoreState({
      completedTaskIds: new Set(snapshot.executorState.completedTaskIds),
      taskResults: new Map(Object.entries(snapshot.executorState.taskResults)),
      failedTaskIds: new Set(snapshot.executorState.failedTaskIds),
    });
  }

  // ============================================================================
  // Public API - Planning
  // ============================================================================

  /**
   * Generate a plan with streaming
   */
  async *streamPlan(
    goal: string,
    agents: AgentInfo[]
  ): AsyncGenerator<PlanningChunk> {
    this.status = "planning";
    this.workflowId = uuidv4();

    try {
      for await (const chunk of this.planner.streamPlan(goal, agents)) {
        yield chunk;
        if (chunk.type === "complete" && chunk.plan) {
          this.plan = chunk.plan;
        }
      }
    } catch (error) {
      this.status = "failed";
      this.error = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  /**
   * Generate a plan (non-streaming)
   */
  async createPlan(goal: string, agents: AgentInfo[]): Promise<Plan> {
    this.status = "planning";
    this.workflowId = uuidv4();

    try {
      this.plan = await this.planner.createPlan(goal, agents);
      return this.plan;
    } catch (error) {
      this.status = "failed";
      this.error = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  /**
   * Modify the plan mid-execution
   */
  async replan(
    reason: string,
    additionalContext?: Record<string, unknown>
  ): Promise<{ plan: Plan; action: ReplanAction }> {
    if (!this.plan) {
      throw new Error("No plan to modify");
    }

    const wasRunning = this.status === "running";
    if (wasRunning) {
      await this.pause("user_requested", { replanReason: reason });
    }

    this.emitControllerEvent("replan_start");

    const executorState = this.executor.getState();
    const result = await this.planner.replan(this.plan, reason, {
      completedTaskIds: executorState.completedTaskIds,
      taskResults: executorState.taskResults,
      variables: { ...this.variables, ...additionalContext },
    });

    this.emitControllerEvent("replan_complete");

    if (wasRunning) {
      await this.resume();
    }

    return result;
  }

  // ============================================================================
  // Public API - Execution Control
  // ============================================================================

  /**
   * Start executing the plan
   */
  async start(plan?: Plan): Promise<ExecutorState> {
    if (this.status === "running") {
      throw new Error("Workflow already running");
    }

    if (plan) {
      this.plan = plan;
    }

    if (!this.plan) {
      throw new Error("No plan to execute");
    }

    this.workflowId = this.workflowId || uuidv4();
    this.status = "running";

    this.emitControllerEvent("workflow_start");

    try {
      const result = await this.executor.execute(this.plan);

      if (this.status === "running") {
        this.status = "completed";
        this.emitControllerEvent("workflow_complete", {
          result: Object.fromEntries(result.taskResults),
        });
      }

      return result;
    } catch (error) {
      const currentStatus = this.status as ControllerStatus;
      if (
        currentStatus !== "paused" &&
        currentStatus !== "aborted" &&
        currentStatus !== "failed"
      ) {
        this.status = "failed";
        this.error = error instanceof Error ? error.message : String(error);
        this.emitControllerEvent("workflow_failed", { error: this.error });
      }
      throw error;
    }
  }

  /**
   * Pause execution
   */
  async pause(
    reason: PauseReason = "user_requested",
    data?: Record<string, unknown>
  ): Promise<ControllerSnapshot> {
    if (this.status !== "running") {
      throw new Error(`Cannot pause workflow in ${this.status} state`);
    }

    await this.executor.stop();

    this.status = "paused";
    this.pauseReason = reason;
    this.pauseData = data;

    this.emitControllerEvent("workflow_paused", {
      pauseReason: reason,
      pauseData: data,
    });

    return this.createSnapshot();
  }

  /**
   * Resume paused execution
   */
  async resume(input?: Record<string, unknown>): Promise<ExecutorState> {
    if (this.status !== "paused") {
      throw new Error(`Cannot resume workflow in ${this.status} state`);
    }

    if (input) {
      this.variables = { ...this.variables, ...input };
    }

    this.status = "running";
    this.pauseReason = undefined;
    this.pauseData = undefined;

    this.emitControllerEvent("workflow_resumed");

    if (!this.plan) {
      throw new Error("No plan to resume");
    }

    try {
      const result = await this.executor.execute(this.plan);

      if (this.status === "running") {
        this.status = "completed";
        this.emitControllerEvent("workflow_complete", {
          result: Object.fromEntries(result.taskResults),
        });
      }

      return result;
    } catch (error) {
      const currentStatus = this.status as ControllerStatus;
      if (
        currentStatus !== "paused" &&
        currentStatus !== "aborted" &&
        currentStatus !== "failed"
      ) {
        this.status = "failed";
        this.error = error instanceof Error ? error.message : String(error);
        this.emitControllerEvent("workflow_failed", { error: this.error });
      }
      throw error;
    }
  }

  /**
   * Abort execution
   */
  abort(reason?: string): void {
    if (this.status !== "running" && this.status !== "paused") {
      return;
    }

    this.executor.abort();
    this.status = "aborted";
    this.error = reason || "Workflow aborted by user";

    this.emitControllerEvent("workflow_aborted", { error: this.error });
  }

  // ============================================================================
  // Public API - Human-in-the-Loop
  // ============================================================================

  /**
   * Request human input (pauses and returns a promise that resolves on resume)
   */
  async requestHumanInput<T = unknown>(
    prompt: string,
    options?: {
      type?: "text" | "choice" | "approval";
      choices?: string[];
      timeout?: number;
    }
  ): Promise<T> {
    await this.pause("human_input_required", {
      prompt,
      inputType: options?.type || "text",
      choices: options?.choices,
    });

    return new Promise((resolve, reject) => {
      const timeout = options?.timeout || 300000; // 5 minutes
      const timer = setTimeout(() => {
        reject(new Error("Human input timeout"));
      }, timeout);

      const handler = (event: ControllerEvent) => {
        if (event.type === "workflow_resumed") {
          clearTimeout(timer);
          this.off("controller", handler);
          resolve(this.variables.humanInput as T);
        }
      };
      this.on("controller", handler);
    });
  }

  /**
   * Request approval before continuing
   */
  async requestApproval(
    description: string,
    details?: Record<string, unknown>
  ): Promise<boolean> {
    await this.pause("approval_required", {
      description,
      details,
    });

    return new Promise((resolve, reject) => {
      const timeout = 600000; // 10 minutes
      const timer = setTimeout(() => {
        reject(new Error("Approval timeout"));
      }, timeout);

      const handler = (event: ControllerEvent) => {
        if (event.type === "workflow_resumed") {
          clearTimeout(timer);
          this.off("controller", handler);
          resolve(this.variables.approved === true);
        } else if (event.type === "workflow_aborted") {
          clearTimeout(timer);
          this.off("controller", handler);
          resolve(false);
        }
      };
      this.on("controller", handler);
    });
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private emitControllerEvent(
    type: ControllerEvent["type"],
    extra?: Partial<ControllerEvent>
  ): void {
    const event: ControllerEvent = {
      type,
      workflowId: this.workflowId || "",
      status: this.status,
      timestamp: Date.now(),
      ...extra,
    };
    this.emit("controller", event);
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createWorkflowController(
  space: Space,
  model: LanguageModel,
  config?: ControllerConfig
): WorkflowController {
  return new WorkflowController(space, model, config);
}
