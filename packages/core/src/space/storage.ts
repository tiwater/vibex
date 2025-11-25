/**
 * Core Storage Bridge
 * Simple bridge to storage implementations
 * NO business logic here - just storage access
 *
 * Storage paths are logical prefixes, not filesystem paths.
 * The adapter implementation determines how paths are interpreted:
 * - LocalStorageAdapter: treats paths as filesystem paths
 * - SupabaseStorageAdapter: treats paths as storage bucket keys/prefixes
 */

import { BaseStorage, StorageAdapter } from "@vibex/data";
// LocalStorageAdapter is imported dynamically to avoid bundling Node.js fs module in client

/**
 * Storage factory and manager
 * Creates appropriate storage instances for different purposes
 */
export class Storage {
  private static adapter: StorageAdapter;
  private static rootPrefix: string;

  /**
   * Initialize storage system
   * @param adapter - Storage adapter (local filesystem, Supabase, etc.)
   * @param rootPrefix - Logical root prefix for all storage operations (not a filesystem path)
   */
  static async initialize(adapter?: StorageAdapter, rootPrefix?: string) {
    if (adapter) {
      this.adapter = adapter;
    } else {
      // Only create LocalStorageAdapter on server
      if (typeof window === "undefined") {
        // Dynamic import to avoid bundling fs in client
        const dataModule = await import("@vibex/data");
        const LocalStorageAdapter = (dataModule as any).LocalStorageAdapter;
        this.adapter = new LocalStorageAdapter();
      } else {
        throw new Error(
          "LocalStorageAdapter cannot be used in client code. Provide a client-compatible adapter."
        );
      }
    }
    // rootPrefix is a logical prefix, not a filesystem path
    // For local storage, this might be a filesystem path, but for cloud storage it's just a key prefix
    this.rootPrefix = rootPrefix || "";
  }

  /**
   * Get storage adapter
   */
  static async getAdapter(): Promise<StorageAdapter> {
    if (!this.adapter) {
      await this.initialize();
    }
    return this.adapter!;
  }

  /**
   * Get root prefix (logical, not filesystem path)
   */
  static async getRootPrefix(): Promise<string> {
    if (this.rootPrefix === undefined) {
      await this.initialize();
    }
    return this.rootPrefix || "";
  }

  /**
   * Create a storage instance for a specific logical path prefix
   * @param subPath - Logical sub-path prefix (e.g., "config", "spaces/spaceId")
   */
  static async create(subPath: string = ""): Promise<BaseStorage> {
    const rootPrefix = await this.getRootPrefix();
    const adapter = await this.getAdapter();

    // Combine root prefix with sub-path as logical path segments
    // The adapter will interpret this correctly (filesystem path vs storage key)
    const logicalPath = rootPrefix
      ? subPath
        ? `${rootPrefix}/${subPath}`
        : rootPrefix
      : subPath;

    return new BaseStorage(logicalPath, adapter);
  }

  /**
   * Get root storage (for top-level directories like agents)
   */
  static async getRootStorage(): Promise<BaseStorage> {
    return this.create("");
  }

  /**
   * Get config storage (for all configuration files)
   */
  static async getConfigStorage(): Promise<BaseStorage> {
    return this.create("config");
  }

  /**
   * Get defaults storage (for default templates, agents, etc.)
   */
  static async getDefaultsStorage(): Promise<BaseStorage> {
    return this.create("defaults");
  }

  /**
   * @deprecated Use getDefaultsStorage() instead
   */
  static async getHubStorage(): Promise<BaseStorage> {
    return this.getDefaultsStorage();
  }

  /**
   * Get space storage (for space-specific files)
   */
  static async getSpaceStorage(spaceId: string): Promise<BaseStorage> {
    return this.create(`spaces/${spaceId}`);
  }
}
