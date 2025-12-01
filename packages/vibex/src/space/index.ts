/**
 * Space - The top-level container for VibeX work (formerly Space)
 *
 * A Space represents a project context that contains multiple tasks.
 * Each space is managed by an XAgent that serves as its orchestrator.
 *
 * Key concepts:
 * - Space: Project container with shared configuration
 * - Task: Individual conversation threads within a space
 * - Each task has its own conversation history and artifacts
 */

import { Plan } from "./plan";
import { Task, TaskStatus } from "./task";
import { XAgent } from "../runtime/x";
import { getServerResourceAdapter } from "./factory";
import { SpaceConfig, AgentConfig } from "../config";
import { Agent } from "../runtime/agent";
import { XMessage } from "../types/message";
import type { SpaceType, PlanType } from "@vibex/core";
import {
  AgentCollaborationManager,
  ParallelExecutionEngine,
  CollaborativePlanner,
} from "./collaboration";
import { getDefaultAgentIds, loadDefaultAgents } from "@vibex/defaults";
import { createAgentFromConfig } from "../runtime/factory";

// Re-export for convenience
export type { SpaceType, PlanType };

// Re-export manager helpers so consumers can import from "vibex/space"
export type { SpaceManager } from "./manager";
export { getSpaceManager, getSpaceManagerServer } from "./manager";

// Space state for getState() method
export interface SpaceState {
  spaceId: string;
  name: string;
  goal: string;
  createdAt: string;
  updatedAt: string;
  teamSize: number;
  tasks?: {
    total: number;
    completed: number;
    running: number;
    pending: number;
    failed: number;
  };
  progressPercentage?: number;
}

// Task within a space
export interface SpaceTask {
  id: string;
  spaceId: string;
  title: string;
  history: XMessage[];
  artifactIds: string[];
  status: "active" | "completed" | "archived";
  createdAt: Date;
  updatedAt: Date;
}

export class Space {
  public spaceId: string;
  public userId?: string; // User ID of space owner
  public config: SpaceConfig;
  public history: XMessage[]; // Legacy: primary task history
  public tasks: Map<string, SpaceTask>; // NEW: Multiple tasks
  public agents: Map<string, Agent>;
  public goal: string;
  public name: string;
  public xAgent?: XAgent;
  public createdAt: Date;
  public updatedAt: Date;
  public plan?: Plan;
  public artifacts?: any[];
  public collaborationManager?: AgentCollaborationManager;
  public parallelEngine?: ParallelExecutionEngine;
  public collaborativePlanner?: CollaborativePlanner;

  constructor({
    spaceId,
    userId,
    config,
    history,
    agents,
    goal,
    name,
    xAgent,
  }: {
    spaceId: string;
    userId?: string;
    config: SpaceConfig;
    history: XMessage[];
    agents: Map<string, Agent>;
    goal: string;
    name?: string;
    xAgent?: XAgent;
  }) {
    this.spaceId = spaceId;
    this.userId = userId;
    this.config = config;
    this.history = history; // Legacy: default task history
    this.tasks = new Map(); // NEW: Task storage
    this.agents = agents;
    this.goal = goal;
    this.name = name || `Space ${spaceId}`;
    this.xAgent = xAgent;
    this.createdAt = new Date();
    this.updatedAt = new Date();

    // Initialize collaboration components
    this.collaborationManager = new AgentCollaborationManager(this);
    this.parallelEngine = new ParallelExecutionEngine(this);
    this.collaborativePlanner = new CollaborativePlanner(
      this,
      this.collaborationManager
    );
  }

  /**
   * Get or create a task within this space
   */
  getOrCreateTask(taskId: string, title?: string): SpaceTask {
    if (!this.tasks.has(taskId)) {
      const task: SpaceTask = {
        id: taskId,
        spaceId: this.spaceId,
        title: title || `Task ${taskId}`,
        history: [],
        artifactIds: [],
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.tasks.set(taskId, task);
      console.log(`[Space] Created task ${taskId} in space ${this.spaceId}`);
    }
    return this.tasks.get(taskId)!;
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): SpaceTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks in this space
   */
  getAllTasks(): SpaceTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Update space task status (for conversation tasks, not Plan tasks)
   */
  updateSpaceTaskStatus(
    taskId: string,
    status: "active" | "completed" | "archived"
  ): boolean {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = status;
      task.updatedAt = new Date();
      return true;
    }
    return false;
  }

  getAgent(name: string): Agent | undefined {
    return this.agents.get(name);
  }

  registerAgent(name: string, agent: Agent): void {
    this.agents.set(name, agent);
    console.log(`[Space] Registered agent: ${name} - ${agent.description}`);
  }

  complete(): void {
    console.log(`Space ${this.spaceId} completed`);
  }

  getContext(): Record<string, any> {
    const context: Record<string, any> = {
      spaceId: this.spaceId,
      goal: this.goal,
      agents: Array.from(this.agents.keys()),
      historyLength: this.history.length,
      createdAt: this.createdAt.toISOString(),
    };

    if (this.plan) {
      context.plan = {
        goal: this.goal,
        totalTasks: this.plan.tasks.length,
        progress: this.plan.getProgressSummary(),
      };
    }

    return context;
  }

  async createPlan(plan: Plan): Promise<void> {
    this.plan = plan;
    await this.persistState();
    console.log(
      `Created plan for space ${this.spaceId} with ${plan.tasks.length} tasks`
    );
  }

  async updatePlan(plan: Plan): Promise<void> {
    this.plan = plan;
    this.updatedAt = new Date();
    await this.persistState();
    console.log(`Updated plan for space ${this.spaceId}`);
  }

  async setName(name: string): Promise<void> {
    this.name = name;
    this.updatedAt = new Date();
    await this.persistState();
    console.log(`Updated space ${this.spaceId} name to: ${name}`);
  }

  async getNextTask(): Promise<Task | undefined> {
    if (!this.plan) {
      return undefined;
    }
    return this.plan.getNextActionableTask();
  }

  async getParallelTasks(maxTasks: number = 3): Promise<Task[]> {
    if (!this.plan) {
      return [];
    }
    return this.plan.getAllActionableTasks(maxTasks);
  }

  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<boolean> {
    if (!this.plan) {
      return false;
    }

    const success = this.plan.updateTaskStatus(taskId, status);
    if (success) {
      this.updatedAt = new Date();
      await this.persistState();
      console.log(`Updated task ${taskId} status to ${status}`);
    }

    return success;
  }

  async assignTask(taskId: string, agentName: string): Promise<boolean> {
    if (!this.plan) {
      return false;
    }

    const task = this.plan.getTaskById(taskId);
    if (!task) {
      return false;
    }

    if (!this.agents.has(agentName)) {
      console.error(`Agent '${agentName}' not found in space team`);
      return false;
    }

    task.assignedTo = agentName;
    this.updatedAt = new Date();
    await this.persistState();
    console.log(`Assigned task ${taskId} to agent ${agentName}`);
    return true;
  }

  isPlanComplete(): boolean {
    if (!this.plan) {
      return false;
    }
    return this.plan.isComplete();
  }

  hasFailedTasks(): boolean {
    if (!this.plan) {
      return false;
    }
    return this.plan.hasFailedTasks();
  }

  async persistState(): Promise<void> {
    try {
      const adapter = await getServerResourceAdapter();
      // Test if adapter actually works (ensureInitialized is a LocalResourceAdapter method)
      if (
        "ensureInitialized" in adapter &&
        typeof adapter.ensureInitialized === "function"
      ) {
        await adapter.ensureInitialized();
      }

      await adapter.saveSpace({
        id: this.spaceId,
        name: this.name,
        description: this.goal,
        goal: this.goal,
        userId: this.userId,
        config: this.config,
        createdAt: this.createdAt.toISOString(),
        updatedAt: this.updatedAt.toISOString(),
      } as any);

      if (this.plan) {
        await adapter.savePlan({
          spaceId: this.spaceId,
          plan: this.plan.toJSON(),
          status: this.plan.isComplete() ? "completed" : "active",
          summary: this.plan.getProgressSummary(),
        });
      } else {
        await adapter.deletePlan(this.spaceId);
      }
      console.log("[Space] State persisted via ResourceAdapter");
    } catch (e) {
      // Database unavailable - this is non-critical, space works in memory
      console.warn(
        `[Space] Failed to persist state (non-critical, working in-memory):`,
        e instanceof Error ? e.message : String(e)
      );
    }
  }

  async loadState(): Promise<boolean> {
    try {
      const adapter = await getServerResourceAdapter();
      // Test if adapter actually works (ensureInitialized is a LocalResourceAdapter method)
      if (
        "ensureInitialized" in adapter &&
        typeof adapter.ensureInitialized === "function"
      ) {
        await adapter.ensureInitialized();
      }

      const spaceData = await adapter.getSpace(this.spaceId);
      const planData = await adapter.getPlan(this.spaceId);

      if (spaceData) {
        this.name = spaceData.name;
        this.goal =
          (spaceData as any).goal || spaceData.description || this.goal;
        if (spaceData.config) {
          this.config = {
            ...(this.config || {}),
            ...(spaceData.config as Record<string, unknown>),
          };
        }

        if (planData?.plan) {
          try {
            this.plan = Plan.fromJSON(planData.plan as Record<string, unknown>);
          } catch (error) {
            console.warn(
              "[Space] Failed to load plan from persisted state:",
              error
            );
            this.plan = undefined;
          }
        } else {
          this.plan = undefined;
        }
        return true;
      }
    } catch (error) {
      console.error("Failed to load space state:", error);
    }
    return false;
  }

  async loadPlan(): Promise<Plan | undefined> {
    if (await this.loadState()) {
      return this.plan;
    }
    return undefined;
  }

  getState(): SpaceState {
    const state: SpaceState = {
      spaceId: this.spaceId,
      name: this.name,
      goal: this.goal,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      teamSize: this.agents.size,
    };

    if (this.plan) {
      const taskStats = {
        total: this.plan.tasks.length,
        completed: this.plan.tasks.filter(
          (t) => t.status === TaskStatus.COMPLETED
        ).length,
        running: this.plan.tasks.filter((t) => t.status === TaskStatus.RUNNING)
          .length,
        pending: this.plan.tasks.filter((t) => t.status === TaskStatus.PENDING)
          .length,
        failed: this.plan.tasks.filter((t) => t.status === TaskStatus.FAILED)
          .length,
      };
      state.tasks = taskStats;
      state.progressPercentage =
        taskStats.total > 0 ? (taskStats.completed / taskStats.total) * 100 : 0;
    }

    return state;
  }
}

/**
 * Start a new space
 */
export async function startSpace({
  goal,
  spaceId,
  userId,
  name,
  model,
}: {
  goal: string;
  spaceId?: string;
  userId?: string;
  name?: string;
  model?: string;
}): Promise<Space> {
  const id = spaceId || `proj_${Date.now().toString(36)}`;

  // Create minimal space config
  const spaceConfig: SpaceConfig = {
    name:
      name ||
      (goal && typeof goal === "string" ? goal.slice(0, 50) : "New Space"),
    autoSave: true,
    checkpointInterval: 300,
  };

  console.log(`[Space] Creating space - agents will be loaded on demand`);

  // Create agents map - empty initially, agents loaded on demand
  const agents = new Map<string, Agent>();

  console.log(`[Space] Space initialized (agents loaded on demand)`);

  const history: XMessage[] = [];

  // Create the space
  const space = new Space({
    spaceId: id,
    userId,
    config: spaceConfig,
    history,
    agents,
    goal,
    name: name || spaceConfig.name,
  });

  // Create XAgent for the space
  const xAgentConfig: AgentConfig = {
    name: "X",
    description: "I manage this space and coordinate all work.",
    provider: "openrouter",
    model: model || "openai/gpt-4o",
    temperature: 0.7,
    promptFile: "", // XAgent doesn't use prompt files
  };

  const xAgent = new XAgent(xAgentConfig, space, {
    model,
    spaceId: id,
  });
  space.xAgent = xAgent;

  // Initialize default agents for multi-agent collaboration
  await initializeDefaultAgents(space, model);

  // MCP tools are now loaded on-demand by agents, not pre-loaded
  // This avoids the need for a central tool registry

  // Save initial state
  await space.persistState();

  return space;
}

/**
 * Initialize default agents for multi-agent collaboration
 */
async function initializeDefaultAgents(
  space: Space,
  model?: string
): Promise<void> {
  try {
    // Load default agents from @vibex/defaults package

    // Get default agent IDs and load their configurations
    const agentIds = getDefaultAgentIds();
    const agentConfigs = loadDefaultAgents(agentIds);

    // Create agent instances from loaded configs
    const defaultAgents = agentConfigs.map(
      (config: {
        id: string;
        name: string;
        description: string;
        provider: string;
        model: string;
        systemPrompt?: string;
        tools: string[];
        temperature?: number;
        maxOutputTokens?: number;
      }) =>
        createAgentFromConfig(config, {
          // Override model if provided, otherwise use config's model
          model: model
            ? model.includes(":")
              ? model
              : `${config.provider}:${model}`
            : undefined,
        })
    );

    // Try to get adapter, but don't fail if database is unavailable
    // The adapter might be created but fail when actually used (e.g., better-sqlite3 native module issue)
    let adapter: any = null;
    let adapterAvailable = false;
    try {
      adapter = await getServerResourceAdapter();
      // Test if adapter actually works by trying to use it
      // This will fail if better-sqlite3 can't be loaded
      await adapter.ensureInitialized?.();
      adapterAvailable = true;
    } catch (e) {
      // Database unavailable (e.g., better-sqlite3 native module issue in Next.js)
      // This is non-critical - agents will work in memory
      console.warn(
        `[Space] Database unavailable, agents will be in-memory only:`,
        e instanceof Error ? e.message : String(e)
      );
      adapter = null;
      adapterAvailable = false;
    }

    for (const agentInstance of defaultAgents) {
      const agentConfig = agentInstance.toAgentConfig();

      // Always use config values (English) - never use database values
      // The config is the source of truth
      const agentId = agentConfig.id || agentConfig.name;
      const agentName = agentConfig.name;
      const agentDescription = agentConfig.description || "";

      // Register agent in resource adapter (persistent storage) if available
      // This will update any existing agents with old names to use the new English names
      if (adapter && adapterAvailable) {
        try {
          await adapter.saveAgent({
            id: agentId,
            name: agentName,
            description: agentDescription,
            systemPrompt: agentConfig.systemPrompt,
            tools: agentConfig.tools || [],
            llm:
              agentConfig.provider && agentConfig.model
                ? {
                    provider: agentConfig.provider,
                    model: agentConfig.model,
                    settings: {
                      temperature: agentConfig.temperature,
                      maxOutputTokens: agentConfig.maxOutputTokens,
                    },
                  }
                : undefined,
          });
          console.log(
            `[Space] Registered default agent: ${agentName} (id: ${agentId})`
          );
        } catch (e) {
          // Agent might already exist or database unavailable - that's okay
          console.warn(
            `[Space] Agent ${agentName} persistence failed (non-critical):`,
            e instanceof Error ? e.message : String(e)
          );
        }
      }

      // Always register in space's agent map for immediate use (in-memory)
      // Use config values, not database values
      const agent = new Agent(agentConfig);
      space.registerAgent(agentId, agent);
      console.log(`[Space] Registered ${agentName} (id: ${agentId}) in memory`);
    }

    console.log(
      `[Space] Total agents registered: ${space.agents.size}`,
      Array.from(space.agents.keys())
    );

    console.log(`[Space] Initialized ${defaultAgents.length} default agents`);
  } catch (error) {
    console.error("[Space] Failed to initialize default agents:", error);
    // Don't throw - space can still work without default agents
  }
}
