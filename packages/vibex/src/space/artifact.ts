/**
 * Artifact Management for Vibex
 *
 * Provides a simple interface for managing space artifacts
 * (documents, images, and other files) within the Vibex system
 */

import { BaseStorage } from "./storage";
import path from "path";

export interface ArtifactMetadata {
  name: string;
  path: string;
  mimeType: string;
  size: number;
  createdAt: string;
  updatedAt?: string;
  tags?: string[];
  description?: string;
}

export class ArtifactManager {
  constructor(private storage: BaseStorage) {}

  /**
   * Save an artifact to the space
   */
  async saveArtifact(
    spaceId: string,
    filename: string,
    content: Buffer | string,
    metadata?: Partial<ArtifactMetadata>
  ): Promise<ArtifactMetadata> {
    const buffer =
      typeof content === "string" ? Buffer.from(content, "utf8") : content;

    const artifactPath = `artifacts/${filename}`;
    const mimeType = metadata?.mimeType || this.getMimeType(filename);

    // Use BaseStorage.saveArtifact
    await this.storage.saveArtifact(
      spaceId,
      {
        id: filename,
        storageKey: filename,
        originalName: filename,
        mimeType,
        sizeBytes: buffer.length,
        category: "input", // User uploads are input artifacts
        metadata: metadata,
      },
      buffer
    );

    return {
      name: filename,
      path: artifactPath,
      mimeType,
      size: buffer.length,
      createdAt: new Date().toISOString(),
      ...metadata,
    };
  }

  /**
   * Get an artifact from the space
   */
  async getArtifact(spaceId: string, filename: string): Promise<Buffer | null> {
    try {
      const result = await this.storage.getArtifact(spaceId, filename);
      return result ? result.buffer : null;
    } catch (error) {
      console.error(
        `[ArtifactManager] Failed to get artifact ${filename}:`,
        error
      );
      return null;
    }
  }

  /**
   * List all artifacts in the space
   */
  async listArtifacts(): Promise<ArtifactMetadata[]> {
    // Not implemented in BaseStorage yet
    return [];
  }

  /**
   * Delete an artifact
   */
  async deleteArtifact(spaceId: string, filename: string): Promise<boolean> {
    try {
      await this.storage.deleteArtifact(spaceId, filename);
      return true;
    } catch (error) {
      console.error(
        `[ArtifactManager] Failed to delete artifact ${filename}:`,
        error
      );
      return false;
    }
  }

  /**
   * Get MIME type from filename
   */
  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".xls": "application/vnd.ms-excel",
      ".xlsx":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".ppt": "application/vnd.ms-powerpoint",
      ".pptx":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ".txt": "text/plain",
      ".md": "text/markdown",
      ".json": "application/json",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
    };
    return mimeTypes[ext] || "application/octet-stream";
  }
}
