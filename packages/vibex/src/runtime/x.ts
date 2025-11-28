/**
 * XAgent - The space's conversational representative and orchestrator
 *
 * X is the interface between users and their spaces. Each space has an X agent
 * that acts as its representative. When you need to interact with a space, you
 * talk to X.
 *
 * X can orchestrate multiple agents:
 * 1. Analyzes requests to determine if multi-agent collaboration is needed
 * 2. Creates plans with tasks assigned to specialized agents
 * 3. Delegates tasks to worker agents (parallel or sequential based on dependencies)
 * 4. Streams delegation events so users see the orchestration
 * 5. Synthesizes results from all agents
 */

import { Agent, AgentContext, AgentResponse } from "./agent";
import { AgentConfig } from "../config";
import { Space } from "../space";
import { getServerResourceAdapter } from "../space/factory";
import { Plan } from "../space/plan";
import { Task } from "../space/task";
import { generateObject } from "ai";
import type { StreamTextResult } from "ai";
type StreamTextResultType = StreamTextResult<Record<string, any>, any>;
import { z } from "zod/v3";
import { WorkflowEngine } from "../workflow/engine";
import { ExecutionGraph } from "../workflow/types";
import type { XMessage } from "../space/message";
import {
  analyzeRequest,
  createPlanFromAnalysis,
  executePlan,
  synthesizeResults,
  DelegationEvent,
} from "./orchestrator";

export interface XOptions {
  model?: string; // AI model to use
  storageRoot?: string; // Storage location
  defaultGoal?: string; // Default goal for new spaces
  spaceId?: string; // Explicit space ID
  singleAgentId?: string; // If set, route directly to this agent ID
}

/**
 * Chat mode determines how X handles requests:
 * - ask: Direct response, no planning or multi-agent orchestration
 * - plan: Create plan and return for user approval before execution
 * - agent: Create plan and auto-execute with multi-agent orchestration
 */
export type XChatMode = "ask" | "plan" | "agent";

export interface XStreamOptions {
  messages?: XMessage[];
  tools?: Record<string, unknown>;
  artifactId?: string;
  [key: string]: unknown;
}

export interface PlanResponse {
  type: "plan";
  plan: {
    goal: string;
    tasks: Array<{
      id: string;
      title: string;
      description: string;
      assignedTo?: string;
      dependencies: string[];
      status: string;
    }>;
  };
  message: string;
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
      description: `I am X, the conversational representative for this space. I help accomplish tasks using available tools and coordinate with the space's resources.`,
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

  private async planWorkflow(goal: string): Promise<ExecutionGraph> {
    const agentsList = Array.from(this.space.agents.keys()).join(", ");

    const workflowSchema = z.object({
      name: z.string(),
      description: z.string(),
      nodes: z.array(
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
      ...result.object,
    } as ExecutionGraph;
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
    messages: XMessage[];
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
   * XAgent streamText - Multi-mode orchestration
   *
   * Supports three chat modes:
   * - ask: Direct response, no planning or multi-agent
   * - plan: Create plan and return for approval
   * - agent: Create and auto-execute plan with multi-agent
   */
  async streamText(options: {
    messages: XMessage[];
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

    // Determine chat mode (default to "agent" for backward compatibility)
    const chatMode =
      (metadata?.chatMode as XChatMode) ||
      (metadata?.mode === "agent" ? "agent" : "ask");

    console.log(`[XAgent] Chat mode: ${chatMode}`);

    // PHASE 1: History Management
    await this.updateSpaceHistory(messages, metadata);

    // Handle based on chat mode
    switch (chatMode) {
      case "ask":
        return this.handleAskMode(
          messages,
          systemMessage,
          spaceId,
          metadata,
          restOptions
        );

      case "plan":
        return this.handlePlanMode(messages, systemMessage, spaceId, metadata);

      case "agent":
        return this.handleAgentModeWithOrchestration(
          messages,
          systemMessage,
          spaceId,
          metadata,
          restOptions
        );

      default:
        // Fallback to ask mode
        return this.handleAskMode(
          messages,
          systemMessage,
          spaceId,
          metadata,
          restOptions
        );
    }
  }

  /**
   * Ask Mode - Direct response without planning or multi-agent
   */
  private async handleAskMode(
    messages: XMessage[],
    systemMessage: string | undefined,
    spaceId: string | undefined,
    metadata: Record<string, unknown>,
    restOptions: Record<string, unknown>
  ): Promise<StreamTextResultType> {
    console.log("[XAgent] Ask mode: direct response");
    const optimizedMessages = this.optimizeContextForAgent(messages);
    return await super.streamText({
      messages: optimizedMessages,
      system: systemMessage,
      spaceId,
      metadata: {
        ...metadata,
        chatMode: "ask",
        userId: this.space.userId,
      },
      ...restOptions,
    });
  }

  /**
   * Plan Mode - Create plan and return for user approval
   */
  private async handlePlanMode(
    messages: XMessage[],
    _systemMessage: string | undefined,
    spaceId: string | undefined,
    _metadata: Record<string, unknown>
  ): Promise<StreamTextResultType> {
    console.log("[XAgent] Plan mode: creating plan for approval");

    // Get the last user message
    const lastUserMessage = messages.filter((m) => m.role === "user").pop();
    const userContent =
      typeof lastUserMessage?.content === "string"
        ? lastUserMessage.content
        : "";

    // Get available agents
    const availableAgents = await this.getAvailableAgents();

    // Analyze and create plan
    const analysis = await analyzeRequest(
      this.getModel({ spaceId }),
      userContent,
      availableAgents
    );

    if (!analysis.needsPlan || !analysis.suggestedTasks) {
      // Simple request - return a message saying no plan needed
      const response = `This request can be answered directly without multi-agent orchestration.\n\nReasoning: ${analysis.reasoning}\n\nWould you like me to answer directly? (Use "ask" mode for direct answers)`;
      return this.createTextStreamResponse(response);
    }

    // Create the plan
    const plan = createPlanFromAnalysis(userContent, analysis.suggestedTasks);

    // Store pending plan for later execution
    this.space.plan = plan;

    // Format plan response
    const planResponse = this.formatPlanForApproval(plan, analysis.reasoning);
    return this.createTextStreamResponse(planResponse);
  }

  /**
   * Agent Mode with Orchestration - Create and auto-execute plan
   */
  private async handleAgentModeWithOrchestration(
    messages: XMessage[],
    systemMessage: string | undefined,
    spaceId: string | undefined,
    metadata: Record<string, unknown>,
    restOptions: Record<string, unknown>
  ): Promise<StreamTextResultType> {
    // Check for explicit agent delegation
    const requestedAgent = metadata.requestedAgent as string | undefined;
    if (requestedAgent) {
      return this.handleDirectDelegation(
        messages,
        systemMessage,
        spaceId,
        metadata,
        restOptions,
        requestedAgent
      );
    }

    // Check if executing a previously approved plan
    if (metadata.executePlan && this.space.plan) {
      console.log("[XAgent] Executing approved plan");
      return this.executePendingPlan(spaceId, metadata);
    }

    // Analyze request for multi-agent orchestration
    const lastUserMessage = messages.filter((m) => m.role === "user").pop();
    const userContent =
      typeof lastUserMessage?.content === "string"
        ? lastUserMessage.content
        : "";

    const availableAgents = await this.getAvailableAgents();
    const analysis = await analyzeRequest(
      this.getModel({ spaceId }),
      userContent,
      availableAgents
    );

    console.log(`[XAgent] Agent mode analysis:`, {
      needsPlan: analysis.needsPlan,
      reasoning: analysis.reasoning,
      taskCount: analysis.suggestedTasks?.length || 0,
    });

    // If multi-agent orchestration is needed, execute via plan
    if (
      analysis.needsPlan &&
      analysis.suggestedTasks &&
      analysis.suggestedTasks.length > 0
    ) {
      return await this.executeWithPlan(
        userContent,
        analysis.suggestedTasks,
        spaceId,
        metadata
      );
    }

    // Otherwise, handle directly
    console.log(
      "[XAgent] Agent mode: handling directly (no multi-agent needed)"
    );
    const optimizedMessages = this.optimizeContextForAgent(messages);
    return await super.streamText({
      messages: optimizedMessages,
      system: systemMessage,
      spaceId,
      metadata: {
        ...metadata,
        chatMode: "agent",
        delegationType: "self",
        userId: this.space.userId,
      },
      ...restOptions,
    });
  }

  /**
   * Execute a pending plan (after user approval in plan mode)
   */
  private async executePendingPlan(
    spaceId: string | undefined,
    _metadata: Record<string, unknown>
  ): Promise<StreamTextResultType> {
    const plan = this.space.plan;
    if (!plan) {
      return this.createTextStreamResponse(
        "No plan to execute. Please create a plan first using 'plan' mode."
      );
    }

    // Collect delegation events
    const events: DelegationEvent[] = [];

    // Execute the plan
    const { results, artifacts } = await executePlan(
      plan,
      this.space,
      this.getModel({ spaceId }),
      (event) => {
        events.push(event);
        console.log("[XAgent] Delegation event:", event);
      }
    );

    // Synthesize final response
    const finalResponse = await synthesizeResults(
      this.getModel({ spaceId }),
      plan,
      results,
      plan.goal
    );

    // Build response
    const streamContent = this.buildOrchestrationResponse(
      plan,
      events,
      artifacts,
      finalResponse
    );

    return this.createTextStreamResponse(streamContent);
  }

  /**
   * Handle direct delegation to a specific agent
   */
  private async handleDirectDelegation(
    messages: XMessage[],
    systemMessage: string | undefined,
    spaceId: string | undefined,
    metadata: Record<string, unknown>,
    restOptions: Record<string, unknown>,
    targetAgent: string
  ): Promise<StreamTextResultType> {
    const normalizedTarget = targetAgent.trim().toLowerCase();
    const selfAgentIds = [
      this.name?.toLowerCase(),
      this.id?.toLowerCase(),
      this.singleAgentId?.toLowerCase(),
    ].filter(Boolean) as string[];

    // If targeting self, handle directly
    if (selfAgentIds.includes(normalizedTarget)) {
      const optimizedMessages = this.optimizeContextForAgent(messages);
      return await super.streamText({
        messages: optimizedMessages,
        system: systemMessage,
        spaceId,
        metadata: {
          ...metadata,
          delegationType: "self",
          userId: this.space.userId,
        },
        ...restOptions,
      });
    }

    // Delegate to another agent
    console.log(`[XAgent] Direct delegation to '${targetAgent}'`);
    let agent = this.space.getAgent(targetAgent);
    if (!agent) {
      const resourceAdapter = getServerResourceAdapter();
      const agentConfig = await resourceAdapter.getAgent(targetAgent);
      if (!agentConfig) {
        throw new Error(`Agent '${targetAgent}' not found`);
      }
      agent = new Agent(agentConfig as AgentConfig);
      this.space.registerAgent(targetAgent, agent);
    }

    const optimizedMessages = this.optimizeContextForAgent(messages);
    return await agent.streamText({
      messages: optimizedMessages,
      system: systemMessage,
      spaceId,
      metadata: {
        ...metadata,
        delegationType: "direct",
        userId: this.space.userId,
      },
      ...restOptions,
    });
  }

  /**
   * Format a plan for user approval
   */
  private formatPlanForApproval(plan: Plan, reasoning: string): string {
    const sections: string[] = [];

    sections.push(`## 📋 Plan Created\n`);
    sections.push(`**Goal:** ${plan.goal}\n`);
    sections.push(`**Reasoning:** ${reasoning}\n`);
    sections.push(`### Tasks (${plan.tasks.length})\n`);

    for (const task of plan.tasks) {
      const deps =
        task.dependencies.length > 0
          ? ` (depends on: ${task.dependencies.map((d) => d.taskId).join(", ")})`
          : "";
      sections.push(
        `${task.id}. **${task.title}** → \`${task.assignedTo || "unassigned"}\`${deps}`
      );
      sections.push(`   ${task.description}\n`);
    }

    sections.push(`\n---`);
    sections.push(
      `To execute this plan, send a message with \`chatMode: "agent"\` and \`executePlan: true\``
    );
    sections.push(`Or modify the tasks and re-submit.`);

    return sections.join("\n");
  }

  /**
   * Create a simple text stream response
   */
  private createTextStreamResponse(text: string): StreamTextResultType {
    return {
      textStream: async function* () {
        yield { type: "text-delta" as const, textDelta: text };
      },
      fullStream: async function* () {
        yield { type: "text-delta" as const, textDelta: text };
        yield { type: "finish" as const, finishReason: "stop" as const };
      },
      text,
      toUIMessageStreamResponse: () => {
        return new Response(text, {
          headers: { "Content-Type": "text/plain" },
        });
      },
    } as any as StreamTextResultType;
  }

  /**
   * Get list of available agents for orchestration
   */
  private async getAvailableAgents(): Promise<
    Array<{ id: string; name: string; description: string }>
  > {
    const resourceAdapter = getServerResourceAdapter();
    const agents = await resourceAdapter.getAgents();

    return agents.map((a: any) => ({
      id: a.id || a.name,
      name: a.name,
      description: a.description || "",
    }));
  }

  /**
   * Execute a request using plan-based multi-agent orchestration
   */
  private async executeWithPlan(
    userRequest: string,
    suggestedTasks: Array<{
      title: string;
      description: string;
      assignedTo: string;
      dependencies: string[];
    }>,
    spaceId: string | undefined,
    _metadata: Record<string, unknown> // Reserved for future use
  ): Promise<StreamTextResultType> {
    console.log(`[XAgent] Executing with plan: ${suggestedTasks.length} tasks`);

    // Create the plan
    const plan = createPlanFromAnalysis(userRequest, suggestedTasks);
    this.space.plan = plan;

    // Collect delegation events for streaming
    const events: DelegationEvent[] = [];

    // Execute the plan
    const { results, artifacts } = await executePlan(
      plan,
      this.space,
      this.getModel({ spaceId }),
      (event) => {
        events.push(event);
        console.log(`[XAgent] Delegation event:`, event);
      }
    );

    // Synthesize final response
    const finalResponse = await synthesizeResults(
      this.getModel({ spaceId }),
      plan,
      results,
      userRequest
    );

    // Build the streamed response with delegation info
    const streamContent = this.buildOrchestrationResponse(
      plan,
      events,
      artifacts,
      finalResponse
    );

    // Return as a StreamTextResult
    return {
      textStream: async function* () {
        yield { type: "text-delta" as const, textDelta: streamContent };
      },
      fullStream: async function* () {
        yield { type: "text-delta" as const, textDelta: streamContent };
        yield { type: "finish" as const, finishReason: "stop" as const };
      },
      text: streamContent,
      toUIMessageStreamResponse: () => {
        return new Response(streamContent, {
          headers: { "Content-Type": "text/plain" },
        });
      },
    } as any as StreamTextResultType;
  }

  /**
   * Build a formatted response showing orchestration details
   */
  private buildOrchestrationResponse(
    plan: Plan,
    events: DelegationEvent[],
    artifacts: string[],
    finalResponse: string
  ): string {
    const sections: string[] = [];

    // Plan overview
    sections.push(`## Plan: ${plan.goal}\n`);

    // Task execution log
    sections.push(`### Task Execution\n`);
    for (const event of events) {
      if (event.status === "started") {
        sections.push(
          `🔄 **Delegated** "${event.taskTitle}" to **${event.agentName}**`
        );
      } else if (event.status === "completed") {
        sections.push(
          `✅ **${event.agentName}** completed "${event.taskTitle}"`
        );
        if (event.artifactId) {
          sections.push(`   📄 Created artifact: ${event.artifactId}`);
        }
      } else if (event.status === "failed") {
        sections.push(
          `❌ **${event.agentName}** failed on "${event.taskTitle}": ${event.error}`
        );
      }
    }

    // Artifacts created
    if (artifacts.length > 0) {
      sections.push(`\n### Artifacts Created\n`);
      for (const artifactId of artifacts) {
        sections.push(`- ${artifactId}`);
      }
    }

    // Final synthesized response
    sections.push(`\n### Summary\n`);
    sections.push(finalResponse);

    return sections.join("\n");
  }

  /**
   * Update space history with new messages
   * Now supports per-task history
   */
  private async updateSpaceHistory(
    messages: XMessage[],
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
  private optimizeContextForAgent(messages: XMessage[]): XMessage[] {
    // For agent mode, use recent messages only to minimize token usage
    return messages.slice(-4); // Last 4 messages (2 exchanges)
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

    // Create Plan with Tasks (status defaults to PENDING)
    const tasks = result.object.tasks.map(
      (taskData) =>
        new Task({
          id: taskData.id,
          title: taskData.title,
          description: taskData.description,
          assignedTo: taskData.assignedTo,
          priority: taskData.priority,
          estimatedTime: taskData.estimatedTime,
          tags: taskData.tags,
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

    // Add new tasks (status defaults to PENDING)
    for (const newTaskData of result.object.addTasks) {
      const newTask = new Task({
        id: newTaskData.id,
        title: newTaskData.title,
        description: newTaskData.description,
        assignedTo: newTaskData.assignedTo,
        priority: newTaskData.priority,
        dependencies: newTaskData.dependencies,
        tags: newTaskData.tags,
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
    const { startSpace } = await import("../space");
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
    const { getServerResourceAdapter } = await import("../space/factory");
    const { startSpace } = await import("../space");

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

    // Load persisted state (plan, config, etc.)
    await space.loadState();

    // Set singleAgentId if provided
    const agentId =
      options.singleAgentId || (spaceModel.config as any)?.singleAgentId;
    if (agentId) {
      space.xAgent.singleAgentId = agentId;
    }

    // Note: Messages and tasks are now loaded through the plan via loadState()
    // The plan contains tasks which have their own message history

    return space.xAgent;
  }
}
