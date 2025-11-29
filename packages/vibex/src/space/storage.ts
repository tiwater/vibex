/**
 * BaseStorage - Abstract storage interface for all VibeX storage needs
 *
 * Storage paths are logical prefixes/keys, not filesystem paths.
 * The adapter implementation determines how paths are interpreted:
 * - LocalStorageAdapter: converts logical paths to filesystem paths
 * - SupabaseStorageAdapter: uses logical paths as storage bucket keys/prefixes
 */

import type { StorageAdapter, ArtifactInfo } from "@vibex/core";

export class BaseStorage {
  protected adapter: StorageAdapter;
  protected basePath: string;

  constructor(basePath?: string, adapter?: StorageAdapter) {
    this.basePath = basePath || "";

    if (adapter) {
      this.adapter = adapter;
    } else {
      // Only create LocalStorageAdapter on server
      if (typeof window === "undefined") {
        // This will be initialized asynchronously - use init() method
        throw new Error(
          "BaseStorage requires an adapter. Use BaseStorage.init() for async initialization or provide an adapter in the constructor."
        );
      } else {
        throw new Error(
          "LocalStorageAdapter cannot be used in client code. Provide a client-compatible adapter."
        );
      }
    }
  }

  /**
   * Get full logical path relative to base
   */
  protected getPath(...segments: string[]): string {
    const allSegments = [this.basePath, ...segments].filter(
      (s) => s && s !== ""
    );
    return allSegments.join("/").replace(/\/+/g, "/");
  }

  /**
   * Initialize storage (ensure directories exist)
   */
  async initialize(): Promise<void> {
    await this.adapter.mkdir(this.basePath);
  }

  /**
   * Read JSON file
   */
  async readJSON<T = unknown>(relativePath: string): Promise<T | null> {
    try {
      const fullPath = this.getPath(relativePath);
      const content = await this.adapter.readTextFile(fullPath);
      return JSON.parse(content) as T;
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  /**
   * Read YAML file
   */
  async readYaml<T = unknown>(relativePath: string): Promise<T | null> {
    try {
      const fullPath = this.getPath(relativePath);
      const content = await this.adapter.readTextFile(fullPath);
      const yaml = await import("yaml");
      return yaml.parse(content) as T;
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  /**
   * Write JSON file
   */
  async writeJSON(relativePath: string, data: unknown): Promise<void> {
    const fullPath = this.getPath(relativePath);
    const content = JSON.stringify(data, null, 2);
    await this.adapter.writeFile(fullPath, content);
  }

  /**
   * Check if file exists
   */
  async exists(relativePath: string): Promise<boolean> {
    const fullPath = this.getPath(relativePath);
    return this.adapter.exists(fullPath);
  }

  /**
   * Read text file
   */
  async readTextFile(relativePath: string): Promise<string> {
    const fullPath = this.getPath(relativePath);
    return this.adapter.readTextFile(fullPath);
  }

  /**
   * Read file as buffer (binary)
   */
  async readFile(relativePath: string): Promise<Buffer> {
    const fullPath = this.getPath(relativePath);
    return this.adapter.readFile(fullPath);
  }

  /**
   * Write file (text or binary)
   */
  async writeFile(relativePath: string, data: Buffer | string): Promise<void> {
    const fullPath = this.getPath(relativePath);
    await this.adapter.writeFile(fullPath, data);
  }

  /**
   * Delete file
   */
  async delete(relativePath: string): Promise<void> {
    const fullPath = this.getPath(relativePath);
    await this.adapter.deleteFile(fullPath);
  }

  /**
   * List files in directory
   */
  async list(relativePath: string = ""): Promise<string[]> {
    const fullPath = this.getPath(relativePath);
    try {
      return await this.adapter.readdir(fullPath);
    } catch {
      return [];
    }
  }

  /**
   * Create directory
   */
  async mkdir(relativePath: string): Promise<void> {
    const fullPath = this.getPath(relativePath);
    await this.adapter.mkdir(fullPath);
  }

  // ==================== Artifact Operations ====================

  /**
   * Save an artifact (file + metadata)
   */
  async saveArtifact(
    spaceId: string,
    artifact: ArtifactInfo,
    buffer: Buffer
  ): Promise<ArtifactInfo> {
    return this.adapter.saveArtifact(spaceId, artifact, buffer);
  }

  /**
   * Get an artifact (file + metadata)
   */
  async getArtifact(
    spaceId: string,
    artifactId: string
  ): Promise<{ info: ArtifactInfo; buffer: Buffer } | null> {
    return this.adapter.getArtifact(spaceId, artifactId);
  }

  /**
   * Get artifact metadata only
   */
  async getArtifactInfo(
    spaceId: string,
    artifactId: string
  ): Promise<ArtifactInfo | null> {
    return this.adapter.getArtifactInfo(spaceId, artifactId);
  }

  /**
   * List all artifacts for a space
   */
  async listArtifacts(spaceId: string): Promise<ArtifactInfo[]> {
    return this.adapter.listArtifacts(spaceId);
  }

  /**
   * Delete an artifact
   */
  async deleteArtifact(spaceId: string, artifactId: string): Promise<void> {
    return this.adapter.deleteArtifact(spaceId, artifactId);
  }
}
