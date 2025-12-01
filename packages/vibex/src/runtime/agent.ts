/**
 * Agent - Config-driven agent implementation
 *
 * Agents are defined entirely by configuration, not code.
 * Each agent is instantiated from a config object that defines
 * its role, tools, and LLM settings.
 */

import { generateText, streamText, generateObject } from "ai";
import type { LanguageModel } from "ai";
import type { ModelMessage } from "../space/message";
import { getVibexPath } from "../utils/paths";
import { AgentConfig } from "../config";
import { ConversationHistory, XMessage } from "../space/message";
import { getModelProvider } from "./llm";
import { buildToolMap } from "./tool";
import { generateShortId } from "../utils/id";
import { z } from "zod";

export interface AgentContext {
  spaceId: string;
  taskId?: string;
  conversationHistory: ConversationHistory;
  metadata?: Record<string, any>;
}

export interface AgentResponse {
  text: string;
  toolCalls?: any[];
  reasoningText?: string;
  metadata?: Record<string, any>;
}

/**
 * Config-driven Agent implementation
 * No subclasses needed - behavior is entirely config-driven
 */
export class Agent {
  public id: string; // Agent ID (filename without extension)
  public name: string; // Display name
  public description: string;
  public config: AgentConfig; // Store the original config

  // LLM configuration
  public provider: string;
  public model: string;
  public temperature?: number;
  public maxOutputTokens?: number;
  public topP?: number;
  public frequencyPenalty?: number;
  public presencePenalty?: number;
  public systemPrompt?: string;

  // Agent configuration
  public tools: string[];
  public personality?: string;

  constructor(config: AgentConfig) {
    this.config = config; // Store the original config
    this.id = config.id || config.name; // Use ID if provided, otherwise fallback to name
    this.name = config.name;
    this.description = config.description;

    // LLM settings - handle llm or inline config
    if (config.llm) {
      // New llm config format
      this.provider = config.llm.provider;
      this.model = config.llm.model;
      this.temperature = config.llm.settings?.temperature;
      this.maxOutputTokens = config.llm.settings?.maxOutputTokens;
      this.topP = config.llm.settings?.topP;
      this.frequencyPenalty = config.llm.settings?.frequencyPenalty;
      this.presencePenalty = config.llm.settings?.presencePenalty;
      this.systemPrompt = config.systemPrompt;
    } else {
      // Inline config
      this.provider = config.provider!;
      this.model = config.model!;
      this.temperature = config.temperature;
      this.maxOutputTokens = config.maxOutputTokens;
      this.topP = config.topP;
      this.frequencyPenalty = config.frequencyPenalty;
      this.presencePenalty = config.presencePenalty;
      this.systemPrompt = config.systemPrompt;
    }

    // Validate that 'vibex' is never used as a provider
    // VibeX is a team orchestration system, not an AI provider
    if (this.provider === "vibex" || this.provider?.startsWith("vibex-")) {
      throw new Error(
        `Invalid provider '${this.provider}' for agent '${this.name}'. ` +
          `'vibex' is a team orchestration system, not an AI provider. ` +
          `Use 'openai', 'anthropic', 'deepseek', etc. as providers.`
      );
    }

    // Configuration
    this.tools = config.tools || [];
    this.personality = config.personality;

    // Custom tools registered dynamically (for agent subclasses)
    this.customTools = new Map();
  }

  // Custom tools map for dynamically registered tools
  protected customTools: Map<string, any>;

  /**
   * Register a custom tool (for agent subclasses)
   */
  protected registerTool(name: string, tool: any): void {
    this.customTools.set(name, tool);
  }

  /**
   * Get the system prompt for this agent
   */
  protected getSystemPrompt(context?: AgentContext): string {
    const segments: string[] = [];

    // Base identity
    segments.push(`You are ${this.name}.`);
    segments.push(this.description);

    // Personality
    if (this.personality) {
      segments.push(`\nPersonality: ${this.personality}`);
    }

    // Custom system prompt
    if (this.systemPrompt) {
      segments.push(`\n${this.systemPrompt}`);
    }

    // Context information
    if (context) {
      if (context.spaceId) {
        segments.push(`\nSpace ID: ${context.spaceId}`);
      }
      if (context.taskId) {
        segments.push(`Task ID: ${context.taskId}`);
      }
      if (context.metadata?.artifactId) {
        const path =
          context.metadata.artifactPath ||
          getVibexPath(
            "spaces",
            context.spaceId,
            "artifacts",
            context.metadata.artifactId
          );
        segments.push(`\nActive file: ${path}`);
      }
    }

    return segments.join("\n");
  }

  /**
   * Convert XMessage[] to ModelMessage[] - extract text content only
   * AI SDK handles tool calls automatically when tools are provided
   */
  private convertMessages(messages: XMessage[]): ModelMessage[] {
    return messages
      .filter((m) => m.role !== "tool") // Skip tool role messages
      .map((m) => {
        let content: string = "";

        if (typeof m.content === "string") {
          content = m.content;
        } else if (Array.isArray(m.content)) {
          // Extract text parts only - AI SDK handles tool calls
          const textParts = m.content
            .filter((part: any) => part.type === "text")
            .map((part: any) => part.text || "")
            .filter((text: string) => text.length > 0);
          content = textParts.join("\n");
        } else {
          content = String(m.content || "");
        }

        return {
          role: m.role as "system" | "user" | "assistant",
          content,
        };
      })
      .filter((m) => m.content.trim().length > 0);
  }

  /**
   * Get the model provider for this agent
   */
  public getModel(context?: {
    spaceId?: string;
    userId?: string;
  }): LanguageModel {
    const modelProvider = getModelProvider({
      provider: this.provider as any,
      modelName: this.model,
      spaceId: context?.spaceId,
      userId: context?.userId,
    });

    // All providers (OpenAI, Anthropic, DeepSeek) are functions
    // that need to be called with the model name
    return (modelProvider as any)(this.model) as LanguageModel;
  }

  /**
   * Get tools available to this agent
   */
  protected async getTools(context?: { spaceId?: string }): Promise<any> {
    const toolsMap: Record<string, any> = {};

    // Add custom tools first (dynamically registered)
    for (const [name, tool] of this.customTools.entries()) {
      toolsMap[name] = tool;
    }

    // Add configured tools (from config)
    if (this.tools && this.tools.length > 0) {
      console.log(
        `[Agent:${this.name}] Loading ${this.tools.length} configured tools:`,
        this.tools
      );
      try {
        const configuredTools = await buildToolMap(this.tools, context);
        if (configuredTools) {
          Object.assign(toolsMap, configuredTools);
          console.log(
            `[Agent:${this.name}] Loaded tools:`,
            Object.keys(configuredTools)
          );
        } else {
          console.warn(
            `[Agent:${this.name}] buildToolMap returned null/undefined`
          );
        }
      } catch (error) {
        console.error(`[Agent:${this.name}] Failed to load tools:`, error);
      }
    } else {
      console.log(
        `[Agent:${this.name}] No tools configured (this.tools=${JSON.stringify(this.tools)})`
      );
    }

    const toolCount = Object.keys(toolsMap).length;
    console.log(`[Agent:${this.name}] Final tool count: ${toolCount}`);
    return toolCount > 0 ? toolsMap : undefined;
  }

  /**
   * Prepare debug info without actually calling streamText
   * Returns all the parameters that would be sent to the LLM
   */
  async prepareDebugInfo(options: {
    messages: XMessage[];
    system?: string;
    spaceId?: string;
    metadata?: Record<string, any>;
  }): Promise<{
    systemPrompt: string;
    tools: any;
    model: any;
    agentInfo: any;
    messages: any[];
  }> {
    const { messages: vibexMessages, system, spaceId, metadata } = options;

    // Extract metadata from messages for context enrichment
    let enrichedMetadata = metadata || {};

    // Find the last user message to extract any document context or other metadata
    const lastUserMsg = vibexMessages.filter((m) => m.role === "user").pop();
    if (lastUserMsg?.metadata) {
      enrichedMetadata = { ...lastUserMsg.metadata, ...metadata };
    }

    // Build context for system prompt generation using XMessages
    const context: AgentContext = {
      spaceId: spaceId || "default",
      conversationHistory: new ConversationHistory(),
      metadata: enrichedMetadata,
    };

    // Use agent-specific prompt and append any extra system context
    const basePrompt = this.getSystemPrompt(context);
    const systemPrompt = system ? `${basePrompt}\n\n${system}` : basePrompt;
    const tools = await this.getTools({ spaceId });

    // Convert messages for display
    const modelMessages: any[] = vibexMessages
      .filter((m) => m.role !== "tool")
      .map((m) => ({
        role: m.role,
        content:
          typeof m.content === "string"
            ? m.content
            : Array.isArray(m.content)
              ? (m.content as Array<{ type: string; text?: string }>)
                  .filter((p) => p.type === "text" && p.text)
                  .map((p) => p.text as string)
                  .join("\n")
              : "",
      }))
      .filter((m) => m.content);

    return {
      systemPrompt,
      tools: Object.entries(tools || {}).map(([id, tool]) => ({
        id,
        name: (tool as any).name || id,
        description: (tool as any).description,
        functions: Object.keys((tool as any).functions || {}),
      })),
      model: {
        provider:
          this.config.llm?.provider || this.config.provider || "unknown",
        model: this.config.llm?.model || this.config.model || "unknown",
        settings: {
          temperature: this.temperature,
          maxOutputTokens: this.maxOutputTokens,
          topP: this.topP,
          frequencyPenalty: this.frequencyPenalty,
          presencePenalty: this.presencePenalty,
        },
      },
      agentInfo: {
        id: this.id,
        name: this.name,
        description: this.description,
        personality: this.personality,
      },
      messages: modelMessages,
    };
  }

  /**
   * Stream text - works with XMessage[] internally
   * Converts to ModelMessage[] only when calling AI SDK
   */
  async streamText(options: {
    messages: XMessage[];
    system?: string;
    spaceId?: string;
    metadata?: Record<string, any>;
    model?: LanguageModel; // Optional model override
    [key: string]: any; // Allow all other AI SDK options to pass through
  }): Promise<any> {
    // Extract context-specific options
    const {
      messages: vibexMessages,
      system,
      spaceId,
      metadata,
      model: modelOverride,
      ...aiSdkOptions
    } = options;

    // Extract metadata from messages for context enrichment
    let enrichedMetadata = metadata || {};

    // Find the last user message to extract any document context or other metadata
    const lastUserMsg = vibexMessages.filter((m) => m.role === "user").pop();
    if (lastUserMsg?.metadata) {
      enrichedMetadata = { ...lastUserMsg.metadata, ...metadata };
    }

    // Build context for system prompt generation using XMessages
    const context: AgentContext = {
      spaceId: spaceId || "default",
      conversationHistory: new ConversationHistory(),
      metadata: enrichedMetadata,
    };

    // Use agent-specific prompt and append any extra system context
    const basePrompt = this.getSystemPrompt(context);
    const systemPrompt = system ? `${basePrompt}\n\n${system}` : basePrompt;

    // Use override model if provided, otherwise use agent's configured model
    const model =
      modelOverride ||
      this.getModel({ spaceId, userId: enrichedMetadata.userId });
    const tools = await this.getTools({ spaceId });

    // Convert messages and call AI SDK
    const modelMessages = this.convertMessages(vibexMessages);
    const agentPrefix = this.name.toLowerCase().replace(/\s+/g, "-");

    // Diagnostic: Log what we're sending to AI SDK
    console.log(`[Agent:${this.name}] Calling streamText:`, {
      hasTools: !!tools,
      toolNames: tools ? Object.keys(tools) : [],
      toolChoice: "auto",
      messageCount: modelMessages.length,
      lastMessage: modelMessages[modelMessages.length - 1]?.content?.slice(
        0,
        100
      ),
    });

    const result = streamText({
      model,
      system: systemPrompt,
      messages: modelMessages as any,
      tools,
      toolChoice: "auto",
      temperature: this.temperature,
      maxOutputTokens: this.maxOutputTokens,
      topP: this.topP,
      frequencyPenalty: this.frequencyPenalty,
      presencePenalty: this.presencePenalty,
      maxRetries: 3,
      ...aiSdkOptions,
      // @ts-ignore - experimental feature
      experimental_generateMessageId: () =>
        `${agentPrefix}_${generateShortId()}`,
    });

    // Attach agent metadata to the result for immediate access
    (result as any).agentMetadata = {
      name: this.name,
    };

    return result;
  }

  /**
   * Generate text - works with XMessage[] internally
   * Converts to ModelMessage[] only when calling AI SDK
   */
  async generateText(options: {
    messages: XMessage[];
    system?: string;
    spaceId?: string;
    metadata?: Record<string, any>;
    model?: LanguageModel; // Optional model override
    [key: string]: any;
  }): Promise<any> {
    const {
      messages: vibexMessages,
      system,
      spaceId,
      metadata,
      model: modelOverride,
      ...aiSdkOptions
    } = options;

    // Extract metadata from messages for context enrichment
    let enrichedMetadata = metadata || {};

    // Find the last user message to extract any document context or other metadata
    const lastUserMsg = vibexMessages.filter((m) => m.role === "user").pop();
    if (lastUserMsg?.metadata) {
      enrichedMetadata = { ...lastUserMsg.metadata, ...metadata };
    }

    // Build context for system prompt generation
    const context: AgentContext = {
      spaceId: spaceId || "default",
      conversationHistory: new ConversationHistory(),
      metadata: enrichedMetadata,
    };

    // Use agent-specific prompt and append any extra system context
    const basePrompt = this.getSystemPrompt(context);
    const systemPrompt = system ? `${basePrompt}\n\n${system}` : basePrompt;

    // Use override model if provided, otherwise use agent's configured model
    const model =
      modelOverride ||
      this.getModel({ spaceId, userId: enrichedMetadata.userId });
    const tools = await this.getTools({ spaceId });

    const modelMessages = this.convertMessages(vibexMessages);

    // Pass through to AI SDK's generateText with proper options
    return generateText({
      model,
      system: systemPrompt,
      messages: modelMessages as any,
      tools,
      temperature: this.temperature,
      maxRetries: 3,
      ...aiSdkOptions,
      // Add model-specific options if they exist
      ...(this.maxOutputTokens && { maxSteps: 5 }), // generateText uses maxSteps not maxTokens
      ...(this.topP && { topP: this.topP }),
      ...(this.frequencyPenalty && { frequencyPenalty: this.frequencyPenalty }),
      ...(this.presencePenalty && { presencePenalty: this.presencePenalty }),
    });
  }

  /**
   * Generate structured object
   */
  async generateObject(options: {
    messages: XMessage[];
    schema: z.ZodSchema<any>;
    system?: string;
    spaceId?: string;
    metadata?: Record<string, any>;
    [key: string]: any;
  }): Promise<any> {
    const {
      messages: vibexMessages,
      schema,
      system,
      spaceId,
      metadata,
      ...aiSdkOptions
    } = options;

    // Extract metadata from messages for context enrichment
    let enrichedMetadata = metadata || {};

    // Find the last user message to extract any document context or other metadata
    const lastUserMsg = vibexMessages.filter((m) => m.role === "user").pop();
    if (lastUserMsg?.metadata) {
      enrichedMetadata = { ...lastUserMsg.metadata, ...metadata };
    }

    // Build context for system prompt generation
    const context: AgentContext = {
      spaceId: spaceId || "default",
      conversationHistory: new ConversationHistory(),
      metadata: enrichedMetadata,
    };

    // Use agent-specific prompt and append any extra system context
    const basePrompt = this.getSystemPrompt(context);
    const systemPrompt = system ? `${basePrompt}\n\n${system}` : basePrompt;

    const model = this.getModel({ spaceId, userId: enrichedMetadata.userId });

    const modelMessages = this.convertMessages(vibexMessages);

    return generateObject({
      model,
      schema,
      system: systemPrompt,
      messages: modelMessages as any,
      mode: "json",
      temperature: this.temperature,
      maxRetries: 3,
      ...aiSdkOptions,
    });
  }

  /**
   * Get agent summary
   */
  getSummary(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      tools: this.tools,
      llmModel: `${this.provider}/${this.model}`,
    };
  }
}
