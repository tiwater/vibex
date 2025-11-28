/**
 * Common Types - Shared utility types
 */

/**
 * X error with code and details
 */
export interface XError extends Error {
  code: string;
  details?: unknown;
}

/**
 * Stream chunk for streaming responses
 */
export interface StreamChunk {
  type: "text" | "tool_call" | "tool_result" | "error" | "done";
  content?: string;
  tool?: {
    name: string;
    args: unknown;
    result?: unknown;
  };
  error?: XError;
}

/**
 * Model configuration
 */
export interface ModelConfig {
  provider: "openai" | "anthropic" | "deepseek" | "openrouter" | "local";
  model: string;
  temperature?: number;
  maxOutputTokens?: number;
}

/**
 * Storage configuration
 */
export interface StorageConfig {
  type: "local" | "supabase";
  basePath?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
}

/**
 * Main X configuration
 */
export interface XConfig {
  storage: StorageConfig;
  model: ModelConfig;
  streaming?: boolean;
  debug?: boolean;
}
