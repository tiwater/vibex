import { SupabaseClient } from "@supabase/supabase-js";
import type { StorageAdapter, ArtifactInfo } from "@vibex/core";
import { createAnonClient, createServiceRoleClient } from "./client";

export interface SupabaseStorageConfig {
  defaultBucket?: string;
  accessToken?: string;
}

export class SupabaseStorageAdapter implements StorageAdapter {
  private client: SupabaseClient;
  private serviceClient = createServiceRoleClient();
  private config: SupabaseStorageConfig;

  constructor(config?: SupabaseStorageConfig) {
    this.config = config || {};
    this.client = createAnonClient(this.config.accessToken);
  }

  private bucket() {
    return this.config.defaultBucket || "spaces";
  }

  private normalize(path: string): string {
    return path.replace(/^[\/]+/, "").replace(/\\/g, "/");
  }

  async readFile(path: string): Promise<Buffer> {
    const key = this.normalize(path);
    const { data, error } = await this.client.storage.from(this.bucket()).download(key);
    if (error) throw error;
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async readTextFile(path: string): Promise<string> {
    const buffer = await this.readFile(path);
    return buffer.toString("utf-8");
  }

  async writeFile(path: string, data: Buffer | string): Promise<void> {
    const key = this.normalize(path);
    const { error } = await this.client.storage
      .from(this.bucket())
      .upload(key, data, { upsert: true });
    if (error) throw error;
  }

  async deleteFile(path: string): Promise<void> {
    const key = this.normalize(path);
    const { error } = await this.client.storage.from(this.bucket()).remove([key]);
    if (error) throw error;
  }

  async exists(path: string): Promise<boolean> {
    try {
      const key = this.normalize(path);
      const dir = key.split("/").slice(0, -1).join("/");
      const name = key.split("/").pop();
      const { data } = await this.client.storage.from(this.bucket()).list(dir, {
        search: name,
      });
      return !!data && data.some((entry) => entry.name === name);
    } catch {
      return false;
    }
  }

  async mkdir(_path: string): Promise<void> {
    // object storage is virtual, nothing to do
  }

  async readdir(path: string): Promise<string[]> {
    const dir = this.normalize(path);
    const { data, error } = await this.client.storage.from(this.bucket()).list(dir);
    if (error) throw error;
    return data.map((item) => item.name);
  }

  async stat(path: string): Promise<any> {
    const key = this.normalize(path);
    const dir = key.split("/").slice(0, -1).join("/");
    const name = key.split("/").pop();
    const { data, error } = await this.client.storage.from(this.bucket()).list(dir, {
      search: name,
    });
    if (error) throw error;
    const match = data.find((item) => item.name === name);
    return match || null;
  }

  // Artifact helpers ----------------------------------------------------
  async saveArtifact(spaceId: string, artifact: ArtifactInfo, buffer: Buffer): Promise<ArtifactInfo> {
    const storageKey = `${spaceId}/artifacts/${artifact.storageKey}`;
    await this.writeFile(storageKey, buffer);

    const { data, error } = await this.serviceClient
      .from("artifacts")
      .upsert({
        id: artifact.id,
        space_id: spaceId,
        storage_key: artifact.storageKey,
        original_name: artifact.originalName,
        mime_type: artifact.mimeType,
        size_bytes: artifact.sizeBytes,
        category: artifact.category,
        metadata: artifact.metadata,
      })
      .select()
      .single();
    if (error) throw error;

    return {
      id: data.id,
      storageKey: data.storage_key,
      originalName: data.original_name,
      mimeType: data.mime_type,
      sizeBytes: data.size_bytes,
      category: data.category,
      metadata: data.metadata,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async getArtifact(spaceId: string, artifactId: string): Promise<{ info: ArtifactInfo; buffer: Buffer } | null> {
    const info = await this.getArtifactInfo(spaceId, artifactId);
    if (!info) return null;
    const buffer = await this.readFile(`${spaceId}/artifacts/${info.storageKey}`);
    return { info, buffer };
  }

  async getArtifactInfo(spaceId: string, artifactId: string): Promise<ArtifactInfo | null> {
    const { data, error } = await this.serviceClient
      .from("artifacts")
      .select("*")
      .eq("id", artifactId)
      .eq("space_id", spaceId)
      .single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return {
      id: data.id,
      storageKey: data.storage_key,
      originalName: data.original_name,
      mimeType: data.mime_type,
      sizeBytes: data.size_bytes,
      category: data.category,
      metadata: data.metadata,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async listArtifacts(spaceId: string): Promise<ArtifactInfo[]> {
    const { data, error } = await this.serviceClient
      .from("artifacts")
      .select("*")
      .eq("space_id", spaceId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map((row) => ({
      id: row.id,
      storageKey: row.storage_key,
      originalName: row.original_name,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      category: row.category,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async deleteArtifact(spaceId: string, artifactId: string): Promise<void> {
    const info = await this.getArtifactInfo(spaceId, artifactId);
    if (!info) throw new Error("Artifact not found");
    await this.deleteFile(`${spaceId}/artifacts/${info.storageKey}`);
    const { error } = await this.serviceClient
      .from("artifacts")
      .delete()
      .eq("id", artifactId)
      .eq("space_id", spaceId);
    if (error) throw error;
  }
}
