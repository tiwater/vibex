/**
 * ResourceAdapterFactory - Creates appropriate resource adapter based on configuration
 * Internal to Vibex - external code should use VibexDataManager
 */

import type { ResourceAdapter } from "./adapter";
import { LocalResourceAdapter } from "./adapters/local";
// SupabaseResourceAdapter is NOT imported here - it's imported dynamically in getServerResourceAdapter()
// to avoid bundling server code (next/headers) in client bundle

export type DataMode = "local" | "database" | "auto";

export class ResourceAdapterFactory {
  private static instance: ResourceAdapter | null = null;

  /**
   * Create or get singleton resource adapter instance
   */
  static create(mode?: DataMode): ResourceAdapter {
    if (this.instance) {
      return this.instance;
    }

    const dataMode = mode || this.detectMode();

    if (dataMode === "database") {
      throw new Error(
        "Database adapters are not bundled with @vibex/data. Install @vibex/supabase (or another backend) and provide a custom adapter."
      );
    }

    console.log("[VibexResourceAdapter] Using local mode (SQLite + filesystem)");
    this.instance = new LocalResourceAdapter();

    return this.instance;
  }

  /**
   * Auto-detect which mode to use based on environment
   */
  private static detectMode(): DataMode {
    const explicitMode = process.env.VIBEX_DATA_MODE as DataMode | undefined;
    if (explicitMode === "local" || explicitMode === "database") {
      return explicitMode;
    }

    return "local";
  }

  /**
   * Reset singleton instance (useful for testing)
   */
  static reset(): void {
    this.instance = null;
  }

  /**
   * Get current mode
   */
  static getCurrentMode(): DataMode {
    return this.detectMode();
  }
}

/**
 * Get resource adapter for client-side and general use
 * Internal to Vibex - use VibexDataManager instead
 */
export function getResourceAdapter(): ResourceAdapter {
  return ResourceAdapterFactory.create();
}

/**
 * Get resource adapter for server-side API routes
 * Uses direct Supabase access in database mode (not API calls)
 *
 * NOTE: This function uses server-only imports and should only be called
 * from server-side code (API routes, server components, server actions).
 */
export function getServerResourceAdapter(): ResourceAdapter {
  // Check we're on the server
  if (typeof window !== "undefined") {
    throw new Error("getServerResourceAdapter() can only be called on the server");
  }

  const mode = ResourceAdapterFactory.getCurrentMode();

  if (mode === "database") {
    throw new Error(
      "No database adapter registered. Install a backend package (e.g. @vibex/supabase) and provide its adapter explicitly."
    );
  }

    console.log("[VibexResourceAdapter] Server: Using local mode (file-based)");
    return new LocalResourceAdapter();
}

/**
 * Get knowledge adapter
 */
import type { KnowledgeAdapter } from "./knowledge/adapter";
import { LocalKnowledgeAdapter } from "./knowledge/local-adapter";

export function getKnowledgeAdapter(): KnowledgeAdapter {
  // For now, always return LocalKnowledgeAdapter
  // In future, we can switch based on config/env
  return new LocalKnowledgeAdapter();
}
