/**
 * @vibex/core - Shared Types
 *
 * This package contains only types and interfaces.
 * No implementations, no runtime code.
 */

// Agent types (runtime)
export type { AgentConfig, AgentContext, AgentResponse } from "./agent";

// Tool types (runtime)
export type { CoreTool, ToolInfo } from "./tool";

// Message types (runtime)
export type {
  // Core message types
  ModelMessage,
  XMessage,
  Message,
  MessageRole,
  ChatStatus,
  // Message part types
  XMessagePart,
  TextPart,
  ToolCallPart,
  ToolResultPart,
  ReasoningPart,
  ArtifactPart,
  PlanUpdatePart,
  FilePart,
  StepStartPart,
} from "./message";

// Message utility functions
export {
  getTextFromParts,
  createTextMessage,
  hasPendingApproval,
  getToolCalls,
  getArtifacts,
  contentToParts,
  normalizeMessage,
} from "./message";

// Common types
export type {
  XError,
  StreamChunk,
  ModelConfig,
  StorageConfig,
  XConfig,
} from "./common";

// Space types (data persistence layer)
export type {
  // Data types
  AgentType,
  ToolType,
  SpaceType,
  ArtifactType,
  ConversationType,
  PlanType,
  PlanSummaryType,
  ModelProviderType,
  DatasetType,
  KnowledgeDocumentType,
  DocumentChunkType,
  ArtifactInfo,
  // Adapter interfaces
  ResourceAdapter,
  StorageAdapter,
  KnowledgeAdapter,
} from "./space";
