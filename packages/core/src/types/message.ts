/**
 * Message Types - Shared interfaces for messages
 */

/**
 * Model message compatible with AI SDK
 */
export interface ModelMessage {
  role: "system" | "user" | "assistant" | "function" | "data" | "tool";
  content: string | unknown[];
}

/**
 * Vibex message with metadata
 */
export interface VibexMessage {
  role: "system" | "user" | "assistant" | "function" | "data" | "tool";
  content: unknown;
  id?: string;
  metadata?: {
    agentName?: string;
    timestamp?: number;
    [key: string]: unknown;
  };
}

/**
 * Alias for VibexMessage
 */
export type Message = VibexMessage;



