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
export type { ModelMessage, VibexMessage, Message } from "./message";

// Common types
export type {
  VibexError,
  StreamChunk,
  ModelConfig,
  StorageConfig,
  VibexConfig,
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
