/**
 * Orchestrator - Plan-based multi-agent execution
 *
 * X uses this to:
 * 1. Create plans with tasks for complex requests
 * 2. Delegate tasks to worker agents
 * 3. Stream delegation events
 * 4. Collect results via artifacts
 */

import { Agent } from "./agent";
import { Plan } from "../space/plan";
import { Task, TaskStatus } from "../space/task";
import { Space } from "../space";
import { generateObject } from "ai";
import type { LanguageModel } from "ai";
import { z } from "zod/v3";
import type { XMessage } from "../space/message";

export interface DelegationEvent {
  type: "delegation";
  taskId: string;
  taskTitle: string;
  agentId: string;
  agentName: string;
  status: "started" | "completed" | "failed";
  result?: string;
  artifactId?: string;
  error?: string;
  toolCalls?: Array<{
    toolCallId?: string;
    name: string;
    args: unknown;
    result?: unknown;
  }>;
  timestamp: number;
}

export interface OrchestrationResult {
  plan: Plan;
  events: DelegationEvent[];
  artifacts: string[]; // Artifact IDs created
  finalResponse: string;
}

/**
 * Analyze a request and determine if it needs multi-agent orchestration
 */
export async function analyzeRequest(
  model: LanguageModel,
  userMessage: string,
  availableAgents: Array<{ id: string; name: string; description: string }>
): Promise<{
  needsPlan: boolean;
  reasoning: string;
  suggestedTasks: Array<{
    title: string;
    description: string;
    assignedTo: string;
    dependencies: string[];
  }>;
}> {
  const agentDescriptions = availableAgents
    .map((a) => `- ${a.id}: ${a.name} - ${a.description}`)
    .join("\n");

  // Note: All properties must be required for OpenAI JSON mode
  // suggestedTasks should be an empty array when needsPlan is false
  const schema = z.object({
    needsPlan: z
      .boolean()
      .describe(
        "Whether this request needs to be broken into multiple tasks for different agents"
      ),
    reasoning: z
      .string()
      .describe("Brief explanation of why plan is or isn't needed"),
    suggestedTasks: z
      .array(
        z.object({
          title: z.string().describe("Short task title"),
          description: z.string().describe("What this task should accomplish"),
          assignedTo: z.string().describe("Agent ID best suited for this task"),
          dependencies: z
            .array(z.string())
            .describe("Task titles that must complete before this one"),
        })
      )
      .describe("Tasks to create if needsPlan is true, empty array if needsPlan is false"),
  });

  console.log(
    "[Orchestrator] Analyzing request for multi-agent collaboration:",
    {
      userMessage: userMessage.slice(0, 100),
      availableAgents: availableAgents.map((a) => a.name),
      modelId: (model as any).modelId || "unknown",
    }
  );

  try {
    const result = await generateObject({
      model,
      schema,
      mode: "json",
      system: `You determine whether a user request would benefit from multi-agent collaboration.

Available specialized agents:
${agentDescriptions}

Multi-agent orchestration is valuable when:
- The request involves multiple distinct phases (research then writing, etc.)
- Different specialized skills are needed for different parts
- The task would naturally be divided among team members

When creating tasks:
- Use the EXACT agent ID from the list above (e.g., "researcher", "developer")
- Set dependencies so tasks execute in the right order (use task titles)
- Keep tasks focused and actionable
- If needsPlan is false, return suggestedTasks as an empty array []`,
      messages: [{ role: "user", content: userMessage }],
    });

    console.log("[Orchestrator] Analysis result:", {
      needsPlan: result.object.needsPlan,
      reasoning: result.object.reasoning,
      taskCount: result.object.suggestedTasks?.length || 0,
    });

    return result.object;
  } catch (error: any) {
    // Log detailed error information
    console.error("[Orchestrator] generateObject failed:", {
      errorName: error?.name,
      errorMessage: error?.message,
      errorCause: error?.cause?.message || error?.cause,
      responseBody: error?.responseBody,
      statusCode: error?.statusCode,
      fullError: error,
    });
    throw error;
  }
}

/**
 * Create a plan from analyzed tasks
 */
export function createPlanFromAnalysis(
  goal: string,
  tasks: Array<{
    title: string;
    description: string;
    assignedTo: string;
    dependencies: string[];
  }>
): Plan {
  // Create task objects
  const taskMap = new Map<string, Task>();

  for (let i = 0; i < tasks.length; i++) {
    const taskData = tasks[i];
    const task = new Task({
      id: `task_${i + 1}`,
      title: taskData.title,
      description: taskData.description,
      assignedTo: taskData.assignedTo,
      priority: "medium",
      dependencies: [], // Will be filled after all tasks created
    });
    taskMap.set(taskData.title, task);
  }

  // Resolve dependencies by title
  for (const taskData of tasks) {
    const task = taskMap.get(taskData.title);
    if (task && taskData.dependencies.length > 0) {
      task.dependencies = taskData.dependencies
        .map((depTitle) => {
          const depTask = taskMap.get(depTitle);
          return depTask
            ? { taskId: depTask.id, type: "required" as const }
            : null;
        })
        .filter((d): d is { taskId: string; type: "required" } => d !== null);
    }
  }

  return new Plan({
    goal,
    tasks: Array.from(taskMap.values()),
  });
}

/**
 * Execute a plan by delegating tasks to agents
 */
export async function executePlan(
  plan: Plan,
  space: Space,
  model: LanguageModel,
  onEvent: (event: DelegationEvent) => void
): Promise<{
  results: Map<string, string>;
  artifacts: string[];
}> {
  const results = new Map<string, string>();
  const artifacts: string[] = [];
  const completedTaskIds = new Set<string>();

  // Execute until all tasks are done
  while (!plan.isComplete()) {
    // Get all tasks that can run now (parallel execution)
    const actionableTasks = plan.tasks.filter((task) => {
      if (task.status !== TaskStatus.PENDING) return false;

      // Check if all required dependencies are complete
      for (const dep of task.dependencies) {
        if (dep.type === "required" && !completedTaskIds.has(dep.taskId)) {
          return false;
        }
      }
      return true;
    });

    if (actionableTasks.length === 0) {
      // No actionable tasks but plan not complete - might be blocked
      const pendingTasks = plan.getTasksByStatus(TaskStatus.PENDING);
      if (pendingTasks.length > 0) {
        console.warn("[Orchestrator] Plan blocked - no actionable tasks");
        break;
      }
      break;
    }

    // Execute actionable tasks in parallel
    const taskPromises = actionableTasks.map(async (task) => {
      return executeTask(task, space, model, results, onEvent);
    });

    const taskResults = await Promise.all(taskPromises);

    // Process results (events are already emitted by executeTask)
    for (const { task, result, artifactId, error } of taskResults) {
      if (error) {
        // Task already marked as failed in executeTask
        continue;
      } else {
        // Task already marked as completed in executeTask
        completedTaskIds.add(task.id);
        results.set(task.id, result || "");

        if (artifactId) {
          artifacts.push(artifactId);
        }
      }
    }
  }

  return { results, artifacts };
}

/**
 * Execute a single task by delegating to an agent
 */
async function executeTask(
  task: Task,
  space: Space,
  model: LanguageModel, // Model to use for agent execution
  previousResults: Map<string, string>,
  onEvent: (event: DelegationEvent) => void
): Promise<{
  task: Task;
  result?: string;
  artifactId?: string;
  error?: string;
}> {
  const agentId = task.assignedTo;
  if (!agentId) {
    return { task, error: "No agent assigned to task" };
  }

  // Emit delegation started event
  task.start();

  // Get agent name for better visibility
  let agentName = agentId;
  try {
    const agent = space.getAgent(agentId);
    if (agent) {
      agentName = agent.name || agentId;
    }
  } catch (e) {
    // Agent not found yet, will be loaded below
  }

  onEvent({
    type: "delegation",
    taskId: task.id,
    taskTitle: task.title,
    agentId,
    agentName,
    status: "started",
    timestamp: Date.now(),
  });

  // Get the agent by ID first
  let agent = space.getAgent(agentId);
  if (!agent) {
    // Try to find by name (case-insensitive) as fallback
    for (const [id, candidateAgent] of space.agents.entries()) {
      if (
        candidateAgent.name?.toLowerCase() === agentId.toLowerCase() ||
        id.toLowerCase() === agentId.toLowerCase()
      ) {
        agent = candidateAgent;
        console.log(
          `[Orchestrator] Found agent by name match: ${agentId} -> ${id}`
        );
        break;
      }
    }
  }

  if (!agent) {
    // Try to load agent from database
    try {
      const { getServerResourceAdapter } = await import("../space/factory");
      const adapter = await getServerResourceAdapter();
      const agentConfig = await adapter.getAgent(agentId);
      if (agentConfig) {
        console.log(`[Orchestrator] Loaded agent config from DB:`, {
          id: agentConfig.id,
          name: agentConfig.name,
          tools: agentConfig.tools,
        });
        agent = new Agent(agentConfig as any);
        space.registerAgent(agentId, agent);
      }
    } catch (e) {
      console.error(`[Orchestrator] Failed to load agent ${agentId}:`, e);
    }
  }

  if (!agent) {
    console.error(
      `[Orchestrator] Agent '${agentId}' not found. Available agents:`,
      Array.from(space.agents.keys())
    );
    return { task, error: `Agent '${agentId}' not found` };
  }

  // Log agent's tool configuration
  console.log(`[Orchestrator] Using agent:`, {
    name: agent.name,
    toolConfig: (agent as any).tools,
  });

  // Build context from previous task results
  let context = "";
  for (const dep of task.dependencies) {
    const depResult = previousResults.get(dep.taskId);
    if (depResult) {
      const depTask = space.plan?.getTaskById(dep.taskId);
      context += `\n[Result from "${depTask?.title || dep.taskId}"]:\n${depResult}\n`;
    }
  }

  // Create the prompt for the agent
  const prompt = context
    ? `Context from previous work:\n${context}\n\nYour task: ${task.description}`
    : task.description;

  try {
    // Execute the agent using streamText to capture tool calls
    // Pass the model from the orchestrator so all agents use the same model
    const stream = await agent.streamText({
      messages: [{ role: "user", content: prompt }] as XMessage[],
      spaceId: space.spaceId,
      model, // Use the orchestrator's model for consistency
      metadata: {
        taskId: task.id,
        taskTitle: task.title,
        delegatedFrom: "x",
      },
    });

    // Collect text and tool calls
    let result = "";
    const toolCalls: Array<{
      toolCallId?: string;
      name: string;
      args: unknown;
      result?: unknown;
    }> = [];

    // Stream the response and collect text
    let chunkCount = 0;
    const chunkTypes: Record<string, number> = {};

    for await (const chunk of stream.fullStream) {
      chunkCount++;
      chunkTypes[chunk.type] = (chunkTypes[chunk.type] || 0) + 1;

      if (chunk.type === "text-delta") {
        result += chunk.delta;
      } else if (chunk.type === "tool-call") {
        const toolCallId =
          chunk.toolCallId || `tool-${Date.now()}-${Math.random()}`;
        toolCalls.push({
          toolCallId,
          name: chunk.toolName,
          args: chunk.input,
        });
        console.log(
          `[Orchestrator] 🔧 Agent ${agentId} TOOL CALL: ${chunk.toolName}`,
          { toolCallId, args: chunk.input }
        );
      } else if (chunk.type === "tool-result") {
        const toolCall = toolCalls.find(
          (tc) => tc.toolCallId === chunk.toolCallId
        );
        if (toolCall) {
          toolCall.result = chunk.output;
          console.log(
            `[Orchestrator] ✅ Agent ${agentId} TOOL RESULT: ${chunk.toolName}`,
            { toolCallId: toolCall.toolCallId, hasResult: !!chunk.output }
          );
        }
      } else {
        // Log other chunk types we might be missing
        console.log(`[Orchestrator] Chunk type: ${chunk.type}`, chunk);
      }
    }

    // Summary of what we received
    console.log(`[Orchestrator] Agent ${agentId} stream summary:`, {
      totalChunks: chunkCount,
      chunkTypes,
      toolCallCount: toolCalls.length,
      resultLength: result.length,
    });

    // Get final text if stream didn't produce any
    if (!result || result.trim().length === 0) {
      result = await stream.text;
    }

    // Create artifact if result is substantial
    let artifactId: string | undefined;
    if (result && result.length > 500) {
      artifactId = `artifact_${task.id}_${Date.now()}`;
      // Save artifact to storage
      try {
        const { getStorageAdapter } = await import("../space/factory");
        const storage = await getStorageAdapter();
        const artifactInfo = {
          id: artifactId,
          storageKey: artifactId,
          originalName: `${task.title}.txt`,
          title: task.title,
          mimeType: "text/plain",
          sizeBytes: Buffer.byteLength(result, "utf-8"),
          metadata: {
            taskId: task.id,
            agentId,
            toolCalls: toolCalls.length,
          },
        };
        const buffer = Buffer.from(result, "utf-8");
        await storage.saveArtifact(space.spaceId, artifactInfo, buffer);
        console.log(
          `[Orchestrator] Created artifact ${artifactId} for task ${task.id}`
        );
      } catch (e) {
        console.error(`[Orchestrator] Failed to save artifact:`, e);
        // Still track the ID even if save fails
      }
    }

    // Mark task as completed
    task.complete(result);

    // Get agent name for better visibility
    const agentName = agent.name || agentId;

    // Emit completion event with tool calls and artifact info
    // NO TRUNCATION - stream EVERY BIT of data
    onEvent({
      type: "delegation",
      taskId: task.id,
      taskTitle: task.title,
      agentId,
      agentName,
      status: "completed",
      result: result, // FULL result - no truncation
      artifactId,
      toolCalls: toolCalls.map((tc) => ({
        toolCallId: tc.toolCallId, // Preserve toolCallId for proper matching
        name: tc.name,
        args: tc.args,
        result: tc.result, // FULL result - no truncation
      })),
      timestamp: Date.now(),
    });

    return { task, result, artifactId };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Mark task as failed
    task.fail(errorMessage);

    // Get agent name for better visibility
    let agentName = agentId;
    try {
      const failedAgent = space.getAgent(agentId);
      if (failedAgent) {
        agentName = failedAgent.name || agentId;
      }
    } catch (e) {
      // Agent not found
    }

    // Emit failure event
    onEvent({
      type: "delegation",
      taskId: task.id,
      taskTitle: task.title,
      agentId,
      agentName,
      status: "failed",
      error: errorMessage,
      timestamp: Date.now(),
    });

    return { task, error: errorMessage };
  }
}

/**
 * Generate a final synthesis from task results
 */
export async function synthesizeResults(
  model: LanguageModel,
  plan: Plan,
  results: Map<string, string>,
  originalRequest: string
): Promise<string> {
  // Build a summary of all task results
  const resultsSummary = plan.tasks
    .filter((t) => t.status === TaskStatus.COMPLETED)
    .map((task) => {
      const result = results.get(task.id) || "No result";
      return `## ${task.title} (by ${task.assignedTo})\n${result}`;
    })
    .join("\n\n");

  const systemPrompt = `You are X, synthesizing results from multiple agents to answer the user's request.

Your role:
- Combine the insights from all agents into a coherent response
- Credit the agents that contributed to each part
- Highlight key findings and recommendations
- Be concise but comprehensive`;

  const userPrompt = `Original request: ${originalRequest}

Results from agents:
${resultsSummary}

Synthesize these results into a final response for the user.`;

  const result = await generateObject({
    model,
    schema: z.object({
      text: z.string().describe("The final synthesized response"),
    }),
    system: systemPrompt,
    prompt: userPrompt,
  });
  return result.object.text;
}
