/**
 * Adapter Factory - Creates appropriate adapters based on configuration
 *
 * This module provides factory functions to get the correct adapter
 * based on environment configuration. It dynamically loads the local
 * adapter package when needed.
 */

import type { ResourceAdapter, StorageAdapter, KnowledgeAdapter } from "@vibex/core";

export type DataMode = "local" | "database" | "auto";

const globalForAdapters = globalThis as unknown as {
  resourceAdapterInstance: ResourceAdapter | null;
  storageAdapterInstance: StorageAdapter | null;
  knowledgeAdapterInstance: KnowledgeAdapter | null;
};

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
export async function getServerResourceAdapter(): Promise<ResourceAdapter> {
  if (typeof window !== "undefined") {
    throw new Error("getServerResourceAdapter() can only be called on the server");
  }

  if (globalForAdapters.resourceAdapterInstance) {
    return globalForAdapters.resourceAdapterInstance;
  }

  const mode = detectMode();

  if (mode === "database") {
    throw new Error(
      "Database mode requires @vibex/supabase. Install it and provide the adapter explicitly."
    );
  }

  // Dynamic import to avoid bundling @vibex/local in client code
  const { LocalResourceAdapter } = await import("@vibex/local");
  const adapter = new LocalResourceAdapter();
  globalForAdapters.resourceAdapterInstance = adapter;
  return adapter;
}

/**
 * Get resource adapter (alias for getServerResourceAdapter)
 */
export async function getResourceAdapter(): Promise<ResourceAdapter> {
  return getServerResourceAdapter();
}

/**
 * Get storage adapter for server-side use
 */
export async function getStorageAdapter(): Promise<StorageAdapter> {
  if (typeof window !== "undefined") {
    throw new Error("getStorageAdapter() can only be called on the server");
  }

  if (globalForAdapters.storageAdapterInstance) {
    return globalForAdapters.storageAdapterInstance;
  }

  const mode = detectMode();

  if (mode === "database") {
    throw new Error(
      "Database mode requires @vibex/supabase. Install it and provide the adapter explicitly."
    );
  }

  const { LocalStorageAdapter } = await import("@vibex/local");
  const adapter = new LocalStorageAdapter();
  globalForAdapters.storageAdapterInstance = adapter;
  return adapter;
}

/**
 * Get knowledge adapter for server-side use
 */
export async function getKnowledgeAdapter(): Promise<KnowledgeAdapter> {
  if (typeof window !== "undefined") {
    throw new Error("getKnowledgeAdapter() can only be called on the server");
  }

  if (globalForAdapters.knowledgeAdapterInstance) {
    return globalForAdapters.knowledgeAdapterInstance;
  }

  const mode = detectMode();

  if (mode === "database") {
    throw new Error(
      "Database mode requires @vibex/supabase. Install it and provide the adapter explicitly."
    );
  }

  const { LocalKnowledgeAdapter } = await import("@vibex/local");
  const adapter = new LocalKnowledgeAdapter();
  globalForAdapters.knowledgeAdapterInstance = adapter;
  return adapter;
}

/**
 * Reset all adapter instances (useful for testing)
 */
export function resetAdapters(): void {
  globalForAdapters.resourceAdapterInstance = null;
  globalForAdapters.storageAdapterInstance = null;
  globalForAdapters.knowledgeAdapterInstance = null;
}

/**
 * Get current data mode
 */
export function getCurrentMode(): DataMode {
  return detectMode();
}

