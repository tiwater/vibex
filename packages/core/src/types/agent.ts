/**
 * Agent Types - Shared interfaces for agents
 */

/**
 * Agent configuration - defines an agent's identity and capabilities
 */
export interface AgentConfig {
  id?: string;
  name: string;
  description: string;
  provider?: string;
  model?: string;
  llm?: {
    provider: string;
    model: string;
    settings?: {
      temperature?: number;
      maxOutputTokens?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
    };
  };
  systemPrompt?: string;
  tools?: string[];
  personality?: string;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  promptFile?: string;
  [key: string]: unknown;
}

/**
 * Agent context - runtime context passed to agents
 */
export interface AgentContext {
  spaceId: string;
  taskId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Agent response - what an agent returns after processing
 */
export interface AgentResponse {
  text: string;
  toolCalls?: unknown[];
  reasoningText?: string;
  metadata?: Record<string, unknown>;
}



