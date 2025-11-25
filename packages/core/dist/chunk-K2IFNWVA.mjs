import {
  __publicField,
  getVibexRoot
} from "./chunk-IZQTIHBR.mjs";

// src/space/storage.ts
import path from "path";
import { BaseStorage } from "@vibex/data";
var Storage = class {
  /**
   * Initialize storage system
   */
  static async initialize(adapter, rootPath) {
    if (adapter) {
      this.adapter = adapter;
    } else {
      if (typeof window === "undefined") {
        const { LocalStorageAdapter } = await import("@vibex/data");
        this.adapter = new LocalStorageAdapter();
      } else {
        throw new Error(
          "LocalStorageAdapter cannot be used in client code. Provide a client-compatible adapter."
        );
      }
    }
    this.rootPath = rootPath || getVibexRoot();
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
   * Get root path
   */
  static async getRootPath() {
    if (!this.rootPath) {
      await this.initialize();
    }
    return this.rootPath;
  }
  /**
   * Create a storage instance for a specific subdirectory
   */
  static async create(subPath = "") {
    const rootPath = await this.getRootPath();
    const adapter = await this.getAdapter();
    const fullPath = path.join(rootPath, subPath);
    return new BaseStorage(fullPath, adapter);
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
    return this.create(path.join("spaces", spaceId));
  }
};
__publicField(Storage, "adapter");
__publicField(Storage, "rootPath");

export {
  Storage
};
