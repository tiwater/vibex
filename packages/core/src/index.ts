/**
 * Vibex Core - Public API
 */

// Runtime - Space subsystem
export * from "./space/space";
export * from "./space/context";
export * from "./space/message";
export * from "./space/plan";
export * from "./space/task";
export * from "./space/artifact";
export * from "./space/storage";
export * from "./space/state";

// Runtime - Agent subsystem
export * from "./agent/agent";
export * from "./agent/agent-market";
export * from "./agent/browser";
export * from "./agent/provider";
export * from "./agent/tool";
export * from "./agent/prompts";

// Orchestration subsystem
export * from "./orchestration/xagent";
export * from "./orchestration/collaboration";
export * from "./orchestration/stream-text";
export * from "./orchestration/result-processor";
export * from "./workflow/types";
export * from "./workflow/engine";

// Knowledge subsystem
export * from "./knowledge/knowledge";
export * from "./knowledge/rag";
export * from "./knowledge/rag-embeddings";
export * from "./knowledge/rag-memory-store";

// Config types
export type {
  SpaceConfig,
  SpaceState,
  SpaceModel,
  AgentConfig,
} from "./config";

// Utilities
export * from "./utils/paths";
export * from "./utils/id";
