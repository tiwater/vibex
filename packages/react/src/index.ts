/**
 * X React Integration
 *
 * Main entry point for React components using X
 * Aligned with AI SDK v6's parts-based message format.
 */

// ============================================================================
// Types
// ============================================================================

// Core message types
export type {
  XChatMessage,
  CreateXMessage,
  XChatState,
  XChatStatus,
  // Part types
  XChatPart,
  UITextPart,
  UIToolCallPart,
  UIToolResultPart,
  UIArtifactPart,
  UIReasoningPart,
} from "./types";

// Re-export core types for convenience
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
} from "./types";

// ============================================================================
// Utility Functions
// ============================================================================

export {
  // Message utilities
  getMessageText,
  messageNeedsApproval,
  getPendingApprovals,
  createUserMessage,
  isStatusLoading,
  // Re-exported from core
  getTextFromParts,
  contentToParts,
  normalizeMessage,
  hasPendingApproval,
  getToolCalls,
  getArtifacts,
} from "./types";

// ============================================================================
// Hooks
// ============================================================================

export { useXChat } from "./hooks/chat";
export type { UseXChatOptions } from "./hooks/chat";

// ============================================================================
// Provider
// ============================================================================

export { XProvider } from "./provider";

// ============================================================================
// Error Boundary
// ============================================================================

export * from "./error-boundary";
