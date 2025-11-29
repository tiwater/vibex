/**
 * X - Space-Oriented Collaborative Workspace Platform
 *
 * Public API
 */

// Re-export types from @vibex/core
export type {
  // Agent types (runtime)
  AgentConfig,
  AgentContext,
  AgentResponse,

  // Tool types (runtime)
  CoreTool,
  ToolInfo,

  // Message types (runtime)
  ModelMessage,
  XMessage,
  Message,

  // Common types
  XError,
  StreamChunk,
  ModelConfig,
  StorageConfig,
  XConfig,

  // Data types (persistence layer)
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
} from "@vibex/core";

// Runtime - Space subsystem
export * from "./space";
export * from "./space/context";
export * from "./space/message";
export * from "./space/mission";
export * from "./space/plan";
export * from "./space/task";
export * from "./space/artifact";
export * from "./space/state";
export * from "./space/collaboration";

// Runtime - Agent and orchestration subsystem
export * from "./runtime/agent";
export * from "./runtime/registry";
export * from "./runtime/x";
export * from "./runtime/processor";
export * from "./runtime/llm";
export * from "./runtime/tool";
export * from "./runtime/prompts";
export * from "./runtime/factory";

// Core Engine
export * from "./stream";
export * from "./workflow/types";
export * from "./workflow/engine";

// Data layer (part of space subsystem)
export * from "./space/factory";
export * from "./space/storage";
export * from "./space/manager";

// Utilities
export * from "./utils/paths";
export * from "./utils/id";
