/**
 * Planner - Stream-based Plan Generation and Modification
 *
 * Responsibilities:
 * - Generate plans from goals with real-time streaming
 * - Modify plans mid-execution (replan)
 * - Structured output using Zod schemas
 */

import { z } from "zod/v3";
import type { LanguageModel } from "ai";
import { streamObject, generateObject } from "ai";
import { Plan } from "../space/plan";
import { Task, TaskStatus } from "../space/task";

// ============================================================================
// Schemas
// ============================================================================

export const TaskSchema = z.object({
  title: z.string().describe("Short, descriptive task title"),
  description: z.string().describe("What this task should accomplish"),
  assignedTo: z.string().describe("Agent ID best suited for this task"),
  dependencies: z
    .array(z.string())
    .describe("Task titles that must complete before this one"),
  priority: z
    .enum(["low", "medium", "high"])
    .optional()
    .describe("Task priority"),
  estimatedTime: z
    .string()
    .optional()
    .describe("Estimated time to complete (e.g., '5m', '1h')"),
});

export const PlanSchema = z.object({
  goal: z.string().describe("The overall goal being accomplished"),
  tasks: z.array(TaskSchema).describe("Ordered list of tasks to execute"),
  reasoning: z
    .string()
    .optional()
    .describe("Explanation of the planning approach"),
});

export const ReplanActionSchema = z.object({
  action: z
    .enum(["add_tasks", "remove_tasks", "modify_tasks", "reorder", "no_change"])
    .describe("What change to make to the plan"),
  reasoning: z.string().describe("Why this change is needed"),
  newTasks: z
    .array(TaskSchema)
    .optional()
    .describe("New tasks to add (for add_tasks action)"),
  removeTaskIds: z
    .array(z.string())
    .optional()
    .describe("Task IDs to remove (for remove_tasks action)"),
  modifiedTasks: z
    .array(
      z.object({
        taskId: z.string(),
        updates: TaskSchema.partial(),
      })
    )
    .optional()
    .describe("Tasks to modify (for modify_tasks action)"),
  newOrder: z
    .array(z.string())
    .optional()
    .describe("New task order by ID (for reorder action)"),
});

export const ReplanCheckSchema = z.object({
  needsReplan: z
    .boolean()
    .describe("Whether the remaining plan needs to be modified"),
  reasoning: z
    .string()
    .describe("Brief explanation of why replan is or isn't needed"),
  suggestedAction: z
    .enum(["add_tasks", "remove_tasks", "modify_tasks", "reorder", "no_change"])
    .optional()
    .describe("If replan needed, what type of change"),
});

// ============================================================================
// Types
// ============================================================================

export type TaskSchemaType = z.infer<typeof TaskSchema>;
export type PlanSchemaType = z.infer<typeof PlanSchema>;
export type ReplanAction = z.infer<typeof ReplanActionSchema>;
export type ReplanCheckResult = z.infer<typeof ReplanCheckSchema>;

export interface PlanningChunk {
  type: "start" | "chunk" | "complete" | "error";
  goal?: string;
  partialPlan?: Partial<PlanSchemaType>;
  plan?: Plan;
  error?: string;
  timestamp: number;
}

export interface AgentInfo {
  id: string;
  name: string;
  description: string;
}

// ============================================================================
// Planner
// ============================================================================

export class Planner {
  private model: LanguageModel;

  constructor(model: LanguageModel) {
    this.model = model;
  }

  /**
   * Generate a plan with streaming (real-time updates)
   */
  async *streamPlan(
    goal: string,
    agents: AgentInfo[],
    options?: { abortSignal?: AbortSignal }
  ): AsyncGenerator<PlanningChunk> {
    yield {
      type: "start",
      goal,
      timestamp: Date.now(),
    };

    const systemPrompt = this.buildPlanningPrompt(agents);

    try {
      const stream = streamObject({
        model: this.model,
        schema: PlanSchema,
        system: systemPrompt,
        prompt: `Create a plan for: ${goal}`,
        abortSignal: options?.abortSignal,
      });

      for await (const partial of stream.partialObjectStream) {
        yield {
          type: "chunk",
          partialPlan: partial as Partial<PlanSchemaType>,
          timestamp: Date.now(),
        };
      }

      const result = await stream.object;
      const plan = this.createPlanFromSchema(result);

      yield {
        type: "complete",
        plan,
        timestamp: Date.now(),
      };
    } catch (error) {
      yield {
        type: "error",
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      };
      throw error;
    }
  }

  /**
   * Generate a plan (non-streaming)
   */
  async createPlan(
    goal: string,
    agents: AgentInfo[],
    options?: { abortSignal?: AbortSignal }
  ): Promise<Plan> {
    const systemPrompt = this.buildPlanningPrompt(agents);

    const result = await generateObject({
      model: this.model,
      schema: PlanSchema,
      system: systemPrompt,
      prompt: `Create a plan for: ${goal}`,
      abortSignal: options?.abortSignal,
    });

    return this.createPlanFromSchema(result.object);
  }

  /**
   * Check if the remaining plan needs modification after a task completes
   * This enables auto-replan detection
   */
  async checkReplanNeeded(
    plan: Plan,
    completedTask: { id: string; title: string; result: unknown },
    context: {
      completedTaskIds: Set<string>;
      taskResults: Map<string, unknown>;
    },
    options?: { abortSignal?: AbortSignal }
  ): Promise<ReplanCheckResult> {
    const pendingTasks = plan.tasks.filter(
      (t) =>
        !context.completedTaskIds.has(t.id) && t.status !== TaskStatus.CANCELLED
    );

    // If no pending tasks, no need to replan
    if (pendingTasks.length === 0) {
      return {
        needsReplan: false,
        reasoning: "All tasks completed, no pending tasks to replan",
      };
    }

    const currentState = {
      goal: plan.goal,
      justCompleted: {
        id: completedTask.id,
        title: completedTask.title,
        result:
          typeof completedTask.result === "string"
            ? completedTask.result.slice(0, 500)
            : JSON.stringify(completedTask.result).slice(0, 500),
      },
      completedTasks: plan.tasks
        .filter((t) => context.completedTaskIds.has(t.id))
        .map((t) => ({
          id: t.id,
          title: t.title,
        })),
      pendingTasks: pendingTasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        assignedTo: t.assignedTo,
      })),
    };

    const result = await generateObject({
      model: this.model,
      schema: ReplanCheckSchema,
      system: `You are analyzing whether an execution plan needs modification.

A task just completed. Review the result and determine if the remaining pending tasks still make sense, or if the plan needs adjustment.

Reasons to replan:
- The completed task revealed new information that changes requirements
- The result suggests a different approach would be better
- Some pending tasks are now unnecessary
- New tasks should be added based on what was learned
- Task order should change based on dependencies

Reasons NOT to replan:
- The result is as expected and pending tasks are still valid
- Minor variations that don't affect the overall plan
- The plan is already optimal for the remaining work`,
      prompt: `Current execution state:
${JSON.stringify(currentState, null, 2)}

Should the remaining plan be modified based on this task's result?`,
      abortSignal: options?.abortSignal,
    });

    return result.object;
  }

  /**
   * Modify an existing plan based on new information
   */
  async replan(
    plan: Plan,
    reason: string,
    context: {
      completedTaskIds: Set<string>;
      taskResults: Map<string, unknown>;
      variables?: Record<string, unknown>;
    },
    options?: { abortSignal?: AbortSignal }
  ): Promise<{ plan: Plan; action: ReplanAction }> {
    const currentState = {
      goal: plan.goal,
      completedTasks: plan.tasks
        .filter((t) => context.completedTaskIds.has(t.id))
        .map((t) => ({
          id: t.id,
          title: t.title,
          result: context.taskResults.get(t.id),
        })),
      pendingTasks: plan.tasks
        .filter(
          (t) =>
            !context.completedTaskIds.has(t.id) &&
            t.status !== TaskStatus.CANCELLED
        )
        .map((t) => ({ id: t.id, title: t.title, status: t.status })),
      variables: context.variables,
    };

    const result = await generateObject({
      model: this.model,
      schema: ReplanActionSchema,
      system: `You are modifying an in-progress execution plan.
Current state:
${JSON.stringify(currentState, null, 2)}

The user wants to change the plan because: ${reason}

Analyze the situation and decide what changes to make.`,
      prompt: `What changes should be made to the plan? Reason: ${reason}`,
      abortSignal: options?.abortSignal,
    });

    const action = result.object;
    this.applyReplanAction(plan, action, context.completedTaskIds);

    return { plan, action };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private buildPlanningPrompt(agents: AgentInfo[]): string {
    const agentDescriptions = agents
      .map((a) => `- ${a.id}: ${a.name} - ${a.description}`)
      .join("\n");

    return `You are a planning expert. Create a detailed execution plan for the given goal.

Available agents:
${agentDescriptions}

Guidelines:
- Break down complex goals into discrete, actionable tasks
- Assign each task to the most suitable agent
- Identify dependencies between tasks (use task titles)
- Prioritize tasks appropriately
- Consider parallel execution where possible
- Keep tasks focused and achievable`;
  }

  private createPlanFromSchema(data: PlanSchemaType): Plan {
    const tasks: Task[] = [];
    const taskMap = new Map<string, Task>();

    // First pass: create all tasks
    for (let i = 0; i < data.tasks.length; i++) {
      const taskData = data.tasks[i];
      const task = new Task({
        id: `task_${i + 1}`,
        title: taskData.title,
        description: taskData.description,
        assignedTo: taskData.assignedTo,
        priority: taskData.priority || "medium",
        estimatedTime: taskData.estimatedTime,
        dependencies: [],
      });
      tasks.push(task);
      taskMap.set(taskData.title, task);
    }

    // Second pass: resolve dependencies
    for (let i = 0; i < data.tasks.length; i++) {
      const taskData = data.tasks[i];
      const task = tasks[i];

      task.dependencies = taskData.dependencies
        .map((depTitle) => {
          const depTask = taskMap.get(depTitle);
          return depTask
            ? { taskId: depTask.id, type: "required" as const }
            : null;
        })
        .filter((d): d is { taskId: string; type: "required" } => d !== null);
    }

    return new Plan({
      goal: data.goal,
      tasks,
      metadata: { reasoning: data.reasoning },
    });
  }

  private applyReplanAction(
    plan: Plan,
    action: ReplanAction,
    completedTaskIds: Set<string>
  ): void {
    switch (action.action) {
      case "add_tasks":
        if (action.newTasks) {
          for (const taskData of action.newTasks) {
            const task = new Task({
              id: `task_${plan.tasks.length + 1}_${Date.now()}`,
              title: taskData.title,
              description: taskData.description,
              assignedTo: taskData.assignedTo,
              priority: taskData.priority || "medium",
              estimatedTime: taskData.estimatedTime,
              dependencies: [],
            });
            plan.addTask(task);
          }
        }
        break;

      case "remove_tasks":
        if (action.removeTaskIds) {
          for (const taskId of action.removeTaskIds) {
            const task = plan.getTaskById(taskId);
            if (task && !completedTaskIds.has(taskId)) {
              task.cancel();
            }
          }
        }
        break;

      case "modify_tasks":
        if (action.modifiedTasks) {
          for (const mod of action.modifiedTasks) {
            const task = plan.getTaskById(mod.taskId);
            if (task && !completedTaskIds.has(mod.taskId)) {
              if (mod.updates.title) task.title = mod.updates.title;
              if (mod.updates.description)
                task.description = mod.updates.description;
              if (mod.updates.assignedTo)
                task.assignedTo = mod.updates.assignedTo;
              if (mod.updates.priority) task.priority = mod.updates.priority;
            }
          }
        }
        break;

      case "reorder":
        console.log("[Planner] Task reorder requested:", action.newOrder);
        break;

      case "no_change":
        break;
    }

    plan.updatedAt = new Date();
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createPlanner(model: LanguageModel): Planner {
  return new Planner(model);
}
