/**
 * Tool System for VibeX
 *
 * Coordinates between:
 * 1. Orchestration tools (built-in to vibex - required for agent coordination)
 * 2. Custom tools from @vibex/tools (file, search, web, MCP servers)
 *
 * Orchestration tools are special and always available - without them,
 * agent assignment and task delegation won't work.
 */

import type { SpaceType } from "@vibex/core";
import { z } from "zod/v3";
import {
  buildToolMap as buildExternalToolMap,
  buildToolMapAsync as buildExternalToolMapAsync,
  setStorageProvider,
  clearMcpClients,
} from "@vibex/tools";
import { getSpaceStorage } from "../space/storage";
import { getSpaceManager } from "../space/manager";

// Core tool interface that AI SDK expects
export interface CoreTool {
  description: string;
  inputSchema: z.ZodSchema | any;
  execute: (args: any, context?: any) => Promise<any>;
}

type RuntimeTask = {
  id?: string;
  title?: string;
  description?: string;
  assignedTo?: string;
  complete?: () => void;
  fail?: (reason: string) => void;
  start?: () => void;
};

type RuntimePlan = {
  id?: string;
  goal?: string;
  tasks?: RuntimeTask[];
  addTask?: (task: {
    title: string;
    description: string;
    assignedTo?: string;
    dependencies?: Array<{ taskId: string }>;
  }) => RuntimeTask;
  getTaskById?: (taskId: string) => RuntimeTask | undefined;
};

type RuntimeAgent = {
  name?: string;
  description?: string;
  tools?: string[];
  generateText?: (options: any) => Promise<any>;
};

type RuntimeSpace = SpaceType & {
  createPlan?: (
    goal: string,
    tasks: Array<{
      title: string;
      description: string;
      assignedTo?: string;
      dependencies?: string[];
    }>
  ) => Promise<RuntimePlan>;
  plan?: RuntimePlan;
  assignTask?: (taskId: string, agentId: string) => Promise<boolean>;
  getAgent?: (agentId: string) => RuntimeAgent | undefined;
  agents?: Map<string, RuntimeAgent> | RuntimeAgent[] | string[];
};

async function loadRuntimeSpace(
  spaceId?: string
): Promise<RuntimeSpace | null> {
  if (!spaceId) {
    return null;
  }

  try {
    const space = await getSpaceManager().getSpace(spaceId);
    return (space as RuntimeSpace) || null;
  } catch (error) {
    console.error(`[Tools] Failed to load space ${spaceId}:`, error);
    return null;
  }
}

function missingCapabilityResponse(feature: string) {
  return {
    success: false,
    error: `${feature} is unavailable in the current runtime environment.`,
  };
}

function formatAgentList(agents: RuntimeSpace["agents"]) {
  if (!agents) {
    return [];
  }

  if (agents instanceof Map) {
    const agentMap = agents as Map<string, RuntimeAgent>;
    return Array.from(agentMap.entries()).map(([id, agent]) => ({
      id,
      name: agent?.name || id,
      description: agent?.description || "",
      tools: agent?.tools || [],
    }));
  }

  if (Array.isArray(agents)) {
    return agents
      .map((agent: string | RuntimeAgent) => {
        if (typeof agent === "string") {
          return {
            id: agent,
            name: agent,
            description: "",
            tools: [] as string[],
          };
        }
        const agentObj = agent as RuntimeAgent;
        return {
          id: agentObj?.name || "unknown",
          name: agentObj?.name || "Unknown Agent",
          description: agentObj?.description || "",
          tools: agentObj?.tools || [],
        };
      })
      .filter((agent) => Boolean(agent.id));
  }

  return [];
}

// ============================================================================
// Orchestration Tools (Core to VibeX)
// ============================================================================

/**
 * Create a plan for accomplishing a goal
 */
const planCreateTool: CoreTool = {
  description:
    "Create a new plan with tasks to accomplish a goal. Each task can be assigned to a specialized agent.",
  inputSchema: z.object({
    goal: z.string().describe("The overall goal to accomplish"),
    tasks: z
      .array(
        z.object({
          title: z.string().describe("Short title for the task"),
          description: z
            .string()
            .describe("Detailed description of what needs to be done"),
          assignedTo: z
            .string()
            .optional()
            .describe("Agent ID to assign this task to"),
          dependencies: z
            .array(z.string())
            .optional()
            .describe("IDs of tasks that must complete before this one"),
        })
      )
      .describe("List of tasks that make up the plan"),
  }),
  execute: async (args, context) => {
    const space = await loadRuntimeSpace(context?.spaceId);

    if (!space || typeof space.createPlan !== "function") {
      return missingCapabilityResponse("Plan creation");
    }

    const plan = await space.createPlan(args.goal, args.tasks);
    const tasks = Array.isArray(plan?.tasks) ? plan.tasks : [];

    return {
      success: true,
      planId: plan?.id,
      goal: plan?.goal ?? args.goal,
      taskCount: tasks.length,
      message: `Created plan "${args.goal}" with ${tasks.length} tasks`,
    };
  },
};

/**
 * Update an existing plan
 */
const planUpdateTool: CoreTool = {
  description:
    "Update an existing plan by adding, modifying, or removing tasks.",
  inputSchema: z.object({
    planId: z
      .string()
      .optional()
      .describe("Plan ID to update (uses current plan if not specified)"),
    action: z
      .enum(["add_task", "update_task", "remove_task", "update_goal"])
      .describe("The type of update to perform"),
    taskId: z
      .string()
      .optional()
      .describe("Task ID for update/remove operations"),
    task: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
        assignedTo: z.string().optional(),
        dependencies: z.array(z.string()).optional(),
        status: z
          .enum(["pending", "in_progress", "completed", "failed"])
          .optional(),
      })
      .optional()
      .describe("Task data for add/update operations"),
    goal: z.string().optional().describe("New goal for update_goal action"),
  }),
  execute: async (args, context) => {
    const space = await loadRuntimeSpace(context?.spaceId);
    const plan = space?.plan;

    if (!space || !plan) {
      return missingCapabilityResponse("Plan management");
    }

    switch (args.action) {
      case "add_task": {
        if (!args.task) {
          return { success: false, error: "Task data required for add_task" };
        }
        if (typeof plan.addTask !== "function") {
          return missingCapabilityResponse("Plan task creation");
        }
        const newTask = plan.addTask({
          title: args.task.title || "Untitled Task",
          description: args.task.description || "",
          assignedTo: args.task.assignedTo,
          dependencies:
            args.task.dependencies?.map((depId: string) => ({
              taskId: depId,
            })) || [],
        });
        return {
          success: true,
          taskId: newTask?.id,
          message: `Added task: ${newTask?.title ?? "Untitled Task"}`,
        };
      }

      case "update_task": {
        if (!args.taskId) {
          return { success: false, error: "Task ID required for update_task" };
        }
        if (typeof plan.getTaskById !== "function") {
          return missingCapabilityResponse("Plan task lookup");
        }
        const task = plan.getTaskById(args.taskId);
        if (!task) {
          return { success: false, error: `Task not found: ${args.taskId}` };
        }
        if (args.task?.title) task.title = args.task.title;
        if (args.task?.description) task.description = args.task.description;
        if (args.task?.assignedTo) task.assignedTo = args.task.assignedTo;
        if (args.task?.status) {
          if (args.task.status === "completed") task.complete?.();
          else if (args.task.status === "failed")
            task.fail?.("Manual status update");
          else if (args.task.status === "in_progress") task.start?.();
        }
        return {
          success: true,
          message: `Updated task: ${task.title || args.taskId}`,
        };
      }

      case "remove_task":
        if (!args.taskId) {
          return { success: false, error: "Task ID required for remove_task" };
        }
        return { success: false, error: "remove_task not yet implemented" };

      case "update_goal":
        if (!args.goal) {
          return { success: false, error: "Goal required for update_goal" };
        }
        plan.goal = args.goal;
        return { success: true, message: `Updated plan goal to: ${args.goal}` };

      default:
        return { success: false, error: `Unknown action: ${args.action}` };
    }
  },
};

/**
 * Assign a task to an agent
 */
const taskAssignTool: CoreTool = {
  description: "Assign a task to a specific agent for execution.",
  inputSchema: z.object({
    taskId: z.string().describe("The task ID to assign"),
    agentId: z.string().describe("The agent ID to assign the task to"),
  }),
  execute: async (args, context) => {
    const space = await loadRuntimeSpace(context?.spaceId);

    if (!space || typeof space.assignTask !== "function") {
      return missingCapabilityResponse("Task assignment");
    }

    const success = await space.assignTask(args.taskId, args.agentId);

    if (success) {
      return {
        success: true,
        message: `Assigned task ${args.taskId} to agent ${args.agentId}`,
      };
    }

    return {
      success: false,
      error: `Failed to assign task ${args.taskId} to agent ${args.agentId}`,
    };
  },
};

/**
 * Delegate work to another agent
 */
const agentDelegateTool: CoreTool = {
  description:
    "Delegate a specific task or request to another agent. The agent will execute the task and return results.",
  inputSchema: z.object({
    agentId: z.string().describe("The agent ID to delegate to"),
    task: z.string().describe("Description of the task to delegate"),
    context: z.string().optional().describe("Additional context for the agent"),
    waitForResult: z
      .boolean()
      .optional()
      .default(true)
      .describe("Whether to wait for the agent to complete"),
  }),
  execute: async (args, context) => {
    const space = await loadRuntimeSpace(context?.spaceId);

    if (!space || typeof space.getAgent !== "function") {
      return missingCapabilityResponse("Agent delegation");
    }

    const agent = space.getAgent(args.agentId);
    if (!agent || typeof agent.generateText !== "function") {
      const availableAgents = formatAgentList(space.agents).map((a) => a.id);
      const availableList =
        availableAgents.length > 0 ? availableAgents.join(", ") : "none";
      return {
        success: false,
        error: `Agent '${args.agentId}' not found. Available agents: ${availableList}`,
      };
    }

    const prompt = args.context
      ? `Context: ${args.context}\n\nTask: ${args.task}`
      : args.task;

    if (!args.waitForResult) {
      agent
        .generateText({
          messages: [{ role: "user", content: prompt }],
          spaceId: context?.spaceId,
        })
        .catch((error: Error) => {
          console.error(`[Delegate] Agent ${args.agentId} failed:`, error);
        });

      return {
        success: true,
        message: `Delegated task to ${args.agentId} (async)`,
        agentId: args.agentId,
      };
    }

    try {
      const result = await agent.generateText({
        messages: [{ role: "user", content: prompt }],
        spaceId: context?.spaceId,
      });

      return {
        success: true,
        agentId: args.agentId,
        result: result?.text,
        toolCalls: result?.toolCalls,
      };
    } catch (error) {
      return {
        success: false,
        error: `Agent ${args.agentId} failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  },
};

/**
 * List available agents in the space
 */
const agentListTool: CoreTool = {
  description:
    "List all available agents in the current space with their capabilities.",
  inputSchema: z.object({}),
  execute: async (_args, context) => {
    const space = await loadRuntimeSpace(context?.spaceId);
    const agents = formatAgentList(space?.agents);

    if (agents.length > 0) {
      return {
        success: true,
        agents,
        count: agents.length,
      };
    }

    try {
      const storedAgents = await getSpaceManager().getAgents();
      const mapped = storedAgents.map((agent) => ({
        id: agent.id || agent.name,
        name: agent.name,
        description: agent.description || "",
        tools: agent.tools || [],
      }));

      return {
        success: true,
        agents: mapped,
        count: mapped.length,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to list agents for this space",
      };
    }
  },
};

// Map of orchestration tool IDs to their implementations
const orchestrationTools: Record<string, CoreTool> = {
  plan_create: planCreateTool,
  plan_update: planUpdateTool,
  task_assign: taskAssignTool,
  agent_delegate: agentDelegateTool,
  agent_list: agentListTool,
};

// ============================================================================
// Tool Loading
// ============================================================================

// Flag to track if storage provider has been initialized
let storageProviderInitialized = false;

/**
 * Initialize the storage provider for @vibex/tools
 * This connects the tools package to vibex's storage system
 */
function ensureStorageProvider(): void {
  if (storageProviderInitialized) return;

  setStorageProvider(async (spaceId: string) => {
    const storage = await getSpaceStorage(spaceId);
    // Adapt BaseStorage to ToolStorage interface
    return {
      readFile: (path: string) => storage.readFile(path),
      writeFile: (path: string, data: Buffer | string) =>
        storage.writeFile(path, data),
      exists: (path: string) => storage.exists(path),
      list: (path: string) => storage.list(path),
      delete: (path: string) => storage.delete(path),
      stat: storage.stat ? (path: string) => storage.stat!(path) : undefined,
    };
  });

  storageProviderInitialized = true;
}

/**
 * Build a tool map for streamText from an array of tool IDs
 * Handles both orchestration tools (built-in) and custom tools (@vibex/tools)
 */
export async function buildToolMap(
  toolIds: string[],
  context?: { spaceId?: string }
): Promise<Record<string, CoreTool>> {
  // Ensure storage provider is set up
  ensureStorageProvider();

  const tools: Record<string, CoreTool> = {};

  // Separate orchestration tools from other tools
  const orchestrationToolIds: string[] = [];
  const externalToolIds: string[] = [];

  for (const id of toolIds) {
    if (id in orchestrationTools) {
      orchestrationToolIds.push(id);
    } else {
      externalToolIds.push(id);
    }
  }

  // Add orchestration tools
  for (const id of orchestrationToolIds) {
    tools[id] = orchestrationTools[id];
  }

  // Load external tools from @vibex/tools
  if (externalToolIds.length > 0) {
    console.log(
      `[Tools] Loading ${externalToolIds.length} external tools:`,
      externalToolIds
    );
    try {
      // Try async version first (supports MCP)
      if (buildExternalToolMapAsync) {
        console.log(`[Tools] Using buildExternalToolMapAsync`);
        const externalTools = await buildExternalToolMapAsync(
          externalToolIds,
          context
        );
        console.log(
          `[Tools] Loaded external tools:`,
          Object.keys(externalTools || {})
        );
        Object.assign(tools, externalTools);
      } else if (buildExternalToolMap) {
        console.log(`[Tools] Using buildExternalToolMap (sync)`);
        const externalTools = buildExternalToolMap(externalToolIds, context);
        console.log(
          `[Tools] Loaded external tools:`,
          Object.keys(externalTools || {})
        );
        Object.assign(tools, externalTools);
      } else {
        console.warn(`[Tools] No external tool loader available!`);
      }
    } catch (error) {
      console.error(`[Tools] Failed to load tools from @vibex/tools:`, error);
    }
  } else {
    console.log(
      `[Tools] No external tools to load (orchestration only:`,
      Object.keys(tools),
      `)`
    );
  }

  console.log(`[Tools] Final tool map:`, Object.keys(tools));
  return tools;
}

/**
 * Get all orchestration tool IDs
 */
export function getOrchestrationToolIds(): string[] {
  return Object.keys(orchestrationTools);
}

/**
 * Check if a tool ID is an orchestration tool
 */
export function isOrchestrationTool(toolId: string): boolean {
  return toolId in orchestrationTools;
}

/**
 * Clear any cached tool state (useful for testing)
 */
export function clearToolCache(): void {
  // Clear MCP client cache
  clearMcpClients();
  // Reset storage provider initialization flag
  storageProviderInitialized = false;
}
