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
export * from "./space/state";

// Runtime - Agent subsystem
export * from "./agent/agent";
export * from "./agent/agent-market";
// export * from "./agent/browser"; // Moved to @vibex/tools
export * from "./agent/provider";
export * from "./agent/tool";
export * from "./agent/prompts";

// Orchestration subsystem
export * from "./agent/xagent";
export * from "./agent/collaboration";
export * from "./agent/stream";
export * from "./agent/processor";
export * from "./workflow/types";
export * from "./workflow/engine";

// Knowledge subsystem (interfaces only - implementations in @vibex/data)

export * from "./types/knowledge";

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
