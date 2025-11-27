/**
 * Local filesystem adapter for storage
 * Uses ~/.vibex/spaces/{spaceId}/artifacts for blob storage
 * Uses SQLite (via LocalDataAdapter) for metadata
 */

import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import type { StorageAdapter, ArtifactInfo } from '../base';
import { LocalResourceAdapter } from '../../adapters/local';

function resolveRoot(): string {
  return process.env.VIBEX_STORAGE_PATH || path.join(os.homedir(), '.vibex');
}

/**
 * Local filesystem adapter
 */
export class LocalStorageAdapter implements StorageAdapter {
  private resourceAdapter: LocalResourceAdapter;

  constructor() {
    this.resourceAdapter = new LocalResourceAdapter();
  }

  async readFile(filepath: string): Promise<Buffer> {
    return fs.readFile(filepath);
  }

  async readTextFile(filepath: string): Promise<string> {
    return fs.readFile(filepath, 'utf8');
  }

  async writeFile(filepath: string, data: Buffer | string): Promise<void> {
    const dir = path.dirname(filepath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filepath, data, typeof data === 'string' ? 'utf8' : undefined);
  }

  async deleteFile(filepath: string): Promise<void> {
    try {
      await fs.unlink(filepath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  async exists(filepath: string): Promise<boolean> {
    try {
      await fs.access(filepath);
      return true;
    } catch {
      return false;
    }
  }

  async mkdir(dirpath: string): Promise<void> {
    await fs.mkdir(dirpath, { recursive: true });
  }

  async readdir(dirpath: string): Promise<string[]> {
    return fs.readdir(dirpath);
  }

  async stat(filepath: string): Promise<any> {
    return fs.stat(filepath);
  }

  // ==================== Artifact Operations ====================
  
  private getArtifactPath(spaceId: string, storageKey: string): string {
    const root = resolveRoot();
    return path.join(root, 'spaces', spaceId, 'artifacts', storageKey);
  }
  
  async saveArtifact(spaceId: string, artifact: ArtifactInfo, buffer: Buffer): Promise<ArtifactInfo> {
    // Save file
    const filePath = this.getArtifactPath(spaceId, artifact.storageKey);
    await this.writeFile(filePath, buffer);
    
    // Save metadata to SQLite
    const fullArtifact = {
      ...artifact,
      spaceId,
      taskId: (artifact as any).taskId, // Ensure taskId is passed if available
      artifactType: "file" as const
    };
    
    // We need to cast because ArtifactInfo subset of Artifact but Artifact requires spaceId
    await this.resourceAdapter.saveArtifact(fullArtifact);
    
    return artifact;
  }
  
  async getArtifact(spaceId: string, artifactId: string): Promise<{ info: ArtifactInfo; buffer: Buffer } | null> {
    const info = await this.getArtifactInfo(spaceId, artifactId);
    if (!info) return null;
    
    const filePath = this.getArtifactPath(spaceId, info.storageKey);
    try {
      const buffer = await fs.readFile(filePath);
      return { info, buffer };
    } catch (error: any) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }
  
  async getArtifactInfo(spaceId: string, artifactId: string): Promise<ArtifactInfo | null> {
    const artifact = await this.resourceAdapter.getArtifact(artifactId, spaceId);
    if (!artifact) return null;
    
    // Return as ArtifactInfo (strip extra fields if needed, but they are compatible)
    return {
      id: artifact.id,
      storageKey: artifact.storageKey,
      originalName: artifact.originalName,
      mimeType: artifact.mimeType,
      sizeBytes: artifact.sizeBytes,
      category: artifact.category,
      metadata: artifact.metadata,
      createdAt: artifact.createdAt,
      updatedAt: artifact.updatedAt,
    };
  }
  
  async listArtifacts(spaceId: string): Promise<ArtifactInfo[]> {
    const artifacts = await this.resourceAdapter.getArtifacts(spaceId);
    return artifacts.map(a => ({
      id: a.id,
      storageKey: a.storageKey,
      originalName: a.originalName,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      category: a.category,
      metadata: a.metadata,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));
  }
  
  async deleteArtifact(spaceId: string, artifactId: string): Promise<void> {
    const info = await this.getArtifactInfo(spaceId, artifactId);
    if (!info) throw new Error('Artifact not found');
    
    // Delete file
    const filePath = this.getArtifactPath(spaceId, info.storageKey);
    await this.deleteFile(filePath);
    
    // Delete metadata
    await this.resourceAdapter.deleteArtifact(artifactId, spaceId);
  }
}
