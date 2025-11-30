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

    // Tool usage instructions - especially important for DeepSeek
    if (this.tools && this.tools.length > 0) {
      segments.push("\nIMPORTANT - TOOL USAGE:");
      segments.push("You have tools available. To use a tool, you MUST:");
      segments.push("1. Use the tool calling mechanism provided by the system");
      segments.push(
        "2. NEVER output tool calls as JSON, XML, code blocks, or plain text"
      );
      segments.push(
        "3. NEVER use XML tags like <function_calls>, <invoke>, <parameter>, or <function_result>"
      );
      segments.push(
        "4. NEVER describe tool calls in your response - the system handles them automatically"
      );
      segments.push("5. The system will automatically handle tool execution");
      segments.push(
        "6. When you need to call a tool, simply invoke it directly through the system's tool calling API - do NOT format it as text"
      );
      segments.push(
        "7. Your response should ONLY contain natural language text for the user - no tool call descriptions"
      );
    }

    // Custom system prompt
    if (this.systemPrompt) {
      segments.push(`\n${this.systemPrompt}`);
    }

    // Context information
    if (context) {
      segments.push("\nCurrent Context:");
      segments.push(`- Space ID: ${context.spaceId}`);
      if (context.taskId) {
        segments.push(`- Task ID: ${context.taskId}`);
      }
      if (context.metadata) {
        // Add artifact context specifically if artifactId is present
        if (context.metadata.artifactId) {
          // Use the path from artifact metadata if available, otherwise construct it
          let fullPath = context.metadata.artifactPath;

          if (!fullPath) {
            // Fallback: construct path if not provided
            fullPath = getVibexPath(
              "spaces",
              context.spaceId,
              "artifacts",
              context.metadata.artifactId
            );
          }

          // Get original filename from metadata
          const displayName =
            context.metadata.artifactName || context.metadata.artifactId;

          // Determine if this is a document that office tools can handle
          const isOfficeDocument = fullPath.match(/\.(docx?|xlsx?|pptx?)$/i);
          const isPdf = fullPath.match(/\.pdf$/i);
          const isImage = fullPath.match(/\.(png|jpe?g|gif|bmp|svg)$/i);

          if (isOfficeDocument) {
            segments.push(`\nCURRENT DOCUMENT:`);
            segments.push(
              `You have an active Office document that the user has already uploaded and selected.`
            );
            segments.push(`Document filepath: "${fullPath}"`);
            segments.push(
              `(This is the complete path you need to use when calling document tools)`
            );
            segments.push(
              `To read or process this document, use your available tools with filepath: ${fullPath}`
            );
            segments.push(
              `The user expects you to work directly with this document - do not ask them to upload it again.`
            );
          } else {
            segments.push(`\nCURRENT FILE:`);
            segments.push(
              `You have an active file that the user has already uploaded and selected.`
            );
            segments.push(`File: "${displayName}" (${fullPath})`);
            if (isPdf) {
              segments.push(
                `This is a PDF file. Use appropriate PDF processing tools if available.`
              );
            } else if (isImage) {
              segments.push(
                `This is an image file. You can reference it in your responses or use image processing tools if available.`
              );
            } else {
              segments.push(
                `This is a ${
                  fullPath.split(".").pop()?.toUpperCase() || "unknown"
                } file.`
              );
            }
            segments.push(
              `The user expects you to work with this file directly when relevant to their request.`
            );
          }
        }
        // Add other metadata (skip artifact-related fields to avoid confusion)
        const artifactFields = ["artifactId", "artifactName", "artifactPath"];
        for (const [key, value] of Object.entries(context.metadata)) {
          if (!artifactFields.includes(key)) {
            // Skip all artifact-related fields
            segments.push(`- ${key}: ${value}`);
          }
        }
      }
    }

    // Add current date and time context
    const now = new Date();
    segments.push("\nDate/Time Information:");
    segments.push(`- Current Date: ${now.toISOString().split("T")[0]}`);
    segments.push(`- Current Time: ${now.toTimeString().split(" ")[0]}`);
    segments.push(
      `- Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`
    );

    return segments.join("\n");
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
      try {
        const configuredTools = await buildToolMap(this.tools, context);
        if (configuredTools) {
          Object.assign(toolsMap, configuredTools);
        }
      } catch (error) {
        console.error(`Failed to load tools for agent ${this.name}:`, error);
      }
    }

    return Object.keys(toolsMap).length > 0 ? toolsMap : undefined;
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
    const model = modelOverride || this.getModel({ spaceId, userId: enrichedMetadata.userId });
    const tools = await this.getTools({ spaceId });

    // Generate a message ID that includes the agent name
    const agentPrefix = this.name.toLowerCase().replace(/\s+/g, "-");

    // Convert XMessage[] to ModelMessage[] ONLY here, right before AI SDK call
    // CRITICAL: Preserve tool-call and tool-result parts - don't strip them!
    const modelMessages: any[] = vibexMessages
      .filter((m) => {
        // Keep tool messages if they have proper structure
        // Skip standalone tool messages without proper tool-call context
        if (m.role === "tool") {
          // Only skip if it's a malformed tool message
          return false;
        }
        return true;
      })
      .map((m) => {
        // Preserve the content structure - AI SDK v6 supports parts arrays
        let content: any = m.content;

        // If content is an array, preserve all parts (text, tool-call, tool-result, etc.)
        if (Array.isArray(m.content)) {
          // Convert to AI SDK format while preserving structure
          const parts = m.content.map((part: any) => {
            if (part.type === "text") {
              return { type: "text", text: part.text || "" };
            } else if (part.type === "tool-call") {
              return {
                type: "tool-call",
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                args: part.args || {},
              };
            } else if (part.type === "tool-result") {
              return {
                type: "tool-result",
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                result: part.result,
              };
            }
            // For other part types, try to preserve them
            return part;
          });

          // If we have parts, use them; otherwise fall back to string
          if (parts.length > 0) {
            content = parts;
          } else {
            content = "";
          }
        } else if (typeof m.content === "string") {
          // String content is fine as-is
          content = m.content;
        } else {
          // Unknown format, try to convert to string
          content = String(m.content || "");
        }

        return {
          role: m.role as "system" | "user" | "assistant" | "tool",
          content,
        };
      })
      .filter((m) => {
        // Only filter out messages with completely empty content
        if (typeof m.content === "string") {
          return m.content.trim().length > 0;
        }
        if (Array.isArray(m.content)) {
          return m.content.length > 0;
        }
        return !!m.content;
      });

    // Pass through to AI SDK's streamText with agent defaults
    const result = streamText({
      model,
      system: systemPrompt,
      messages: modelMessages as any,
      tools,
      toolChoice: "auto", // Explicitly set tool choice mode
      // stopWhen removed - stepCountIs not available in this AI SDK version
      temperature: this.temperature,
      maxOutputTokens: this.maxOutputTokens,
      topP: this.topP,
      frequencyPenalty: this.frequencyPenalty,
      presencePenalty: this.presencePenalty,
      maxRetries: 3,
      // Add callback to monitor tool calls
      onStepFinish: ({ text, toolCalls, toolResults, finishReason }) => {
        console.log(`[${this.name}] Step finished:`, {
          finishReason,
          hasText: !!text,
          toolCallsCount: toolCalls?.length || 0,
          toolResultsCount: toolResults?.length || 0,
        });

        if (toolCalls && toolCalls.length > 0) {
          toolCalls.forEach((toolCall) => {
            const toolCallAny = toolCall as any;
            console.log(`[${this.name}] Tool Call:`, {
              toolName: toolCall.toolName,
              input: toolCallAny.input,
              // Focus on filepath-related arguments
              hasFilePath:
                toolCallAny.input &&
                typeof toolCallAny.input === "object" &&
                ("filepath" in toolCallAny.input ||
                  "file_path" in toolCallAny.input ||
                  "path" in toolCallAny.input),
              pathValues:
                (toolCall as any).input &&
                typeof (toolCall as any).input === "object"
                  ? Object.entries((toolCall as any).input)
                      .filter(
                        ([key]) =>
                          key.toLowerCase().includes("path") ||
                          key.toLowerCase().includes("file")
                      )
                      .reduce(
                        (acc, [key, value]) => ({ ...acc, [key]: value }),
                        {}
                      )
                  : {},
            });
          });
        }

        if (toolResults && toolResults.length > 0) {
          toolResults.forEach((result, index) => {
            const resultAny = result as any;
            console.log(`[${this.name}] Tool Result [${index}]:`, {
              toolName: result.toolName,
              hasOutput: resultAny.output !== undefined,
              output: resultAny.output,
              providerExecuted: resultAny.providerExecuted,
            });
          });
        }
      },
      // Override with any provided options
      ...aiSdkOptions,
      // Use experimental_generateMessageId to include agent name in message ID
      // @ts-ignore - experimental feature may not be in types yet
      experimental_generateMessageId: () => {
        return `${agentPrefix}_${generateShortId()}`;
      },
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
    const model = modelOverride || this.getModel({ spaceId, userId: enrichedMetadata.userId });
    const tools = await this.getTools({ spaceId });

    // Convert XMessage[] to ModelMessage[] ONLY here, right before AI SDK call
    const modelMessages: ModelMessage[] = vibexMessages
      .filter((m) => m.role !== "tool") // Skip tool messages
      .map((m) => ({
        role: m.role as "system" | "user" | "assistant",
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

    // Convert XMessage[] to ModelMessage[]
    const modelMessages: ModelMessage[] = vibexMessages
      .filter((m) => m.role !== "tool") // Skip tool messages
      .map((m) => ({
        role: m.role as "system" | "user" | "assistant",
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
