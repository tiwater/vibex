/**
 * X React Types
 *
 * Client-side message types optimized for UI rendering.
 * These abstract away the underlying AI SDK implementation.
 *
 * Aligned with AI SDK v6's parts-based message format.
 */

// ============================================================================
// Re-export core types for convenience
// ============================================================================

export type {
  XMessagePart,
  TextPart,
  ToolCallPart,
  ToolResultPart,
  ReasoningPart,
  ArtifactPart,
  PlanUpdatePart,
  FilePart,
  StepStartPart,
  ChatStatus,
} from "@vibex/core";

export {
  getTextFromParts,
  contentToParts,
  normalizeMessage,
  hasPendingApproval,
  getToolCalls,
  getArtifacts,
} from "@vibex/core";

// ============================================================================
// Client-Side Message Types
// ============================================================================

/**
 * UI-specific message part types that extend core parts
 */
export interface UITextPart {
  type: "text";
  text: string;
}

export interface UIToolCallPart {
  type: "tool-call";
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  status?: "pending" | "running" | "completed" | "failed" | "pending-approval";
  /** UI-specific: Display name for the tool */
  displayName?: string;
}

export interface UIToolResultPart {
  type: "tool-result";
  toolCallId: string;
  toolName: string;
  result: unknown;
  isError?: boolean;
  /** UI-specific: Formatted result for display */
  formattedResult?: string;
}

export interface UIArtifactPart {
  type: "artifact";
  artifactId: string;
  title?: string;
  version?: number;
  artifactType?: "document" | "code" | "data" | "image" | "file";
  preview?: string;
  action?: "created" | "updated" | "referenced";
  /** UI-specific: Whether the artifact is expanded in view */
  isExpanded?: boolean;
}

export interface UIReasoningPart {
  type: "reasoning";
  text: string;
  /** UI-specific: Whether reasoning is collapsed */
  isCollapsed?: boolean;
}

/**
 * Union of all UI message part types
 */
export type XChatPart =
  | UITextPart
  | UIToolCallPart
  | UIToolResultPart
  | UIArtifactPart
  | UIReasoningPart;

/**
 * A message in an X chat conversation (client-side)
 *
 * This is the UI-optimized type used by React hooks and components.
 * Supports both legacy `content` and new `parts` format.
 */
export interface XChatMessage {
  /** Unique identifier for the message */
  id: string;

  /** The role of who sent the message */
  role: "user" | "assistant" | "system";

  /**
   * Message parts - structured content (v6 format)
   * Use this for rendering rich content in the UI.
   */
  parts?: XChatPart[];

  /**
   * Text content of the message (convenience accessor)
   * Extracted from parts or legacy content.
   */
  content: string;

  /** When the message was created */
  createdAt?: Date;

  /** Name of the agent that generated this message */
  agentName?: string;

  /** Optional metadata attached to the message */
  metadata?: Record<string, unknown>;
}

/**
 * Options for creating a new message
 */
export interface CreateXMessage {
  /** The role of who sent the message */
  role: "user" | "assistant" | "system";

  /** The text content of the message */
  content: string;

  /** Optional parts for structured content */
  parts?: XChatPart[];

  /** Optional metadata attached to the message */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Chat State Types
// ============================================================================

/**
 * Granular chat status (aligned with AI SDK v6)
 */
export type XChatStatus =
  | "idle" // No activity
  | "submitted" // Request sent, waiting for response
  | "streaming" // Actively receiving response
  | "awaiting-approval" // Tool call needs human approval
  | "error"; // An error occurred

/**
 * Chat state and controls returned by useXChat
 */
export interface XChatState {
  /** The current messages in the conversation */
  messages: XChatMessage[];

  /** The current input value */
  input: string;

  /** Set the input value */
  setInput: (input: string) => void;

  /**
   * Granular status of the chat
   * Replaces legacy `isLoading` boolean
   */
  status: XChatStatus;

  /**
   * Whether a response is currently being generated
   * @deprecated Use `status === "streaming" || status === "submitted"` instead
   */
  isLoading: boolean;

  /** Any error that occurred */
  error?: Error;

  /** Append a new message and trigger a response */
  append: (message: CreateXMessage) => Promise<void>;

  /** Regenerate the last assistant message */
  reload: () => Promise<void>;

  /** Stop the current generation */
  stop: () => void;

  /** Set the messages directly */
  setMessages: (messages: XChatMessage[]) => void;

  /**
   * Approve a pending tool call
   * Only available when status is "awaiting-approval"
   */
  approveToolCall?: (toolCallId: string, approved: boolean) => Promise<void>;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract text content from an XChatMessage
 */
export function getMessageText(message: XChatMessage): string {
  // If parts exist, extract text from them
  if (message.parts && message.parts.length > 0) {
    return message.parts
      .filter((part): part is UITextPart => part.type === "text")
      .map((part) => part.text)
      .join("");
  }
  // Fallback to content field
  return message.content;
}

/**
 * Check if a message has pending tool approvals
 */
export function messageNeedsApproval(message: XChatMessage): boolean {
  if (!message.parts) return false;
  return message.parts.some(
    (part) =>
      part.type === "tool-call" &&
      (part as UIToolCallPart).status === "pending-approval"
  );
}

/**
 * Get all tool calls from a message that need approval
 */
export function getPendingApprovals(message: XChatMessage): UIToolCallPart[] {
  if (!message.parts) return [];
  return message.parts.filter(
    (part): part is UIToolCallPart =>
      part.type === "tool-call" && part.status === "pending-approval"
  );
}

/**
 * Create a simple user message
 */
export function createUserMessage(text: string): CreateXMessage {
  return {
    role: "user",
    content: text,
    parts: [{ type: "text", text }],
  };
}

/**
 * Check if status indicates loading
 */
export function isStatusLoading(status: XChatStatus): boolean {
  return status === "streaming" || status === "submitted";
}
