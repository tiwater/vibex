/**
 * VibeX streamText - Interface Layer
 * Responsibilities: Parameter validation, space bootstrap, delegation to XAgent
 */

import type { LanguageModelUsage } from "ai";
import { startSpace } from "./space";

interface ContentPart {
  type: string;
  text?: string;
  [key: string]: any;
}

export interface StreamTextOptions {
  // Core AI SDK options
  model?: any; // Ignored in VibeX (uses agent configs)
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string | ContentPart[];
    [key: string]: any;
  }>;
  system?: string;

  // VibeX agent selection
  agent: string; // Required - ID of the agent to use

  // Optional parameters
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  seed?: number;
  onFinish?: (result: {
    usage?: LanguageModelUsage;
    finishReason?: string;
    steps?: unknown[];
  }) => void;

  // VibeX-specific
  spaceId?: string;
  data?: Record<string, unknown>;
}

/**
 * Global streamText - Interface Layer Only
 * Validates parameters, bootstraps space, delegates to XAgent
 */
export async function streamText(options: StreamTextOptions): Promise<any> {
  const { agent, messages = [], spaceId, ...restOptions } = options;

  // PHASE 1: Parameter Validation
  console.log(`[VibeX] Interface layer: validating agent parameter`);

  if (!agent) {
    throw new Error("Agent parameter is required");
  }

  // PHASE 2: Space Bootstrap
  console.log("[VibeX] Interface layer: bootstrapping space");

  const space = await startSpace({
    spaceId: spaceId || `vibex-agent-${Date.now()}`,
    goal:
      messages[messages.length - 1]?.content?.toString() ||
      "Process this request",
  });

  // PHASE 3: Delegate to XAgent (single representative)
  console.log("[VibeX] Interface layer: delegating to XAgent");

  const xAgent = space.xAgent;
  if (!xAgent) {
    throw new Error("XAgent not initialized for space");
  }

  const streamResult = await xAgent.streamText({
    messages,
    spaceId: space.spaceId,
    metadata: {
      mode: "agent",
      requestedAgent: agent,
      ...restOptions.data,
    },
    ...restOptions,
  });

  console.log("[VibeX] Interface layer: returning stream result");
  return streamResult;
}
