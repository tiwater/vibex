/**
 * Adapter Factory - Creates appropriate adapters based on configuration
 *
 * This module provides factory functions to get the correct adapter
 * based on environment configuration. It dynamically loads the local
 * adapter package when needed.
 */

import type { ResourceAdapter, StorageAdapter, KnowledgeAdapter } from "@vibex/core";

export type DataMode = "local" | "database" | "auto";

let resourceAdapterInstance: ResourceAdapter | null = null;
let storageAdapterInstance: StorageAdapter | null = null;
let knowledgeAdapterInstance: KnowledgeAdapter | null = null;

/**
 * Detect which mode to use based on environment
 */
function detectMode(): DataMode {
  const explicitMode = process.env.VIBEX_DATA_MODE as DataMode | undefined;
  if (explicitMode === "local" || explicitMode === "database") {
    return explicitMode;
  }
  return "local";
}

/**
 * Get resource adapter for server-side use
 * Uses SQLite for local mode, throws for database mode (use @vibex/supabase)
 */
export function getServerResourceAdapter(): ResourceAdapter {
  if (typeof window !== "undefined") {
    throw new Error("getServerResourceAdapter() can only be called on the server");
  }

  if (resourceAdapterInstance) {
    return resourceAdapterInstance;
  }

  const mode = detectMode();

  if (mode === "database") {
    throw new Error(
      "Database mode requires @vibex/supabase. Install it and provide the adapter explicitly."
    );
  }

  // Dynamic import to avoid bundling @vibex/local in client code
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { LocalResourceAdapter } = require("@vibex/local");
  resourceAdapterInstance = new LocalResourceAdapter();
  return resourceAdapterInstance;
}

/**
 * Get resource adapter (alias for getServerResourceAdapter)
 */
export function getResourceAdapter(): ResourceAdapter {
  return getServerResourceAdapter();
}

/**
 * Get storage adapter for server-side use
 */
export function getStorageAdapter(): StorageAdapter {
  if (typeof window !== "undefined") {
    throw new Error("getStorageAdapter() can only be called on the server");
  }

  if (storageAdapterInstance) {
    return storageAdapterInstance;
  }

  const mode = detectMode();

  if (mode === "database") {
    throw new Error(
      "Database mode requires @vibex/supabase. Install it and provide the adapter explicitly."
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { LocalStorageAdapter } = require("@vibex/local");
  storageAdapterInstance = new LocalStorageAdapter();
  return storageAdapterInstance;
}

/**
 * Get knowledge adapter for server-side use
 */
export function getKnowledgeAdapter(): KnowledgeAdapter {
  if (typeof window !== "undefined") {
    throw new Error("getKnowledgeAdapter() can only be called on the server");
  }

  if (knowledgeAdapterInstance) {
    return knowledgeAdapterInstance;
  }

  const mode = detectMode();

  if (mode === "database") {
    throw new Error(
      "Database mode requires @vibex/supabase. Install it and provide the adapter explicitly."
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { LocalKnowledgeAdapter } = require("@vibex/local");
  knowledgeAdapterInstance = new LocalKnowledgeAdapter();
  return knowledgeAdapterInstance;
}

/**
 * Reset all adapter instances (useful for testing)
 */
export function resetAdapters(): void {
  resourceAdapterInstance = null;
  storageAdapterInstance = null;
  knowledgeAdapterInstance = null;
}

/**
 * Get current data mode
 */
export function getCurrentMode(): DataMode {
  return detectMode();
}

