/**
 * Tool Types - Shared interfaces for tools
 */

import { z } from "zod";

/**
 * Canonical tool definition that AI SDK-compatible runtimes expect.
 */
export interface ToolDefinition {
  description: string;
  inputSchema: z.ZodSchema | unknown;
  execute: (args: unknown, context?: unknown) => Promise<unknown>;
}

/**
 * Tool metadata for discovery and UI curation.
 */
export interface ToolMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  icon?: string;
  tags?: string[];
  features?: string[];
  tools: string[];
  functions?: unknown[];
  functionDetails?: Array<{
    name: string;
    description: string;
    parameters?: unknown;
    inputSchema?: unknown;
  }>;
  configSchema?: unknown;
  enabled?: boolean;
}

/**
 * @deprecated Use ToolDefinition instead.
 */
export type CoreTool = ToolDefinition;

/**
 * @deprecated Use ToolMetadata instead.
 */
export type ToolInfo = ToolMetadata;

