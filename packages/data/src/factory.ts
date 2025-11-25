/**
 * DataAdapterFactory - Creates appropriate data adapter based on configuration
 * Internal to Vibex - external code should use VibexDataManager
 */

import type { DataAdapter } from "./adapter";
import { LocalDataAdapter } from "./adapters/local";
// SupabaseDatabaseAdapter is NOT imported here - it's imported dynamically in getServerDataAdapter()
// to avoid bundling server code (next/headers) in client bundle

export type DataMode = "local" | "database" | "auto";

export class DataAdapterFactory {
  private static instance: DataAdapter | null = null;

  /**
   * Create or get singleton data adapter instance
   */
  static create(mode?: DataMode): DataAdapter {
    if (this.instance) {
      return this.instance;
    }

    const dataMode = mode || this.detectMode();

    if (dataMode === "database") {
      throw new Error(
        "Database adapters are not bundled with @vibex/data. Install @vibex/supabase (or another backend) and provide a custom adapter."
      );
    }

    console.log("[VibexDataAdapter] Using local mode (SQLite + filesystem)");
    this.instance = new LocalDataAdapter();

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
 * Get data adapter for client-side and general use
 * Internal to Vibex - use VibexDataManager instead
 */
export function getDataAdapter(): DataAdapter {
  return DataAdapterFactory.create();
}

/**
 * Get data adapter for server-side API routes
 * Uses direct Supabase access in database mode (not API calls)
 *
 * NOTE: This function uses server-only imports and should only be called
 * from server-side code (API routes, server components, server actions).
 */
export function getServerDataAdapter(): DataAdapter {
  // Check we're on the server
  if (typeof window !== "undefined") {
    throw new Error("getServerDataAdapter() can only be called on the server");
  }

  const mode = DataAdapterFactory.getCurrentMode();

  if (mode === "database") {
    throw new Error(
      "No database adapter registered. Install a backend package (e.g. @vibex/supabase) and provide its adapter explicitly."
    );
  }

  console.log("[VibexDataAdapter] Server: Using local mode (file-based)");
  return new LocalDataAdapter();
}
