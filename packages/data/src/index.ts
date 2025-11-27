/**
 * Vibex Data Management
 *
 * This is the unified data access layer for all Vibex entities.
 * External code should use VibexDataManager, not the internal adapters.
 */

export { getVibexDataManager, getVibexDataManagerServer } from "./manager";
export type { VibexDataManager } from "./manager";

// Core data contracts
export type { ResourceAdapter } from "./adapter";

// Export factory functions for server usage (API routes)
export { getResourceAdapter, getServerResourceAdapter } from "./factory";
export * from "./types";

// Knowledge
export type { KnowledgeAdapter, Dataset, KnowledgeDocument, DocumentChunk } from "./knowledge/adapter";
export { LocalKnowledgeAdapter } from "./knowledge/local-adapter";


// Storage primitives
export { BaseStorage } from "./storage/base";
export type { StorageAdapter, ArtifactInfo } from "./storage/base";
export { SpaceStorage, SpaceStorageFactory } from "./storage/space";
// Export adapter for advanced usage (internal use recommended)
export { LocalStorageAdapter } from "./storage/adapters/local";
