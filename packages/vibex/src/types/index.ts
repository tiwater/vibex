/**
 * Types for Vibex
 *
 * Re-exports from @vibex/core plus any vibex-specific types
 */

// Re-export types from @vibex/core
export type {
  // Agent types
  AgentConfig,
  AgentContext,
  AgentResponse,

  // Tool types
  CoreTool,
  ToolInfo,

  // Message types
  ModelMessage,
  VibexMessage,
  Message,

  // Common types
  VibexError,
  StreamChunk,
  ModelConfig,
  StorageConfig,
  VibexConfig,

  // Data types
  SpaceType,
  ArtifactType,
  ConversationType,
  PlanType,
  DatasetType,
  KnowledgeDocumentType,
  DocumentChunkType,

  // Adapter interfaces
  ResourceAdapter,
  StorageAdapter,
  KnowledgeAdapter,
} from "@vibex/core";

// Local types defined in vibex
export type { SpaceConfig, SpaceModel } from "../config";
export type { SpaceState } from "../space";
