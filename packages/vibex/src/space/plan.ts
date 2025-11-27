/**
 * Plan - Strategy for achieving a Mission
 *
 * A Plan contains the breakdown of Tasks needed to complete a Mission.
 * Plans can evolve as the Mission progresses - tasks can be added,
 * removed, or reordered based on user feedback and agent discoveries.
 *
 * Hierarchy:
 *   Space (persistent container)
 *     └── Mission (user's intent)
 *           └── Plan (strategy) <-- This file
 *                 └── Task[] (individual work items)
 */

import { Task, TaskStatus, TaskConfig } from "./task";

export interface PlanSummary {
  totalTasks: number;
  completedTasks: number;
  runningTasks: number;
  pendingTasks: number;
  failedTasks: number;
  blockedTasks: number;
  progressPercentage: number;
}

export interface PlanConfig {
  goal: string;
  tasks?: Task[];
  metadata?: Record<string, unknown>;
}

export class Plan {
  public goal: string;
  public tasks: Task[];
  public metadata: Record<string, unknown>;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(config: PlanConfig) {
    this.goal = config.goal;
    this.tasks = config.tasks || [];
    this.metadata = config.metadata || {};
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Add a task to the plan
   */
  addTask(task: Task): void {
    this.tasks.push(task);
    this.updatedAt = new Date();
  }

  /**
   * Create and add a new task
   */
  createTask(config: TaskConfig): Task {
    const task = new Task(config);
    this.addTask(task);
    return task;
  }

  /**
   * Remove a task from the plan
   */
  removeTask(taskId: string): boolean {
    const index = this.tasks.findIndex((t) => t.id === taskId);
    if (index >= 0) {
      this.tasks.splice(index, 1);
      this.updatedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Get task by ID
   */
  getTaskById(taskId: string): Task | undefined {
    return this.tasks.find((t) => t.id === taskId);
  }

  /**
   * Update a task's status
   */
  updateTaskStatus(taskId: string, status: TaskStatus): boolean {
    const task = this.getTaskById(taskId);
    if (task) {
      task.status = status;
      task.updatedAt = new Date();
      this.updatedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Get the next task that can be started
   */
  getNextActionableTask(): Task | undefined {
    return this.tasks.find((task) => task.isActionable());
  }

  /**
   * Get all tasks that can be started (for parallel execution)
   */
  getAllActionableTasks(maxTasks?: number): Task[] {
    const actionableTasks = this.tasks.filter((task) => task.isActionable());
    return maxTasks ? actionableTasks.slice(0, maxTasks) : actionableTasks;
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: TaskStatus): Task[] {
    return this.tasks.filter((task) => task.status === status);
  }

  /**
   * Get tasks assigned to a specific agent
   */
  getTasksByAssignee(assignee: string): Task[] {
    return this.tasks.filter((task) => task.assignedTo === assignee);
  }

  /**
   * Check if all tasks are complete
   */
  isComplete(): boolean {
    return (
      this.tasks.length > 0 &&
      this.tasks.every(
        (task) =>
          task.status === TaskStatus.COMPLETED ||
          task.status === TaskStatus.CANCELLED
      )
    );
  }

  /**
   * Check if any tasks have failed
   */
  hasFailedTasks(): boolean {
    return this.tasks.some((task) => task.status === TaskStatus.FAILED);
  }

  /**
   * Check if any tasks are blocked
   */
  hasBlockedTasks(): boolean {
    return this.tasks.some((task) => task.status === TaskStatus.BLOCKED);
  }

  /**
   * Get a summary of plan progress
   */
  getProgressSummary(): PlanSummary {
    const summary: PlanSummary = {
      totalTasks: this.tasks.length,
      completedTasks: 0,
      runningTasks: 0,
      pendingTasks: 0,
      failedTasks: 0,
      blockedTasks: 0,
      progressPercentage: 0,
    };

    for (const task of this.tasks) {
      switch (task.status) {
        case TaskStatus.COMPLETED:
          summary.completedTasks++;
          break;
        case TaskStatus.RUNNING:
          summary.runningTasks++;
          break;
        case TaskStatus.PENDING:
          summary.pendingTasks++;
          break;
        case TaskStatus.FAILED:
          summary.failedTasks++;
          break;
        case TaskStatus.BLOCKED:
          summary.blockedTasks++;
          break;
      }
    }

    if (summary.totalTasks > 0) {
      summary.progressPercentage = Math.round(
        (summary.completedTasks / summary.totalTasks) * 100
      );
    }

    return summary;
  }

  /**
   * Reorder tasks in the plan
   */
  reorderTasks(fromIndex: number, toIndex: number): void {
    if (
      fromIndex < 0 ||
      fromIndex >= this.tasks.length ||
      toIndex < 0 ||
      toIndex >= this.tasks.length
    ) {
      throw new Error("Invalid task indices");
    }

    const [task] = this.tasks.splice(fromIndex, 1);
    this.tasks.splice(toIndex, 0, task);
    this.updatedAt = new Date();
  }

  /**
   * Serialize to JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      goal: this.goal,
      tasks: this.tasks.map((task) => task.toJSON()),
      metadata: this.metadata,
      progress: this.getProgressSummary(),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  /**
   * Deserialize from JSON
   */
  static fromJSON(data: Record<string, unknown>): Plan {
    const tasksData = data.tasks as Record<string, unknown>[];
    const plan = new Plan({
      goal: data.goal as string,
      tasks: tasksData.map((taskData) => Task.fromJSON(taskData)),
      metadata: data.metadata as Record<string, unknown>,
    });

    (plan as { createdAt: Date }).createdAt = new Date(
      data.createdAt as string
    );
    plan.updatedAt = new Date(data.updatedAt as string);

    return plan;
  }
}
