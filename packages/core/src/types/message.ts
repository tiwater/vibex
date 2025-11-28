/**
 * Message Types - AI SDK v6 Compatible
 *
 * X adopts a parts-based message format aligned with AI SDK v6.
 * This provides structured content types for text, tools, reasoning, and artifacts.
 */

// ============================================================================
// Message Part Types
// ============================================================================

/**
 * Text content part
 */
export interface TextPart {
  type: "text";
  text: string;
}

/**
 * Tool call part - when an agent invokes a tool
 */
export interface ToolCallPart {
  type: "tool-call";
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  status?: "pending" | "running" | "completed" | "failed" | "pending-approval";
}

/**
 * Tool result part - the output from a tool
 */
export interface ToolResultPart {
  type: "tool-result";
  toolCallId: string;
  toolName: string;
  result: unknown;
  isError?: boolean;
}

/**
 * Reasoning part - for chain-of-thought or thinking
 */
export interface ReasoningPart {
  type: "reasoning";
  text: string;
}

/**
 * Artifact reference part - X-specific for document/file references
 */
export interface ArtifactPart {
  type: "artifact";
  artifactId: string;
  title?: string;
  version?: number;
  artifactType?: "document" | "code" | "data" | "image" | "file";
  preview?: string;
  action?: "created" | "updated" | "referenced";
}

/**
 * Plan update part - X-specific for plan/task changes
 */
export interface PlanUpdatePart {
  type: "plan-update";
  planId: string;
  action: "created" | "updated" | "completed" | "failed";
  summary?: string;
  tasksAffected?: string[];
}

/**
 * File part - for file attachments
 */
export interface FilePart {
  type: "file";
  fileId: string;
  filename: string;
  mimeType: string;
  url?: string;
  size?: number;
}

/**
 * Step start part - marks the beginning of a multi-step process
 */
export interface StepStartPart {
  type: "step-start";
  stepId: string;
  stepName: string;
  agentName?: string;
}

/**
 * Union of all message part types
 */
export type XMessagePart =
  | TextPart
  | ToolCallPart
  | ToolResultPart
  | ReasoningPart
  | ArtifactPart
  | PlanUpdatePart
  | FilePart
  | StepStartPart;

// ============================================================================
// Message Types
// ============================================================================

/**
 * Message role types
 */
export type MessageRole = "system" | "user" | "assistant" | "tool";

/**
 * Model message - minimal format for LLM APIs (AI SDK CoreMessage compatible)
 */
export interface ModelMessage {
  role: MessageRole;
  content: string | XMessagePart[];
}

/**
 * X message - full server-side message with metadata and parts
 *
 * This is the canonical message format used throughout X.
 * It supports both legacy `content` and new `parts` format.
 */
export interface XMessage {
  /** Unique message identifier */
  id?: string;

  /** Role of the message sender */
  role: MessageRole;

  /**
   * Message parts - structured content (v6 format)
   * Preferred over `content` for new code.
   */
  parts?: XMessagePart[];

  /**
   * Legacy content field
   * @deprecated Use `parts` instead. Kept for backward compatibility.
   */
  content?: string | unknown[];

  /** Message metadata */
  metadata?: {
    /** Agent that generated this message */
    agentName?: string;
    /** Timestamp when created */
    timestamp?: number;
    /** Space this message belongs to */
    spaceId?: string;
    /** Task/conversation this message belongs to */
    taskId?: string;
    /** Additional metadata */
    [key: string]: unknown;
  };
}

/**
 * Alias for XMessage
 */
export type Message = XMessage;

// ============================================================================
// Message Status Types
// ============================================================================

/**
 * Granular message/chat status
 */
export type ChatStatus =
  | "idle" // No activity
  | "submitted" // Request sent, waiting for response
  | "streaming" // Actively receiving response
  | "awaiting-approval" // Tool call needs human approval
  | "error"; // An error occurred

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract text content from message parts
 */
export function getTextFromParts(parts: XMessagePart[]): string {
  return parts
    .filter((part): part is TextPart => part.type === "text")
    .map((part) => part.text)
    .join("");
}

/**
 * Create a simple text message
 */
export function createTextMessage(
  role: MessageRole,
  text: string,
  metadata?: XMessage["metadata"]
): XMessage {
  return {
    role,
    parts: [{ type: "text", text }],
    metadata,
  };
}

/**
 * Check if message has pending tool approvals
 */
export function hasPendingApproval(message: XMessage): boolean {
  if (!message.parts) return false;
  return message.parts.some(
    (part) => part.type === "tool-call" && part.status === "pending-approval"
  );
}

/**
 * Get all tool calls from a message
 */
export function getToolCalls(message: XMessage): ToolCallPart[] {
  if (!message.parts) return [];
  return message.parts.filter(
    (part): part is ToolCallPart => part.type === "tool-call"
  );
}

/**
 * Get all artifacts from a message
 */
export function getArtifacts(message: XMessage): ArtifactPart[] {
  if (!message.parts) return [];
  return message.parts.filter(
    (part): part is ArtifactPart => part.type === "artifact"
  );
}

/**
 * Convert legacy content to parts format
 */
export function contentToParts(
  content: string | unknown[] | undefined
): XMessagePart[] {
  if (!content) return [];

  if (typeof content === "string") {
    return [{ type: "text", text: content }];
  }

  if (Array.isArray(content)) {
    return content.map((item) => {
      if (typeof item === "string") {
        return { type: "text", text: item } as TextPart;
      }
      if (typeof item === "object" && item !== null && "type" in item) {
        return item as XMessagePart;
      }
      return { type: "text", text: JSON.stringify(item) } as TextPart;
    });
  }

  return [];
}

/**
 * Normalize a message to always have parts
 */
export function normalizeMessage(message: XMessage): XMessage {
  if (message.parts && message.parts.length > 0) {
    return message;
  }

  return {
    ...message,
    parts: contentToParts(message.content),
  };
}
