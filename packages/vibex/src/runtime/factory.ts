/**
 * VibeX Agent Factory
 *
 * Creates VibeX agents using AI SDK v6's agent patterns.
 * Provides a declarative way to define agents with built-in
 * tool loops, approval flows, and streaming.
 */

import type { ToolSet } from "ai";
import type { AgentConfig, AgentContext, AgentResponse } from "@vibex/core";
import { Agent } from "./agent";
import { parseModelString } from "./llm";
import { buildToolMap } from "./tool";

// ============================================================================
// Agent Settings Types
// ============================================================================

export interface XAgentSettings {
  /** Agent name/identifier */
  name: string;

  /** Human-readable description */
  description?: string;

  /** Model to use (e.g., "openai:gpt-4o" or "anthropic:claude-3-5-sonnet") */
  model?: string;

  /** System prompt or function to generate it */
  system?: string | ((context: AgentContext) => string);

  /** Tool names to enable for this agent */
  tools?: string[];

  /** Maximum number of tool loop iterations */
  maxLoops?: number;

  /** Automatically continue after tool calls */
  autoToolContinue?: boolean;

  /** Tools that require human approval before execution */
  requireApproval?: string[];

  /** Callback when a tool is called */
  onToolCall?: (toolCall: {
    toolName: string;
    args: Record<string, unknown>;
  }) => void | Promise<void>;

  /** Callback when generation finishes */
  onFinish?: (result: AgentResponse) => void | Promise<void>;

  /** Temperature for generation */
  temperature?: number;

  /** Maximum tokens to generate */
  maxTokens?: number;
}

// ============================================================================
// Agent Factory Result Type
// ============================================================================

export interface XAgentInstance {
  /** Agent name */
  name: string;

  /** Agent description */
  description: string | undefined;

  /** The underlying Agent instance */
  agent: Agent;

  /** Get the system prompt for this agent */
  getSystemPrompt(context?: AgentContext): string;

  /** Get the resolved tools for this agent */
  getTools(): Promise<ToolSet>;

  /** Check if a tool requires approval */
  requiresApproval(toolName: string): boolean;

  /** Convert to AgentConfig for legacy compatibility */
  toAgentConfig(): AgentConfig;
}

// ============================================================================
// Agent Factory
// ============================================================================

/**
 * Create an X agent with AI SDK v6 patterns
 *
 * @example
 * ```typescript
 * const researcher = createAgent({
 *   name: "researcher",
 *   description: "Gathers and analyzes information",
 *   model: "openai:gpt-4o",
 *   tools: ["web_search", "read_file"],
 *   autoToolContinue: true,
 *   requireApproval: ["write_file"],
 * });
 *
 * // Use the underlying agent for streaming
 * const result = await researcher.agent.streamText({
 *   messages: [...],
 *   spaceId: "...",
 * });
 * ```
 */
export function createAgent(settings: XAgentSettings): XAgentInstance {
  const {
    name,
    description,
    model: modelString,
    system,
    tools: toolNames = [],
    maxLoops = 10,
    autoToolContinue = true,
    requireApproval = [],
    onToolCall,
    onFinish,
    temperature,
    maxTokens,
  } = settings;

  // Parse model string (e.g., "openai:gpt-4o" -> { provider: "openai", model: "gpt-4o" })
  const modelConfig = modelString
    ? parseModelString(modelString)
    : { provider: "openai", modelName: "gpt-4o" };

  // Create the agent config
  const agentConfig: AgentConfig = {
    id: name,
    name,
    description: description || `${name} agent`,
    provider: modelConfig.provider,
    model: modelConfig.modelName,
    systemPrompt: typeof system === "string" ? system : undefined,
    tools: toolNames,
    temperature,
    maxOutputTokens: maxTokens,
  };

  // Create the underlying Agent
  const agent = new Agent(agentConfig);

  // Store metadata on the agent for v6 patterns
  const agentMetadata = {
    maxLoops,
    autoToolContinue,
    requireApproval,
    onToolCall,
    onFinish,
  };

  // Attach metadata (for use by orchestration layer)
  (agent as any).__vibexMetadata = agentMetadata;

  // Return the wrapper
  return {
    name,
    description,
    agent,

    getSystemPrompt(context?: AgentContext): string {
      if (typeof system === "function") {
        return context ? system(context) : system({} as AgentContext);
      }
      // Use the systemPrompt from config, or generate a default
      return (
        system ||
        agentConfig.systemPrompt ||
        `You are ${name}. ${description || ""}`
      );
    },

    async getTools(): Promise<ToolSet> {
      // Build tools using existing utility
      return await buildToolMap(toolNames);
    },

    requiresApproval(toolName: string): boolean {
      return requireApproval.includes(toolName);
    },

    toAgentConfig(): AgentConfig {
      return agentConfig;
    },
  };
}

// ============================================================================
// Agent Registry
// ============================================================================

const agentRegistry = new Map<string, XAgentInstance>();

/**
 * Register an agent in the global registry
 */
export function registerAgent(agentInstance: XAgentInstance): void {
  agentRegistry.set(agentInstance.name, agentInstance);
}

/**
 * Get an agent from the registry
 */
export function getAgentFromRegistry(name: string): XAgentInstance | undefined {
  return agentRegistry.get(name);
}

/**
 * List all registered agents
 */
export function listRegisteredAgents(): string[] {
  return Array.from(agentRegistry.keys());
}

/**
 * Clear the agent registry
 */
export function clearAgentRegistry(): void {
  agentRegistry.clear();
}

// ============================================================================
// Preset Agent Factories
// ============================================================================

/**
 * Create the default X (Orchestrator) agent
 */
export function createOrchestratorAgent(
  options?: Partial<XAgentSettings>
): XAgentInstance {
  return createAgent({
    name: "X",
    description:
      "The conversational representative that manages spaces and coordinates with other agents",
    model: options?.model || "openai:gpt-4o",
    tools: ["plan_create", "plan_update", "task_assign", "agent_delegate"],
    autoToolContinue: true,
    system: (context) => `
You are X, the conversational representative for this space.
Space ID: ${context.spaceId || "unknown"}

Your role is to:
1. Understand user goals and create actionable plans
2. Delegate tasks to specialized agents
3. Track progress and adapt plans as needed
4. Maintain context across conversations

Always be helpful, clear, and proactive.
`,
    ...options,
  });
}

/**
 * Create a researcher agent
 */
export function createResearcherAgent(
  options?: Partial<XAgentSettings>
): XAgentInstance {
  return createAgent({
    name: "Researcher",
    description: "Gathers and analyzes information from various sources",
    model: options?.model || "openai:gpt-4o",
    tools: ["web_search", "web_browse", "read_file"],
    autoToolContinue: true,
    system: `
You are a research specialist. Your role is to:
1. Search for relevant information
2. Analyze and synthesize findings
3. Provide well-sourced summaries
4. Identify knowledge gaps

Always cite your sources and be thorough.
`,
    ...options,
  });
}

/**
 * Create a developer agent
 */
export function createDeveloperAgent(
  options?: Partial<XAgentSettings>
): XAgentInstance {
  return createAgent({
    name: "Developer",
    description: "Writes, reviews, and maintains code",
    model: options?.model || "openai:gpt-4o",
    tools: ["read_file", "write_file", "run_command", "code_search"],
    autoToolContinue: true,
    requireApproval: ["run_command", "write_file"], // Require approval for destructive actions
    system: `
You are a software developer. Your role is to:
1. Write clean, maintainable code
2. Review code for issues
3. Debug and fix problems
4. Follow best practices

Always explain your code and consider edge cases.
`,
    ...options,
  });
}

/**
 * Create a writer agent
 */
export function createWriterAgent(
  options?: Partial<XAgentSettings>
): XAgentInstance {
  return createAgent({
    name: "Writer",
    description: "Creates and edits written content",
    model: options?.model || "openai:gpt-4o",
    tools: ["read_file", "write_file", "web_search"],
    autoToolContinue: true,
    system: `
You are a professional writer. Your role is to:
1. Create engaging, well-structured content
2. Edit and improve existing text
3. Adapt tone and style as needed
4. Ensure clarity and accuracy

Always focus on the reader's experience.
`,
    ...options,
  });
}
