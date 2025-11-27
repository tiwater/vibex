/**
 * Types for Vibex
 *
 * Re-exports from @vibex/core plus any vibex-specific types
 */

// Re-export all types from @vibex/core
export type {
  // Agent types
  AgentConfig,
  AgentContext,
  AgentResponse,
  
  // Tool types
  CoreTool,
  ToolInfo,
  
  // Knowledge types
  DocumentChunk,
  VectorStore,
  EmbeddingModel,
  KnowledgeDataManager,
  
  // Space types
  SpaceConfig,
  SpaceModel,
  SpaceState,
  
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
} from "@vibex/core";
