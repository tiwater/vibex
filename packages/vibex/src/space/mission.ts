/**
 * Mission - User's substantial intent within a Space
 *
 * A Mission represents a high-level goal that requires multiple tasks to complete.
 * Example: "Write a research paper on AI" is a Mission containing tasks like
 * "Research sources", "Create outline", "Write introduction", etc.
 *
 * Hierarchy:
 *   Space (persistent container)
 *     └── Mission (user's intent, has lifecycle)
 *           └── Plan (strategy, evolves)
 *                 └── Task[] (individual work items)
 */

import { Plan } from "./plan";
import { Task, TaskStatus } from "./task";

export type MissionStatus =
  | "active" // Mission is being worked on
  | "paused" // User paused the mission
  | "completed" // All tasks done, goal achieved
  | "abandoned"; // User gave up on this mission

export interface MissionConfig {
  id: string;
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high";
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export class Mission {
  public readonly id: string;
  public title: string;
  public description: string;
  public status: MissionStatus;
  public priority: "low" | "medium" | "high";
  public tags: string[];
  public metadata: Record<string, unknown>;

  // The plan for achieving this mission
  public plan?: Plan;

  // Timestamps
  public readonly createdAt: Date;
  public updatedAt: Date;
  public completedAt?: Date;

  constructor(config: MissionConfig) {
    this.id = config.id;
    this.title = config.title;
    this.description = config.description || "";
    this.status = "active";
    this.priority = config.priority || "medium";
    this.tags = config.tags || [];
    this.metadata = config.metadata || {};
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Set the plan for this mission
   */
  setPlan(plan: Plan): void {
    this.plan = plan;
    this.updatedAt = new Date();
  }

  /**
   * Get all tasks from the plan
   */
  getTasks(): Task[] {
    return this.plan?.tasks || [];
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: TaskStatus): Task[] {
    return this.getTasks().filter((t) => t.status === status);
  }

  /**
   * Get the next actionable task
   */
  getNextTask(): Task | undefined {
    return this.getTasks().find((t) => t.status === TaskStatus.PENDING);
  }

  /**
   * Get current running task
   */
  getCurrentTask(): Task | undefined {
    return this.getTasks().find((t) => t.status === TaskStatus.RUNNING);
  }

  /**
   * Calculate mission progress (0-100)
   */
  getProgress(): number {
    const tasks = this.getTasks();
    if (tasks.length === 0) return 0;

    const completed = tasks.filter(
      (t) => t.status === TaskStatus.COMPLETED
    ).length;
    return Math.round((completed / tasks.length) * 100);
  }

  /**
   * Pause the mission
   */
  pause(): void {
    if (this.status !== "active") {
      throw new Error(`Cannot pause mission in ${this.status} status`);
    }
    this.status = "paused";
    this.updatedAt = new Date();
  }

  /**
   * Resume a paused mission
   */
  resume(): void {
    if (this.status !== "paused") {
      throw new Error(`Cannot resume mission in ${this.status} status`);
    }
    this.status = "active";
    this.updatedAt = new Date();
  }

  /**
   * Complete the mission
   */
  complete(): void {
    this.status = "completed";
    this.completedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Abandon the mission
   */
  abandon(): void {
    this.status = "abandoned";
    this.completedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Check if mission is finished (completed or abandoned)
   */
  isFinished(): boolean {
    return this.status === "completed" || this.status === "abandoned";
  }

  /**
   * Serialize to JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      status: this.status,
      priority: this.priority,
      tags: this.tags,
      metadata: this.metadata,
      plan: this.plan?.toJSON(),
      progress: this.getProgress(),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      completedAt: this.completedAt?.toISOString(),
    };
  }

  /**
   * Deserialize from JSON
   */
  static fromJSON(data: Record<string, unknown>): Mission {
    const mission = new Mission({
      id: data.id as string,
      title: data.title as string,
      description: data.description as string,
      priority: data.priority as "low" | "medium" | "high",
      tags: data.tags as string[],
      metadata: data.metadata as Record<string, unknown>,
    });

    mission.status = data.status as MissionStatus;
    (mission as { createdAt: Date }).createdAt = new Date(
      data.createdAt as string
    );
    mission.updatedAt = new Date(data.updatedAt as string);

    if (data.completedAt) {
      mission.completedAt = new Date(data.completedAt as string);
    }

    if (data.plan) {
      mission.plan = Plan.fromJSON(data.plan as Record<string, unknown>);
    }

    return mission;
  }
}


