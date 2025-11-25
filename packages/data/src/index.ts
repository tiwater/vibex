/**
 * Vibex Data Management
 *
 * This is the unified data access layer for all Vibex entities.
 * External code should use VibexDataManager, not the internal adapters.
 */

export { getVibexDataManager, getVibexDataManagerServer } from "./manager";
export type { VibexDataManager } from "./manager";

// Core data contracts
export type { DataAdapter } from "./adapter";

// Export factory functions for server usage (API routes)
export { getDataAdapter, getServerDataAdapter } from "./factory";
export * from "./types";

// Storage primitives
export { BaseStorage } from "./storage/base";
export type { StorageAdapter, ArtifactInfo } from "./storage/base";
export { SpaceStorage, SpaceStorageFactory } from "./storage/space";
// Export adapter for advanced usage (internal use recommended)
export { LocalStorageAdapter } from "./storage/adapters/local";
