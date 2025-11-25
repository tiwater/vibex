import {
  __publicField
} from "./chunk-QZ7TP4HQ.mjs";

// src/space/storage.ts
import { BaseStorage } from "@vibex/data";
var Storage = class {
  /**
   * Initialize storage system
   * @param adapter - Storage adapter (local filesystem, Supabase, etc.)
   * @param rootPrefix - Logical root prefix for all storage operations (not a filesystem path)
   */
  static async initialize(adapter, rootPrefix) {
    if (adapter) {
      this.adapter = adapter;
    } else {
      if (typeof window === "undefined") {
        const dataModule = await import("@vibex/data");
        const LocalStorageAdapter = dataModule.LocalStorageAdapter;
        this.adapter = new LocalStorageAdapter();
      } else {
        throw new Error(
          "LocalStorageAdapter cannot be used in client code. Provide a client-compatible adapter."
        );
      }
    }
    this.rootPrefix = rootPrefix || "";
  }
  /**
   * Get storage adapter
   */
  static async getAdapter() {
    if (!this.adapter) {
      await this.initialize();
    }
    return this.adapter;
  }
  /**
   * Get root prefix (logical, not filesystem path)
   */
  static async getRootPrefix() {
    if (this.rootPrefix === void 0) {
      await this.initialize();
    }
    return this.rootPrefix || "";
  }
  /**
   * Create a storage instance for a specific logical path prefix
   * @param subPath - Logical sub-path prefix (e.g., "config", "spaces/spaceId")
   */
  static async create(subPath = "") {
    const rootPrefix = await this.getRootPrefix();
    const adapter = await this.getAdapter();
    const logicalPath = rootPrefix ? subPath ? `${rootPrefix}/${subPath}` : rootPrefix : subPath;
    return new BaseStorage(logicalPath, adapter);
  }
  /**
   * Get root storage (for top-level directories like agents)
   */
  static async getRootStorage() {
    return this.create("");
  }
  /**
   * Get config storage (for all configuration files)
   */
  static async getConfigStorage() {
    return this.create("config");
  }
  /**
   * Get defaults storage (for default templates, agents, etc.)
   */
  static async getDefaultsStorage() {
    return this.create("defaults");
  }
  /**
   * @deprecated Use getDefaultsStorage() instead
   */
  static async getHubStorage() {
    return this.getDefaultsStorage();
  }
  /**
   * Get space storage (for space-specific files)
   */
  static async getSpaceStorage(spaceId) {
    return this.create(`spaces/${spaceId}`);
  }
};
__publicField(Storage, "adapter");
__publicField(Storage, "rootPrefix");

export {
  Storage
};
