/**
 * XAgent - The space's conversational representative
 *
 * X is the interface between users and their spaces. Each space has an X agent
 * that acts as its representative. When you need to interact with a space, you
 * talk to X. XAgent merges TaskExecutor and Orchestrator functionality into a
 * single, user-friendly interface.
 */

import { Agent, AgentContext, AgentResponse } from "../agent/agent";
import { AgentConfig } from "../config";
import { Space } from "../space/space";
import { getServerResourceAdapter } from "@vibex/data";
import { Plan } from "../space/plan";
import { Task, TaskStatus } from "../space/task";
import { generateObject } from "ai";
import type { StreamTextResult } from "ai";
type StreamTextResultType = StreamTextResult<Record<string, any>, any>;
import { z } from "zod/v3";
import { WorkflowEngine } from "../workflow/engine";
import { Workflow } from "../workflow/types";
import type { VibexMessage } from "../space/message";

export interface XOptions {
  model?: string; // AI model to use
  storageRoot?: string; // Storage location
  defaultGoal?: string; // Default goal for new spaces
  spaceId?: string; // Explicit space ID
  singleAgentId?: string; // If set, route directly to this agent ID
}

export interface XStreamOptions {
  messages?: VibexMessage[];
  tools?: Record<string, unknown>;
  artifactId?: string;
  [key: string]: unknown;
}

export interface XAgentResponse extends AgentResponse {
  plan?: Plan;
  taskResults?: unknown[];
  artifacts?: unknown[];
  preservedSteps?: string[];
  regeneratedSteps?: string[];
  planChanges?: Record<string, unknown>;
}

export class XAgent extends Agent {
  private space: Space;
  public readonly spaceId: string;
  private abortController?: AbortController;
  public singleAgentId?: string; // If set, bypass planning
  private workflowEngine: WorkflowEngine;

  constructor(config: AgentConfig, space: Space, options?: XOptions) {
    // Enhance the config for XAgent
    const xConfig: AgentConfig = {
      ...config,
      name: "X",
      description: `I am X, the conversational representative for this space. I manage all aspects of the space and coordinate with other agents to achieve our goals.`,
    };

    super(xConfig);
    this.space = space;
    this.spaceId = space.spaceId;
    this.singleAgentId = options?.singleAgentId;

    this.workflowEngine = new WorkflowEngine();
    this.initializeWorkflowEngine();
  }

  private initializeWorkflowEngine() {
    this.workflowEngine.on("stepStart", (data) => {
      this.addMessage(`[Workflow] Starting step: ${data.step.name}`, {
        type: "system",
        stepId: data.step.id,
      });
    });

    this.workflowEngine.on("workflowPaused", (data) => {
      this.addMessage(`[Workflow] Paused: ${data.reason}`, {
        type: "system",
        status: "paused",
      });
    });

    this.workflowEngine.on("workflowComplete", (data) => {
      this.addMessage(`[Workflow] Completed successfully.`, {
        type: "system",
        status: "completed",
        output: data.output,
      });
    });

    this.workflowEngine.on("workflowFailed", (data) => {
      this.addMessage(`[Workflow] Failed: ${data.error}`, {
        type: "system",
        status: "failed",
        error: data.error,
      });
    });
  }

  /**
   * Execute a complex task using the Workflow Engine
   */
  async executeWorkflow(goal: string): Promise<string> {
    // 1. Plan
    const workflow = await this.planWorkflow(goal);

    // 2. Register
    this.workflowEngine.registerWorkflow(workflow);

    // 3. Start
    return await this.workflowEngine.startWorkflow(workflow.id, { goal });
  }

  private async planWorkflow(goal: string): Promise<Workflow> {
    const agentsList = Array.from(this.space.agents.keys()).join(", ");

    const workflowSchema = z.object({
      name: z.string(),
      description: z.string(),
      steps: z.array(
        z.object({
          id: z.string(),
          type: z.enum(["agent", "tool", "human_input", "condition"]),
          name: z.string(),
          next: z.string().optional(),
          config: z.record(z.any()),
        })
      ),
    });

    const result = await generateObject({
      model: this.getModel(),
      system: `You are an expert workflow planner.
Available Agents: ${agentsList}
Generate a workflow to achieve the user's goal: "${goal}"
Use "human_input" if you need clarification or approval.
Use "condition" for decision points.`,
      prompt: goal,
      schema: workflowSchema,
    });

    return {
      id: `wf-${Date.now()}`,
      version: "1.0",
      createdAt: new Date(),
      updatedAt: new Date(),
      ...result.object,
    } as Workflow;
  }

  /**
   * Getter for space (needed for external access)
   */
  getSpace(): Space {
    return this.space;
  }

  /**
   * Override getSystemPrompt to include plan and artifacts context
   */
  public getSystemPrompt(context?: AgentContext): string {
    const basePrompt = super.getSystemPrompt(context);
    return basePrompt + this.getPlanContext() + this.getArtifactsContext();
  }

  /**
   * Generate text - uses new AI SDK-style signature
   */
  async generateText(options: {
    messages: VibexMessage[];
    system?: string;
    [key: string]: unknown;
  }): Promise<AgentResponse> {
    // Add space context to options
    const metadata = options.metadata || {};
    return super.generateText({
      ...options,
      spaceId: this.space.spaceId,
      metadata: {
        spaceName: this.space.name,
        spaceGoal: this.space.goal,
        ...metadata,
      },
    });
  }

  /**
   * XAgent streamText - Orchestration Layer
   * Responsibilities: History management, agent delegation, persistence
   */
  async streamText(options: {
    messages: VibexMessage[];
    system?: string;
    spaceId?: string;
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
  }): Promise<StreamTextResultType> {
    const {
      messages,
      system: systemMessage,
      spaceId,
      metadata = {},
      ...restOptions
    } = options;

    console.log("[XAgent] Orchestration layer: starting streamText");

    const mode = metadata?.mode;
    if (!mode || mode !== "agent") {
      throw new Error("XAgent only supports 'agent' mode");
    }

    // PHASE 1: History Management
    await this.updateSpaceHistory(messages, metadata);

    // PHASE 2: Agent Delegation
    const streamResult = await this.handleAgentMode(
      messages,
      systemMessage,
      spaceId,
      metadata,
      restOptions
    );

    // PHASE 3: Message Persistence
    if (spaceId) {
      this.handleMessagePersistence(streamResult, messages, spaceId, metadata);
    }

    return streamResult;
  }

  /**
   * Agent Mode Handler - Direct delegation with performance optimization
   * Supports both single agent and parallel execution
   */
  private async handleAgentMode(
    messages: VibexMessage[],
    systemMessage: string | undefined,
    spaceId: string | undefined,
    metadata: Record<string, unknown>,
    restOptions: Record<string, unknown>
  ): Promise<StreamTextResult<Record<string, any>, any>> {
    // Check if parallel execution is requested
    const parallelAgents = metadata.parallelAgents as string[] | undefined;
    if (parallelAgents && parallelAgents.length > 1) {
      return this.handleParallelExecution(
        parallelAgents,
        messages,
        systemMessage,
        spaceId,
        metadata,
        restOptions
      );
    }

    // Single agent execution (existing logic)
    const targetAgent = metadata.requestedAgent as string;
    if (!targetAgent) {
      throw new Error("Agent mode requires requestedAgent in metadata");
    }

    console.log(`[XAgent] Agent mode: direct delegation to '${targetAgent}'`);

    // Get or load target agent
    let agent = this.space.getAgent(targetAgent);
    if (!agent) {
      // Load agent on demand
      console.log(`[XAgent] Loading agent '${targetAgent}' on demand`);
      const resourceAdapter = getServerResourceAdapter();
      const agentConfig = await resourceAdapter.getAgent(targetAgent);
      if (!agentConfig) {
        throw new Error(`Agent '${targetAgent}' not found`);
      }
      if (typeof agentConfig !== "object" || agentConfig === null) {
        throw new Error(`Invalid agent config for '${targetAgent}'`);
      }
      agent = new Agent(agentConfig as AgentConfig);
      this.space.registerAgent(targetAgent, agent);
    }

    // Performance optimization: Use recent messages only for single-agent
    const optimizedMessages = this.optimizeContextForAgent(messages);
    console.log(
      `[XAgent] Agent mode: using ${optimizedMessages.length} optimized messages`
    );

    // Direct delegation - no orchestration overhead
    return await agent.streamText({
      messages: optimizedMessages,
      system: systemMessage,
      spaceId,
      metadata: {
        ...metadata,
        delegationType: "direct",
        userId: this.space.userId, // Pass space owner ID for tracking
      },
      ...restOptions,
    });
  }

  /**
   * Handle parallel execution of multiple agents
   */
  private async handleParallelExecution(
    agentIds: string[],
    messages: VibexMessage[],
    systemMessage: string | undefined,
    spaceId: string | undefined,
    metadata: Record<string, unknown>,
    restOptions: Record<string, unknown>
  ): Promise<StreamTextResultType> {
    // Use spaceId and restOptions for future parallel execution enhancements
    void spaceId;
    void restOptions;
    console.log(`[XAgent] Parallel execution: ${agentIds.length} agents`);

    // Ensure all agents are loaded
    const resourceAdapter = getServerResourceAdapter();
    for (const agentId of agentIds) {
      if (!this.space.getAgent(agentId)) {
        const agentConfig = await resourceAdapter.getAgent(agentId);
        if (!agentConfig) {
          throw new Error(`Agent '${agentId}' not found`);
        }
        if (typeof agentConfig !== "object" || agentConfig === null) {
          throw new Error(`Invalid agent config for '${agentId}'`);
        }
        const agent = new Agent(agentConfig as AgentConfig);
        this.space.registerAgent(agentId, agent);
      }
    }

    // Use parallel execution engine
    if (!this.space.parallelEngine) {
      throw new Error("Parallel execution engine not initialized");
    }

    // ParallelTask type is imported at top of file
    const tasks = agentIds.map((agentId, index) => ({
      id: `parallel-${agentId}-${Date.now()}-${index}`,
      agentId,
      messages: this.optimizeContextForAgent(messages),
      system: systemMessage,
      metadata: {
        ...metadata,
        delegationType: "parallel",
        userId: this.space.userId,
        parallelIndex: index,
      },
      priority: agentIds.length - index, // First agent gets highest priority
    }));

    const results = await this.space.parallelEngine.executeParallel(tasks);

    // Aggregate results - create a mock StreamTextResult for parallel execution
    // This is a simplified return type for parallel execution
    // In a real implementation, this would need to properly construct a StreamTextResult
    const aggregatedText = results
      .map((r) => `[${r.agentId}]: ${r.result.text}`)
      .join("\n\n");
    // Return a minimal StreamTextResult-like object
    // Note: This is a workaround - proper implementation would require full StreamTextResult construction
    return {
      textStream: async function* () {
        yield { type: "text-delta" as const, textDelta: aggregatedText };
      },
      fullStream: async function* () {
        yield { type: "text-delta" as const, textDelta: aggregatedText };
        yield { type: "finish" as const, finishReason: "stop" as const };
      },
      text: aggregatedText,
    } as any as StreamTextResultType;
  }

  /**
   * Update space history with new messages
   * Now supports per-task history
   */
  private async updateSpaceHistory(
    messages: VibexMessage[],
    metadata?: Record<string, unknown>
  ): Promise<void> {
    // Get taskId from metadata, or use "default" for legacy support
    const taskId =
      (metadata?.taskId as string | undefined) ||
      (metadata?.conversationId as string | undefined) ||
      "default";
    const task = this.space.getOrCreateTask(taskId);

    const existingMessages = task.history.getMessages();
    const newMessages = messages.slice(existingMessages.length);

    if (newMessages.length > 0) {
      for (const msg of newMessages) {
        const formattedMsg = {
          ...msg,
          content:
            typeof msg.content === "string"
              ? msg.content
              : Array.isArray(msg.content)
                ? msg.content
                : [{ type: "text", text: msg.content }],
        };
        task.history.add(formattedMsg);
      }
      console.log(
        `[XAgent] Updated task ${taskId} history with ${newMessages.length} new messages`
      );
    }
  }

  /**
   * Optimize message context for single-agent performance
   */
  private optimizeContextForAgent(messages: VibexMessage[]): VibexMessage[] {
    // For agent mode, use recent messages only to minimize token usage
    return messages.slice(-4); // Last 4 messages (2 exchanges)
  }

  /**
   * Handle message persistence after streaming completes
   * Note: Message persistence is handled on client side to maintain UIMessage format for rendering
   */
  private handleMessagePersistence(
    streamResult: StreamTextResultType,
    messages: VibexMessage[],
    spaceId: string,
    metadata: Record<string, unknown>
  ): void {
    // Message persistence is handled on client side
    // This method is kept for potential future server-side persistence
    void streamResult;
    void messages;
    void spaceId;
    void metadata;
  }

  /**
   * Stop current operation
   */
  stop() {
    this.space.messageQueue.clear();
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Add message to queue (soft interrupt)
   */
  addMessage(message: string, metadata?: Record<string, unknown>): string {
    return this.space.messageQueue.add(message, metadata);
  }

  /**
   * Create or update the space plan
   */
  async createPlan(goal?: string): Promise<Plan> {
    const planGoal = goal || this.space.goal;

    // Generate plan using LLM
    const planSchema = z.object({
      tasks: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          description: z.string(),
          assignedTo: z.string().optional(),
          priority: z.enum(["low", "medium", "high"]).default("medium"),
          estimatedTime: z.string().optional(),
          dependencies: z
            .array(
              z.object({
                taskId: z.string(),
                type: z.enum(["required", "optional"]),
              })
            )
            .default([]),
          tags: z.array(z.string()).default([]),
        })
      ),
    });

    const result = await generateObject({
      model: this.getModel(),
      system:
        this.getSystemPrompt() +
        "\n\nCreate a detailed plan to achieve the goal.",
      prompt: `Goal: ${planGoal}\n\nAvailable agents: ${Array.from(
        this.space.agents.keys()
      ).join(", ")}`,
      schema: planSchema,
    });

    // Create Plan with Tasks
    const tasks = result.object.tasks.map(
      (taskData) =>
        new Task({
          ...taskData,
          status: TaskStatus.PENDING,
        })
    );

    const plan = new Plan({
      goal: planGoal,
      tasks,
    });

    await this.space.createPlan(plan);
    return plan;
  }

  /**
   * Adapt the plan based on new information or user feedback
   */
  async adaptPlan(feedback: string): Promise<Plan> {
    if (!this.space.plan) {
      // No existing plan, create a new one with the feedback
      return this.createPlan(feedback);
    }

    const currentPlan = this.space.plan;
    const progress = currentPlan.getProgressSummary();

    // Schema for plan adaptation
    const adaptSchema = z.object({
      preserveTasks: z
        .array(z.string())
        .describe("IDs of tasks to keep unchanged"),
      modifyTasks: z
        .array(
          z.object({
            id: z.string(),
            changes: z.object({
              title: z.string().optional(),
              description: z.string().optional(),
              priority: z.enum(["low", "medium", "high"]).optional(),
              assignedTo: z.string().optional(),
            }),
          })
        )
        .describe("Tasks to modify"),
      removeTasks: z.array(z.string()).describe("IDs of tasks to remove"),
      addTasks: z
        .array(
          z.object({
            id: z.string(),
            title: z.string(),
            description: z.string(),
            assignedTo: z.string().optional(),
            priority: z.enum(["low", "medium", "high"]).default("medium"),
            dependencies: z
              .array(
                z.object({
                  taskId: z.string(),
                  type: z.enum(["required", "optional"]),
                })
              )
              .default([]),
            tags: z.array(z.string()).default([]),
          })
        )
        .describe("New tasks to add"),
      reasoningText: z.string().describe("Explanation of the plan changes"),
    });

    const prompt = `
Current Plan Progress:
- Total tasks: ${progress.totalTasks}
- Completed: ${progress.completedTasks}
- In Progress: ${progress.runningTasks}
- Pending: ${progress.pendingTasks}

Current Tasks:
${currentPlan.tasks
  .map((t) => `- [${t.id}] ${t.title} (${t.status})`)
  .join("\n")}

User Feedback: ${feedback}

Analyze the current plan and adapt it based on the user's feedback.
Keep completed tasks unless explicitly asked to redo them.
Preserve tasks that are still relevant.
Modify, remove, or add tasks as needed to better achieve the goal.
`;

    const result = await generateObject({
      model: this.getModel(),
      system:
        this.getSystemPrompt() +
        "\n\nAdapt the existing plan based on user feedback.",
      prompt,
      schema: adaptSchema,
    });

    // Apply adaptations
    const adaptedTasks: Task[] = [];

    // Keep preserved tasks
    for (const taskId of result.object.preserveTasks) {
      const task = currentPlan.tasks.find((t) => t.id === taskId);
      if (task) {
        adaptedTasks.push(task);
      }
    }

    // Modify tasks
    for (const modification of result.object.modifyTasks) {
      const task = currentPlan.tasks.find((t) => t.id === modification.id);
      if (task) {
        // Apply changes
        if (modification.changes.title) task.title = modification.changes.title;
        if (modification.changes.description)
          task.description = modification.changes.description;
        if (modification.changes.priority)
          task.priority = modification.changes.priority;
        if (modification.changes.assignedTo)
          task.assignedTo = modification.changes.assignedTo;
        adaptedTasks.push(task);
      }
    }

    // Add new tasks
    for (const newTaskData of result.object.addTasks) {
      const newTask = new Task({
        ...newTaskData,
        status: TaskStatus.PENDING,
      });
      adaptedTasks.push(newTask);
    }

    // Create adapted plan
    const adaptedPlan = new Plan({
      goal: currentPlan.goal,
      tasks: adaptedTasks,
    });

    // Update space with adapted plan
    await this.space.createPlan(adaptedPlan);

    // Log the reasoning
    console.log("[Plan Adaptation]", result.object.reasoningText);

    return adaptedPlan;
  }

  /**
   * Get plan context for system prompt
   */
  private getPlanContext(): string {
    if (!this.space.plan) {
      return "\n\nNo active plan for this space yet.";
    }

    const summary = this.space.plan.getProgressSummary();
    return `
Current Plan Status:
- Total tasks: ${summary.totalTasks}
- Completed: ${summary.completedTasks}
- Running: ${summary.runningTasks}
- Pending: ${summary.pendingTasks}
- Failed: ${summary.failedTasks}
- Progress: ${summary.progressPercentage.toFixed(1)}%
`;
  }

  /**
   * Get artifacts context for system prompt
   */
  private getArtifactsContext(): string {
    if (!this.space.artifacts || this.space.artifacts.length === 0) {
      return "";
    }

    const artifactsList = this.space.artifacts
      .map((a) => `- ${a.title || a.path} (${a.artifactType || "document"})`)
      .join("\n");

    return `
Available Artifacts:
${artifactsList}

These artifacts are pre-loaded in the space and can be referenced in your responses.
`;
  }

  /**
   * Get XAgent summary
   */
  getSummary(): Record<string, unknown> {
    const base = super.getSummary();
    return {
      ...base,
      spaceId: this.space.spaceId,
      spaceName: this.space.name,
      spaceGoal: this.space.goal,
      planStatus: this.space.plan?.getProgressSummary(),
    };
  }

  /**
   * Static factory to start a new space
   */
  static async start(goal: string, options: XOptions = {}): Promise<XAgent> {
    const { spaceId, model, singleAgentId } = options;

    // Use provided spaceId or generate one
    const id =
      spaceId ||
      `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Start space (this creates XAgent internally)
    const { startSpace } = await import("../space/space");
    const space = await startSpace({
      spaceId: id,
      goal,
      name: goal.slice(0, 50),
      model,
    });

    if (!space.xAgent) {
      throw new Error("Failed to initialize XAgent");
    }

    // Set singleAgentId if provided
    if (singleAgentId && space.xAgent) {
      space.xAgent.singleAgentId = singleAgentId;
    }

    return space.xAgent;
  }

  /**
   * Static factory to resume an existing space
   */
  static async resume(
    spaceId: string,
    options: XOptions = {}
  ): Promise<XAgent> {
    const { model } = options;

    // Load existing space
    const { SpaceStorageFactory, getServerResourceAdapter } = await import(
      "@vibex/data"
    );
    const { startSpace } = await import("../space/space");

    // Check if space exists using ResourceAdapter
    const adapter = getServerResourceAdapter();
    const spaceModel = await adapter.getSpace(spaceId);

    if (!spaceModel) {
      throw new Error(`Space ${spaceId} not found`);
    }

    // Load space data
    // Recreate space with saved state
    const space = await startSpace({
      spaceId,
      goal: spaceModel.description || "", // Map description to goal
      name: spaceModel.name,
      model: model || (spaceModel.config as any)?.model,
    });

    if (!space.xAgent) {
      throw new Error("Failed to initialize XAgent");
    }

    // Set singleAgentId if provided
    const agentId =
      options.singleAgentId || (spaceModel.config as any)?.singleAgentId;
    if (agentId) {
      space.xAgent.singleAgentId = agentId;
    }

    // Restore conversation messages if exists
    // Messages are now loaded via ResourceAdapter through tasks
    // This part needs to be adapted to load from Task history
    const tasks = await adapter.getTasks(spaceId);
    if (tasks.length > 0) {
      // Find the default task or most recent one
      // Implementation details depend on how tasks are structured now
    }

    return space.xAgent;
  }
}
