/**
 * Common Types - Shared utility types
 */

/**
 * Vibex error with code and details
 */
export interface VibexError extends Error {
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
  error?: VibexError;
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
 * Main Vibex configuration
 */
export interface VibexConfig {
  storage: StorageConfig;
  model: ModelConfig;
  streaming?: boolean;
  debug?: boolean;
}
