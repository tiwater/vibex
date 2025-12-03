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
export * from "./types/message";
export * from "./utils/message";
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
export type { XChatMode } from "./runtime/x";
export * from "./runtime/processor";
export * from "./runtime/llm";
export * from "./runtime/tool";
export * from "./runtime/prompts";
export * from "./runtime/factory";
export * from "./runtime/orchestration";

// Workflow Engine
export * from "./stream";
export * from "./workflow/types";
export * from "./workflow/engine";
export * from "./workflow/planner";
export * from "./workflow/executor";
export * from "./workflow/controller";

// Data layer (part of space subsystem)
export * from "./space/factory";
export * from "./space/storage";
export * from "./space/manager";

// Utilities
export * from "./utils/paths";
export * from "./utils/id";

// Re-export AI SDK streaming utilities for xchat route
export { createUIMessageStream, createUIMessageStreamResponse } from "ai";
