/**
 * Configuration types for Vibex agents and spaces
 */

// Re-export AgentConfig from @vibex/core
export type { AgentConfig } from "@vibex/core";

/**
 * Space configuration options
 */
export interface SpaceConfig {
  name?: string;
  autoSave?: boolean;
  checkpointInterval?: number;
  [key: string]: unknown; // Allow additional properties
}

/**
 * Space model for persistence
 */
export interface SpaceModel {
  id: string;
  name: string;
  description?: string;
  goal?: string;
  userId?: string;
  config?: SpaceConfig;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
}
