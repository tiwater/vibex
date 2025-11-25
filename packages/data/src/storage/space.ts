/**
 * Space Storage - Handles storage operations for spaces
 */

import os from "os";
import path from "path";
import { BaseStorage, StorageAdapter, ArtifactInfo } from "./base";

export interface StorageOptions {
  rootPath: string;
  spaceId: string;
  adapter?: StorageAdapter;
}

function resolveRoot(): string {
  return process.env.VIBEX_STORAGE_PATH || path.join(os.homedir(), ".vibex");
}

export class SpaceStorage extends BaseStorage {
  private spaceId: string;

  constructor(options: StorageOptions) {
    super(options.rootPath, options.adapter);
    this.spaceId = options.spaceId;
  }

  getSpacePath(): string {
    return this.basePath;
  }

  getFilePath(filename: string): string {
    return this.getPath(filename);
  }

  async saveFile(filename: string, data: any): Promise<void> {
    const content =
      typeof data === "string" ? data : JSON.stringify(data, null, 2);
    await this.writeFile(filename, content);
  }

  async saveFileBuffer(filename: string, data: Buffer): Promise<void> {
    await this.writeFile(filename, data);
  }

  /**
   * DEPRECATED: Use artifact operations below instead
   * Save an artifact file (low-level file operation only)
   */
  async saveArtifact(
    storageKey: string,
    buffer: Buffer,
    _metadata: {
      mimeType: string;
      size: number;
      artifactType?: string;
    },
    _originalFilename?: string
  ): Promise<void> {
    const artifactPath = `artifacts/${storageKey}`;
    await this.mkdir("artifacts");
    await this.writeFile(artifactPath, buffer);
  }

  // ==================== High-Level Artifact Operations ====================

  async saveCompleteArtifact(
    artifact: ArtifactInfo,
    buffer: Buffer
  ): Promise<ArtifactInfo> {
    return this.adapter.saveArtifact(this.spaceId, artifact, buffer);
  }

  async getCompleteArtifact(
    artifactId: string
  ): Promise<{ info: ArtifactInfo; buffer: Buffer } | null> {
    return this.adapter.getArtifact(this.spaceId, artifactId);
  }

  async getArtifactInfo(artifactId: string): Promise<ArtifactInfo | null> {
    return this.adapter.getArtifactInfo(this.spaceId, artifactId);
  }

  async listArtifacts(): Promise<ArtifactInfo[]> {
    return this.adapter.listArtifacts(this.spaceId);
  }

  async deleteCompleteArtifact(artifactId: string): Promise<void> {
    return this.adapter.deleteArtifact(this.spaceId, artifactId);
  }

  async listFiles(): Promise<string[]> {
    return this.list();
  }

  async createDirectory(dirname: string): Promise<void> {
    await this.mkdir(dirname);
  }

  async getMetadata(): Promise<any> {
    return this.readJSON("metadata.json");
  }

  async saveMetadata(metadata: any): Promise<void> {
    await this.writeJSON("metadata.json", metadata);
  }

  async getArtifact(
    filename: string
  ): Promise<{ content: Buffer; metadata?: any } | null> {
    try {
      const artifactPath = `artifacts/${filename}`;
      const content = await this.readFile(artifactPath);
      return { content, metadata: null };
    } catch (error: any) {
      return null;
    }
  }

  async cleanup(): Promise<void> {
    const files = await this.listFiles();
    for (const file of files) {
      if (file.startsWith("tmp_") || file.endsWith(".tmp")) {
        await this.delete(file);
      }
    }
  }
}

export class SpaceStorageFactory {
  private static rootPath: string | null = null;

  static setRootPath(rootPath: string): void {
    SpaceStorageFactory.rootPath = rootPath;
  }

  static async create(spaceId: string): Promise<SpaceStorage> {
    if (typeof window !== "undefined") {
      throw new Error(
        "SpaceStorageFactory.create() can only run on the server"
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { LocalStorageAdapter } = require("./adapters/local");
    const adapter: StorageAdapter = new LocalStorageAdapter();
    const baseRoot = SpaceStorageFactory.rootPath || resolveRoot();
    const rootPath = path.join(baseRoot, "spaces", spaceId);

    const storage = new SpaceStorage({
      rootPath,
      spaceId,
      adapter,
    });
    await storage.initialize();
    return storage;
  }

  static async list(): Promise<string[]> {
    if (typeof window !== "undefined") {
      throw new Error("SpaceStorageFactory.list() can only run on the server");
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require("fs").promises;
      const rootPath = SpaceStorageFactory.rootPath || resolveRoot();
      const spacesPath = path.join(rootPath, "spaces");

      try {
        await fs.access(spacesPath);
      } catch {
        return [];
      }

      const entries = await fs.readdir(spacesPath);
      const spaces: string[] = [];

      for (const entry of entries) {
        const entryPath = path.join(spacesPath, entry);
        const stat = await fs.stat(entryPath);
        if (stat.isDirectory() && !entry.startsWith(".")) {
          spaces.push(entry);
        }
      }

      return spaces;
    } catch {
      return [];
    }
  }

  static async exists(spaceId: string): Promise<boolean> {
    const storage = await SpaceStorageFactory.create(spaceId);
    return storage.exists("space.json");
  }

  static async delete(spaceId: string): Promise<void> {
    const storage = await SpaceStorageFactory.create(spaceId);
    await storage.delete("metadata.json");

    const files = await storage.list();
    for (const file of files) {
      await storage.delete(file);
    }

    try {
      const artifacts = await storage.list("artifacts");
      for (const file of artifacts) {
        await storage.delete(`artifacts/${file}`);
      }
    } catch {
      // ignore missing artifacts folder
    }
  }
}
