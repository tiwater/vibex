/**
 * Task - Individual work item within a Mission's Plan
 *
 * A Task is a discrete, actionable unit of work. Tasks have their own lifecycle
 * and can be assigned to specific agents.
 *
 * Hierarchy:
 *   Space (persistent container)
 *     └── Mission (user's intent)
 *           └── Plan (strategy)
 *                 └── Task[] (individual work items) <-- This file
 *
 * Note: This is different from AI SDK's "steps" which refers to multi-turn
 * tool execution loops. Our Task is a higher-level work item.
 */

export enum TaskStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  BLOCKED = "blocked",
  CANCELLED = "cancelled",
}

export interface TaskDependency {
  taskId: string;
  type: "required" | "optional";
}

export interface TaskConfig {
  id: string;
  title: string;
  description?: string;
  assignedTo?: string; // Agent ID
  priority?: "low" | "medium" | "high";
  estimatedTime?: string;
  dependencies?: TaskDependency[];
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export class Task {
  public readonly id: string;
  public title: string;
  public description: string;
  public status: TaskStatus;
  public assignedTo?: string;
  public priority: "low" | "medium" | "high";
  public estimatedTime?: string;
  public actualTime?: string;
  public dependencies: TaskDependency[];
  public tags: string[];
  public metadata: Record<string, unknown>;

  // Result of the task execution
  public result?: unknown;
  public error?: string;

  // Timestamps
  public readonly createdAt: Date;
  public updatedAt: Date;
  public startedAt?: Date;
  public completedAt?: Date;

  constructor(config: TaskConfig) {
    this.id = config.id;
    this.title = config.title;
    this.description = config.description || "";
    this.status = TaskStatus.PENDING;
    this.assignedTo = config.assignedTo;
    this.priority = config.priority || "medium";
    this.estimatedTime = config.estimatedTime;
    this.dependencies = config.dependencies || [];
    this.tags = config.tags || [];
    this.metadata = config.metadata || {};
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Start the task
   */
  start(): void {
    if (this.status !== TaskStatus.PENDING) {
      throw new Error(`Cannot start task in ${this.status} status`);
    }
    this.status = TaskStatus.RUNNING;
    this.startedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Complete the task with optional result
   */
  complete(result?: unknown): void {
    if (this.status !== TaskStatus.RUNNING) {
      throw new Error(`Cannot complete task in ${this.status} status`);
    }
    this.status = TaskStatus.COMPLETED;
    this.result = result;
    this.completedAt = new Date();
    this.updatedAt = new Date();

    if (this.startedAt) {
      this.actualTime = this.calculateDuration(this.startedAt, this.completedAt);
    }
  }

  /**
   * Mark task as failed
   */
  fail(error: string): void {
    this.status = TaskStatus.FAILED;
    this.error = error;
    this.completedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Block the task (waiting on something)
   */
  block(reason: string): void {
    this.status = TaskStatus.BLOCKED;
    this.error = reason;
    this.updatedAt = new Date();
  }

  /**
   * Cancel the task
   */
  cancel(): void {
    this.status = TaskStatus.CANCELLED;
    this.completedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Check if task can be started
   */
  isActionable(): boolean {
    return this.status === TaskStatus.PENDING && !this.hasBlockingDependencies();
  }

  /**
   * Check if task is finished (completed, failed, or cancelled)
   */
  isFinished(): boolean {
    return (
      this.status === TaskStatus.COMPLETED ||
      this.status === TaskStatus.FAILED ||
      this.status === TaskStatus.CANCELLED
    );
  }

  /**
   * Check for blocking dependencies
   * Note: In real implementation, this would check against other tasks
   */
  hasBlockingDependencies(): boolean {
    // TODO: Implement dependency checking against task registry
    return false;
  }

  private calculateDuration(start: Date, end: Date): string {
    const ms = end.getTime() - start.getTime();
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
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
      assignedTo: this.assignedTo,
      priority: this.priority,
      estimatedTime: this.estimatedTime,
      actualTime: this.actualTime,
      dependencies: this.dependencies,
      tags: this.tags,
      metadata: this.metadata,
      result: this.result,
      error: this.error,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      startedAt: this.startedAt?.toISOString(),
      completedAt: this.completedAt?.toISOString(),
    };
  }

  /**
   * Deserialize from JSON
   */
  static fromJSON(data: Record<string, unknown>): Task {
    const task = new Task({
      id: data.id as string,
      title: data.title as string,
      description: data.description as string,
      assignedTo: data.assignedTo as string | undefined,
      priority: data.priority as "low" | "medium" | "high",
      estimatedTime: data.estimatedTime as string | undefined,
      dependencies: data.dependencies as TaskDependency[],
      tags: data.tags as string[],
      metadata: data.metadata as Record<string, unknown>,
    });

    task.status = data.status as TaskStatus;
    task.actualTime = data.actualTime as string | undefined;
    task.result = data.result;
    task.error = data.error as string | undefined;

    (task as { createdAt: Date }).createdAt = new Date(data.createdAt as string);
    task.updatedAt = new Date(data.updatedAt as string);

    if (data.startedAt) {
      task.startedAt = new Date(data.startedAt as string);
    }
    if (data.completedAt) {
      task.completedAt = new Date(data.completedAt as string);
    }

    return task;
  }
}
