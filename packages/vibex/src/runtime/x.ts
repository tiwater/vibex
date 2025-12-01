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
import {
  generateObject,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import type { StreamTextResult } from "ai";
type StreamTextResultType = StreamTextResult<Record<string, any>, any>;
import { z } from "zod/v3";
import type { XMessage } from "../types/message";
import { getTextContent } from "../utils/message";
import {
  analyzeRequest,
  createPlanFromAnalysis,
  executePlan,
  synthesizeResults,
  DelegationEvent,
} from "./orchestration";

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
  constructor(config: AgentConfig, space: Space, options?: XOptions) {
    const xConfig: AgentConfig = {
      ...config,
      name: "X",
      description: `I am X, the conversational representative for this space.`,
    };
    super(xConfig);
    this.space = space;
    this.spaceId = space.spaceId;
    this.singleAgentId = options?.singleAgentId;
  }

  /**
   * Getter for space
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
    const userContent = lastUserMessage ? getTextContent(lastUserMessage) : "";

    if (!userContent || userContent.trim().length === 0) {
      console.warn("[XAgent] Empty user content in plan mode");
      return this.createTextStreamResponse(
        "I didn't receive any message content. Please provide a request to create a plan for."
      );
    }

    // Get available agents
    const availableAgents = await this.getAvailableAgents();

    // Analyze and create plan
    let analysis;
    try {
      analysis = await analyzeRequest(
        this.getModel({ spaceId }),
        userContent,
        availableAgents
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[XAgent] analyzeRequest failed:`, error);
      return this.createTextStreamResponse(
        `❌ **Error analyzing request**\n\n` +
          `The AI failed to analyze your request for planning.\n\n` +
          `**Error:** ${errorMsg}\n\n` +
          `**Tip:** Try using "ask" mode for a direct response.`
      );
    }

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
    console.log("[XAgent] Entering handleAgentModeWithOrchestration");

    // Check for explicit agent delegation
    const requestedAgent = metadata.requestedAgent as string | undefined;
    if (requestedAgent) {
      console.log(`[XAgent] Direct delegation requested to: ${requestedAgent}`);
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
    const userContent = lastUserMessage ? getTextContent(lastUserMessage) : "";

    if (!userContent || userContent.trim().length === 0) {
      console.warn(
        "[XAgent] Empty user content, cannot analyze for multi-agent collaboration"
      );
      return this.createTextStreamResponse(
        "I didn't receive any message content. Please provide a request or question."
      );
    }

    console.log("[XAgent] Getting available agents...");
    const availableAgents = await this.getAvailableAgents();
    console.log(
      `[XAgent] Available agents count: ${availableAgents.length}`,
      availableAgents
    );

    if (availableAgents.length === 0) {
      console.warn(
        `[XAgent] No agents available for delegation! Space agents:`,
        Array.from(this.space.agents.keys())
      );
    }

    let analysis;
    try {
      analysis = await analyzeRequest(
        this.getModel({ spaceId }),
        userContent,
        availableAgents
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[XAgent] analyzeRequest failed:`, error);
      return this.createTextStreamResponse(
        `❌ **Error analyzing request**\n\n` +
          `The AI failed to analyze your request for multi-agent orchestration.\n\n` +
          `**Error:** ${errorMsg}\n\n` +
          `**Tip:** Try using "ask" mode for a direct response, or simplify your request.`
      );
    }

    console.log(`[XAgent] Agent mode analysis:`, {
      needsPlan: analysis.needsPlan,
      reasoning: analysis.reasoning,
      taskCount: analysis.suggestedTasks?.length || 0,
      suggestedTasks: analysis.suggestedTasks?.map((t) => ({
        title: t.title,
        assignedTo: t.assignedTo,
      })),
    });

    // If multi-agent orchestration is needed, execute via plan
    if (
      analysis.needsPlan &&
      analysis.suggestedTasks &&
      analysis.suggestedTasks.length > 0
    ) {
      console.log(
        `[XAgent] Creating plan with ${analysis.suggestedTasks.length} tasks`
      );
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
    const directStream = await super.streamText({
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

    // Return stream directly - AI SDK handles tool calls
    return directStream;
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
    const { results } = await executePlan(
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

    // Build simple text summary
    const streamContent = `## Plan: ${plan.goal}\n\n${finalResponse || ""}`;

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
      const resourceAdapter = await getServerResourceAdapter();
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
  /**
   * Wrap a stream to include analysis visualization
   */
  // Removed wrapStreamWithAnalysis - unnecessary complexity
  // Just return the stream directly, AI SDK handles tool calls

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
    // First, get agents from in-memory space (these are always available)
    const agentList: Array<{ id: string; name: string; description: string }> =
      [];

    // Get agents from space's agents map
    console.log(
      `[XAgent] Space has ${this.space.agents.size} agents registered:`,
      Array.from(this.space.agents.keys())
    );
    for (const [agentId, agent] of this.space.agents.entries()) {
      agentList.push({
        id: agentId,
        name: agent.name,
        description: agent.description || "",
      });
      console.log(
        `[XAgent] Added agent to list: ${agent.name} (id: ${agentId})`
      );
    }

    // Also try to get agents from database (if available)
    // But prioritize in-memory agents (from config) over database agents
    // Database agents may have old names, so we only add them if they don't exist in memory
    try {
      const resourceAdapter = await getServerResourceAdapter();
      if (
        "ensureInitialized" in resourceAdapter &&
        typeof resourceAdapter.ensureInitialized === "function"
      ) {
        await resourceAdapter.ensureInitialized();
      }
      const dbAgents = await resourceAdapter.getAgents();

      // Merge database agents (avoid duplicates)
      // Only add database agents that aren't already in the in-memory list
      // This ensures config values (English) take precedence over database values
      for (const dbAgent of dbAgents) {
        const dbAgentId = dbAgent.id || dbAgent.name;
        const existing = agentList.find(
          (a) => a.id === dbAgentId || a.name === dbAgent.name
        );
        if (!existing) {
          // Only add if not already in memory (which has the correct English names)
          agentList.push({
            id: dbAgentId,
            name: dbAgent.name,
            description: dbAgent.description || "",
          });
        }
      }
    } catch (e) {
      // Database unavailable - that's okay, we have in-memory agents
      console.warn(
        `[XAgent] Could not load agents from database (using in-memory only):`,
        e instanceof Error ? e.message : String(e)
      );
    }

    console.log(
      `[XAgent] Available agents for delegation:`,
      agentList.map((a) => a.name)
    );
    return agentList;
  }

  /**
   * Execute with plan - streams delegation events as they happen
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
    _metadata: Record<string, unknown>
  ): Promise<StreamTextResultType> {
    const plan = createPlanFromAnalysis(userRequest, suggestedTasks);
    this.space.plan = plan;

    const eventQueue: DelegationEvent[] = [];
    let planComplete = false;
    let finalResponse = "";
    let artifacts: string[] = [];
    let executionError: string | null = null;

    // Execute plan in background, collecting events
    const executionPromise = (async () => {
      try {
        const { results, artifacts: a } = await executePlan(
          plan,
          this.space,
          this.getModel({ spaceId }),
          (event) => eventQueue.push(event)
        );
        artifacts = a;
        try {
          finalResponse = await synthesizeResults(
            this.getModel({ spaceId }),
            plan,
            results,
            userRequest
          );
        } catch (synthError) {
          console.error(`[XAgent] synthesizeResults failed:`, synthError);
          finalResponse = `⚠️ Results synthesis failed: ${synthError instanceof Error ? synthError.message : String(synthError)}\n\nTask results are still available above.`;
        }
      } catch (error) {
        console.error(`[XAgent] Plan execution failed:`, error);
        executionError = error instanceof Error ? error.message : String(error);
      }
      planComplete = true;
    })();

    // Stream events via createUIMessageStream
    return {
      text: `## Plan: ${plan.goal}`,
      toUIMessageStreamResponse: async () => {
        const stream = createUIMessageStream({
          async execute({ writer }) {
            const id = "text";
            writer.write({ type: "text-start", id });
            writer.write({
              type: "text-delta",
              id,
              delta: `## Plan: ${plan.goal}\n\n`,
            });

            while (!planComplete || eventQueue.length > 0) {
              if (eventQueue.length > 0) {
                const e = eventQueue.shift()!;
                // Send data part (e already has type: "delegation")
                writer.write({
                  type: `data-delegation`,
                  id: `del-${e.taskId}`,
                  data: e,
                });

                // Send text
                if (e.status === "started") {
                  writer.write({
                    type: "text-delta",
                    id,
                    delta: `🔄 **${e.agentName}** → "${e.taskTitle}"\n`,
                  });
                } else if (e.status === "completed") {
                  // Stream tool calls
                  for (const tc of e.toolCalls || []) {
                    const tcId = tc.toolCallId || `tc-${Date.now()}`;
                    writer.write({
                      type: "data-tool-call",
                      id: tcId,
                      data: {
                        type: "tool-call",
                        toolCallId: tcId,
                        toolName: tc.name,
                        args: tc.args,
                      },
                    });
                    if (tc.result !== undefined) {
                      writer.write({
                        type: "data-tool-result",
                        id: `${tcId}-r`,
                        data: {
                          type: "tool-result",
                          toolCallId: tcId,
                          toolName: tc.name,
                          result: tc.result,
                        },
                      });
                    }
                  }
                  // Stream artifact
                  if (e.artifactId) {
                    writer.write({
                      type: "data-artifact",
                      id: `art-${e.artifactId}`,
                      data: {
                        type: "artifact",
                        artifactId: e.artifactId,
                        title: e.taskTitle,
                      },
                    });
                  }
                  let txt = `✅ **${e.agentName}** completed "${e.taskTitle}"\n`;
                  if (e.result) txt += `\n${e.result}\n`;
                  if (e.toolCalls?.length)
                    txt += `   🔧 ${e.toolCalls.length} tool(s)\n`;
                  if (e.artifactId) txt += `   📄 ${e.artifactId}\n`;
                  writer.write({ type: "text-delta", id, delta: txt + "\n" });
                } else if (e.status === "failed") {
                  writer.write({
                    type: "text-delta",
                    id,
                    delta: `❌ **${e.agentName}** failed: ${e.error}\n\n`,
                  });
                }
              } else {
                await new Promise((r) => setTimeout(r, 100));
              }
            }

            await executionPromise;

            // Show execution error if any
            if (executionError) {
              writer.write({
                type: "text-delta",
                id,
                delta: `\n❌ **Plan Execution Error**\n\n${executionError}\n\n`,
              });
            }

            if (artifacts.length) {
              writer.write({
                type: "text-delta",
                id,
                delta: `\n### Artifacts\n${artifacts.join("\n")}\n\n`,
              });
            }
            if (finalResponse) {
              writer.write({
                type: "text-delta",
                id,
                delta: `### Summary\n\n${finalResponse}`,
              });
            }
            writer.write({ type: "text-end", id });
          },
          onError: (e) => (e instanceof Error ? e.message : "Error"),
        });
        return createUIMessageStreamResponse({ stream });
      },
    } as any as StreamTextResultType;
  }

  // Removed buildOrchestrationResponse - not needed, streaming handles this

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

    const existingMessages = task.history;
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
        task.history.push(formattedMsg as XMessage);
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
    // messageQueue removed
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Add message to queue (soft interrupt)
   */
  addMessage(message: string, _metadata?: Record<string, unknown>): string {
    // Message queue removed, this is now a no-op or direct log
    console.log("[XAgent] addMessage called (queue removed):", message);
    return "queued";
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

    // Validate goal is a non-empty string
    if (!goal || typeof goal !== "string") {
      throw new Error(
        `Invalid goal: must be a non-empty string, got ${typeof goal}`
      );
    }

    // Use provided spaceId or generate one
    const id =
      spaceId ||
      `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Start space (this creates XAgent internally)
    const { startSpace } = await import("../space");
    const space = await startSpace({
      spaceId: id,
      goal,
      name: goal.slice(0, 50) || "New Space",
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
    const adapter = await getServerResourceAdapter();
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
