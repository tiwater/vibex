/**
 * SpaceManager - Unified Data Access Layer
 *
 * This is the single source of truth for all VibeX data operations.
 * It unifies ResourceAdapter (resources), KnowledgeAdapter (vectors),
 * and StorageAdapter (files) into one interface.
 */

import type {
  ResourceAdapter,
  KnowledgeAdapter,
  SpaceType,
  ArtifactType,
  ConversationType,
  AgentType,
  ToolType,
  DatasetType,
  KnowledgeDocumentType,
  DocumentChunkType,
} from "@vibex/core";
// getResourceAdapter and getKnowledgeAdapter are imported dynamically where needed
import { BaseStorage } from "./storage";

export interface SpaceFilters {
  userId?: string;
  name?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface ArtifactFilters {
  spaceId?: string;
  conversationId?: string;
  category?: "input" | "intermediate" | "output";
  mimeType?: string;
}

export interface ConversationFilters {
  title?: string;
  createdAfter?: Date;
}

// Legacy alias for backward compatibility
export type TaskFilters = ConversationFilters;

export type Unsubscribe = () => void;
export type SubscriptionCallback<T> = (data: T) => void;

/**
 * SpaceManager - Central data access layer for space operations
 */
export class SpaceManager {
  private resourceAdapter: ResourceAdapter;
  private knowledgeAdapter: KnowledgeAdapter;
  private cache: Map<string, { data: unknown; timestamp: number }>;
  private subscriptions: Map<string, Set<SubscriptionCallback<unknown>>>;
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes

  constructor(
    resourceAdapter?: ResourceAdapter,
    knowledgeAdapter?: KnowledgeAdapter
  ) {
    // Note: These will be initialized asynchronously if not provided
    // Callers should use createServer() for proper async initialization
    if (resourceAdapter) {
      this.resourceAdapter = resourceAdapter;
    } else {
      throw new Error("ResourceAdapter is required. Use SpaceManager.createServer() for async initialization.");
    }
    if (knowledgeAdapter) {
      this.knowledgeAdapter = knowledgeAdapter;
    } else {
      throw new Error("KnowledgeAdapter is required. Use SpaceManager.createServer() for async initialization.");
    }
    this.cache = new Map();
    this.subscriptions = new Map();
  }

  /**
   * Create a server-side instance
   */
  static async createServer(): Promise<SpaceManager> {
    const { getResourceAdapter: getRA, getKnowledgeAdapter: getKA } =
      await import("./factory");
    const resourceAdapter = await getRA();
    const knowledgeAdapter = await getKA();
    return new SpaceManager(resourceAdapter, knowledgeAdapter);
  }

  /**
   * Create a server-side instance synchronously
   */
  static createServerSync(): SpaceManager {
    if (typeof window !== "undefined") {
      throw new Error("createServerSync() can only be called on the server");
    }
    return new SpaceManager();
  }

  // ==================== Cache Management ====================

  private getCacheKey(prefix: string, id?: string): string {
    return id ? `${prefix}:${id}` : prefix;
  }

  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private invalidateCache(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  private notifySubscribers<T>(key: string, data: T): void {
    const callbacks = this.subscriptions.get(key);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          (cb as SubscriptionCallback<T>)(data);
        } catch (error) {
          console.error(`[SpaceManager] Subscription callback error:`, error);
        }
      });
    }
  }

  // ==================== Space Operations ====================

  async getSpace(spaceId: string): Promise<SpaceType | null> {
    const cacheKey = this.getCacheKey("space", spaceId);
    const cached = this.getCached<SpaceType>(cacheKey);
    if (cached) return cached;

    const space = await this.resourceAdapter.getSpace(spaceId);
    if (space) {
      this.setCache(cacheKey, space);
    }
    return space;
  }

  async listSpaces(filters?: SpaceFilters): Promise<SpaceType[]> {
    const cacheKey = `spaces:${JSON.stringify(filters || {})}`;
    const cached = this.getCached<SpaceType[]>(cacheKey);
    if (cached) return cached;

    let spaces = await this.resourceAdapter.getSpaces();

    if (filters) {
      if (filters.userId) {
        spaces = spaces.filter((s) => s.userId === filters.userId);
      }
      if (filters.name) {
        const nameLower = filters.name.toLowerCase();
        spaces = spaces.filter((s) =>
          s.name?.toLowerCase().includes(nameLower)
        );
      }
      if (filters.createdAfter) {
        spaces = spaces.filter((s) => {
          if (!s.createdAt) return false;
          return new Date(s.createdAt) >= filters.createdAfter!;
        });
      }
      if (filters.createdBefore) {
        spaces = spaces.filter((s) => {
          if (!s.createdAt) return false;
          return new Date(s.createdAt) <= filters.createdBefore!;
        });
      }
    }

    this.setCache(cacheKey, spaces);
    return spaces;
  }

  async createSpace(space: Partial<SpaceType>): Promise<SpaceType> {
    const newSpace = await this.resourceAdapter.saveSpace({
      id: space.id || `space-${Date.now()}`,
      name: space.name || "New Space",
      description: space.description,
      userId: space.userId,
      config: space.config,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as SpaceType);

    this.invalidateCache("spaces:");
    this.invalidateCache("space:");
    this.notifySubscribers("spaces", newSpace);
    this.notifySubscribers(`space:${newSpace.id}`, newSpace);

    return newSpace;
  }

  async updateSpace(
    spaceId: string,
    updates: Partial<SpaceType>
  ): Promise<SpaceType> {
    const existing = await this.getSpace(spaceId);
    if (!existing) {
      throw new Error(`Space ${spaceId} not found`);
    }

    const updated = await this.resourceAdapter.saveSpace({
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    this.setCache(this.getCacheKey("space", spaceId), updated);
    this.invalidateCache("spaces:");
    this.notifySubscribers(`space:${spaceId}`, updated);
    this.notifySubscribers("spaces", updated);

    return updated;
  }

  async deleteSpace(spaceId: string): Promise<void> {
    await this.resourceAdapter.deleteSpace(spaceId);

    this.invalidateCache("space:");
    this.invalidateCache("spaces:");
    this.invalidateCache(`artifacts:space:${spaceId}`);

    this.notifySubscribers(`space:${spaceId}`, null);
    this.notifySubscribers("spaces", null);
  }

  subscribeToSpace(
    spaceId: string,
    callback: SubscriptionCallback<SpaceType | null>
  ): Unsubscribe {
    const key = `space:${spaceId}`;
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, new Set());
    }
    this.subscriptions.get(key)!.add(callback as SubscriptionCallback<unknown>);

    this.getSpace(spaceId).then((space) => callback(space));

    return () => {
      const callbacks = this.subscriptions.get(key);
      if (callbacks) {
        callbacks.delete(callback as SubscriptionCallback<unknown>);
        if (callbacks.size === 0) {
          this.subscriptions.delete(key);
        }
      }
    };
  }

  subscribeToSpaces(callback: SubscriptionCallback<SpaceType[]>): Unsubscribe {
    const key = "spaces";
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, new Set());
    }
    this.subscriptions.get(key)!.add(callback as SubscriptionCallback<unknown>);

    this.listSpaces().then((spaces) => callback(spaces));

    return () => {
      const callbacks = this.subscriptions.get(key);
      if (callbacks) {
        callbacks.delete(callback as SubscriptionCallback<unknown>);
        if (callbacks.size === 0) {
          this.subscriptions.delete(key);
        }
      }
    };
  }

  // ==================== Artifact Operations ====================

  async getArtifacts(
    spaceId: string,
    filters?: ArtifactFilters
  ): Promise<ArtifactType[]> {
    const cacheKey = `artifacts:space:${spaceId}:${JSON.stringify(filters || {})}`;
    const cached = this.getCached<ArtifactType[]>(cacheKey);
    if (cached) return cached;

    let artifacts = await this.resourceAdapter.getArtifacts(spaceId);

    if (filters) {
      if (filters.conversationId) {
        artifacts = artifacts.filter(
          (a) => a.conversationId === filters.conversationId
        );
      }
      if (filters.category) {
        artifacts = artifacts.filter((a) => a.category === filters.category);
      }
      if (filters.mimeType) {
        artifacts = artifacts.filter((a) => a.mimeType === filters.mimeType);
      }
    }

    this.setCache(cacheKey, artifacts);
    return artifacts;
  }

  async getArtifact(artifactId: string): Promise<ArtifactType | null> {
    const cacheKey = this.getCacheKey("artifact", artifactId);
    const cached = this.getCached<ArtifactType>(cacheKey);
    if (cached) return cached;

    const artifact = await this.resourceAdapter.getArtifact(artifactId);
    if (artifact) {
      this.setCache(cacheKey, artifact);
    }
    return artifact;
  }

  async createArtifact(
    spaceId: string,
    artifact: Partial<ArtifactType>
  ): Promise<ArtifactType> {
    const newArtifact = await this.resourceAdapter.saveArtifact({
      id: artifact.id || `artifact-${Date.now()}`,
      spaceId,
      userId: artifact.userId,
      conversationId: artifact.conversationId,
      category: artifact.category || "intermediate",
      storageKey: artifact.storageKey || "",
      originalName: artifact.originalName || "untitled",
      mimeType: artifact.mimeType || "application/octet-stream",
      sizeBytes: artifact.sizeBytes || 0,
      metadata: artifact.metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as ArtifactType);

    this.invalidateCache(`artifacts:space:${spaceId}`);
    this.setCache(this.getCacheKey("artifact", newArtifact.id), newArtifact);

    this.notifySubscribers(`artifacts:space:${spaceId}`, newArtifact);
    this.notifySubscribers(`artifact:${newArtifact.id}`, newArtifact);

    return newArtifact;
  }

  async updateArtifact(
    artifactId: string,
    updates: Partial<ArtifactType>
  ): Promise<ArtifactType> {
    const existing = await this.getArtifact(artifactId);
    if (!existing) {
      throw new Error(`Artifact ${artifactId} not found`);
    }

    const updated = await this.resourceAdapter.saveArtifact({
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    this.setCache(this.getCacheKey("artifact", artifactId), updated);
    if (existing.spaceId) {
      this.invalidateCache(`artifacts:space:${existing.spaceId}`);
    }

    this.notifySubscribers(`artifact:${artifactId}`, updated);
    if (existing.spaceId) {
      this.notifySubscribers(`artifacts:space:${existing.spaceId}`, updated);
    }

    return updated;
  }

  async deleteArtifact(artifactId: string, spaceId: string): Promise<void> {
    await this.resourceAdapter.deleteArtifact(artifactId);

    this.invalidateCache(`artifact:${artifactId}`);
    this.invalidateCache(`artifacts:space:${spaceId}`);

    this.notifySubscribers(`artifact:${artifactId}`, null);
    this.notifySubscribers(`artifacts:space:${spaceId}`, null);
  }

  subscribeToArtifacts(
    spaceId: string,
    callback: SubscriptionCallback<ArtifactType[]>
  ): Unsubscribe {
    const key = `artifacts:space:${spaceId}`;
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, new Set());
    }
    this.subscriptions.get(key)!.add(callback as SubscriptionCallback<unknown>);

    this.getArtifacts(spaceId).then((artifacts) => callback(artifacts));

    return () => {
      const callbacks = this.subscriptions.get(key);
      if (callbacks) {
        callbacks.delete(callback as SubscriptionCallback<unknown>);
        if (callbacks.size === 0) {
          this.subscriptions.delete(key);
        }
      }
    };
  }

  // ==================== Task Operations ====================

  async getConversations(
    spaceId: string,
    filters?: ConversationFilters
  ): Promise<ConversationType[]> {
    const cacheKey = `tasks:space:${spaceId}:${JSON.stringify(filters || {})}`;
    const cached = this.getCached<ConversationType[]>(cacheKey);
    if (cached) return cached;

    let tasks = await this.resourceAdapter.getConversations(spaceId);

    if (filters) {
      if (filters.title) {
        const lowerTitle = filters.title.toLowerCase();
        tasks = tasks.filter((t) =>
          t.title?.toLowerCase().includes(lowerTitle)
        );
      }
      if (filters.createdAfter) {
        tasks = tasks.filter((t) => {
          if (!t.createdAt) return false;
          return new Date(t.createdAt) >= filters.createdAfter!;
        });
      }
    }

    this.setCache(cacheKey, tasks);
    return tasks;
  }

  async getConversation(taskId: string): Promise<ConversationType | null> {
    const cacheKey = this.getCacheKey("task", taskId);
    const cached = this.getCached<ConversationType>(cacheKey);
    if (cached) return cached;

    const task = await this.resourceAdapter.getConversation(taskId);
    if (task) {
      this.setCache(cacheKey, task);
    }
    return task;
  }

  async createTask(
    spaceId: string,
    task: Partial<ConversationType>
  ): Promise<ConversationType> {
    const newTask = await this.resourceAdapter.saveConversation({
      id: task.id || `task-${Date.now()}`,
      spaceId,
      userId: task.userId,
      title: task.title,
      metadata: task.metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as ConversationType);

    this.invalidateCache(`tasks:space:${spaceId}`);
    this.setCache(this.getCacheKey("task", newTask.id), newTask);

    this.notifySubscribers(`tasks:space:${spaceId}`, newTask);
    this.notifySubscribers(`task:${newTask.id}`, newTask);

    return newTask;
  }

  async updateTask(
    taskId: string,
    updates: Partial<ConversationType>
  ): Promise<ConversationType> {
    const existing = await this.getConversation(taskId);
    if (!existing) {
      throw new Error(`Task ${taskId} not found`);
    }

    const updated = await this.resourceAdapter.saveConversation({
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    this.setCache(this.getCacheKey("task", taskId), updated);
    this.invalidateCache(`tasks:space:${existing.spaceId}`);

    this.notifySubscribers(`task:${taskId}`, updated);
    this.notifySubscribers(`tasks:space:${existing.spaceId}`, updated);

    return updated;
  }

  async createConversation(
    spaceId: string,
    conversation: Partial<ConversationType>
  ): Promise<ConversationType> {
    return this.createTask(spaceId, conversation);
  }

  async updateConversation(
    conversationId: string,
    updates: Partial<ConversationType>
  ): Promise<ConversationType> {
    return this.updateTask(conversationId, updates);
  }

  async deleteConversation(taskId: string, spaceId: string): Promise<void> {
    await this.resourceAdapter.deleteConversation(taskId);

    this.invalidateCache(`task:${taskId}`);
    this.invalidateCache(`tasks:space:${spaceId}`);

    this.notifySubscribers(`task:${taskId}`, null);
    this.notifySubscribers(`tasks:space:${spaceId}`, null);
  }

  subscribeToTasks(
    spaceId: string,
    callback: SubscriptionCallback<ConversationType[]>
  ): Unsubscribe {
    const key = `tasks:space:${spaceId}`;
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, new Set());
    }
    this.subscriptions.get(key)!.add(callback as SubscriptionCallback<unknown>);

    this.getConversations(spaceId).then((tasks) => callback(tasks));

    return () => {
      const callbacks = this.subscriptions.get(key);
      if (callbacks) {
        callbacks.delete(callback as SubscriptionCallback<unknown>);
        if (callbacks.size === 0) {
          this.subscriptions.delete(key);
        }
      }
    };
  }

  // ==================== Agent Operations ====================

  async getAgents(): Promise<AgentType[]> {
    const cacheKey = "agents";
    const cached = this.getCached<AgentType[]>(cacheKey);
    if (cached) return cached;

    const agents = await this.resourceAdapter.getAgents();
    this.setCache(cacheKey, agents);
    return agents;
  }

  async getAgent(agentId: string): Promise<AgentType | null> {
    const cacheKey = this.getCacheKey("agent", agentId);
    const cached = this.getCached<AgentType>(cacheKey);
    if (cached) return cached;

    const agent = await this.resourceAdapter.getAgent(agentId);
    if (agent) {
      this.setCache(cacheKey, agent);
    }
    return agent;
  }

  // ==================== Tool Operations ====================

  async getTools(): Promise<ToolType[]> {
    const cacheKey = "tools";
    const cached = this.getCached<ToolType[]>(cacheKey);
    if (cached) return cached;

    const tools = await this.resourceAdapter.getTools();
    this.setCache(cacheKey, tools);
    return tools;
  }

  async getTool(toolId: string): Promise<ToolType | null> {
    const cacheKey = this.getCacheKey("tool", toolId);
    const cached = this.getCached<ToolType>(cacheKey);
    if (cached) return cached;

    const tool = await this.resourceAdapter.getTool(toolId);
    if (tool) {
      this.setCache(cacheKey, tool);
    }
    return tool;
  }

  // ==================== Storage Operations ====================

  getSpaceStorage(_spaceId: string): BaseStorage {
    return new BaseStorage();
  }

  async uploadArtifactFile(
    spaceId: string,
    artifactId: string,
    file: File | Blob,
    filename: string
  ): Promise<string> {
    const storage = this.getSpaceStorage(spaceId);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const storageKey = `${filename}`;

    await storage.saveArtifact(
      spaceId,
      {
        id: artifactId,
        storageKey,
        originalName: filename,
        mimeType: file.type,
        sizeBytes: file.size,
      },
      buffer
    );

    return storageKey;
  }

  async downloadArtifactFile(
    spaceId: string,
    storageKey: string,
    artifactId?: string
  ): Promise<Blob> {
    const storage = this.getSpaceStorage(spaceId);
    const id = artifactId || storageKey;
    const result = await storage.getArtifact(spaceId, id);

    if (!result) {
      throw new Error(`Artifact file not found: ${storageKey}`);
    }

    const uint8Array = new Uint8Array(result.buffer);
    return new Blob([uint8Array]);
  }

  async deleteArtifactFile(spaceId: string, storageKey: string): Promise<void> {
    const storage = this.getSpaceStorage(spaceId);
    await storage.deleteArtifact(spaceId, storageKey);
  }

  // ==================== Knowledge Operations ====================

  async getDatasets(): Promise<DatasetType[]> {
    return this.knowledgeAdapter.getDatasets();
  }

  async getDataset(id: string): Promise<DatasetType | null> {
    return this.knowledgeAdapter.getDataset(id);
  }

  async saveDataset(dataset: DatasetType): Promise<void> {
    await this.knowledgeAdapter.saveDataset(dataset);
  }

  async deleteDataset(id: string): Promise<void> {
    await this.knowledgeAdapter.deleteDataset(id);
  }

  async getDocuments(datasetId: string): Promise<KnowledgeDocumentType[]> {
    return this.knowledgeAdapter.getDocuments(datasetId);
  }

  async addDocument(
    datasetId: string,
    document: KnowledgeDocumentType
  ): Promise<void> {
    await this.knowledgeAdapter.addDocument(datasetId, document);
  }

  async deleteDocument(datasetId: string, documentId: string): Promise<void> {
    await this.knowledgeAdapter.deleteDocument(datasetId, documentId);
  }

  async saveChunks(chunks: DocumentChunkType[]): Promise<void> {
    await this.knowledgeAdapter.saveChunks(chunks);
  }

  async searchChunks(
    vector: number[],
    k: number
  ): Promise<DocumentChunkType[]> {
    return this.knowledgeAdapter.searchChunks(vector, k);
  }

  async deleteChunks(ids: string[]): Promise<void> {
    await this.knowledgeAdapter.deleteChunks(ids);
  }
}

let serverInstance: SpaceManager | null = null;

export function getSpaceManager(): SpaceManager {
  return getSpaceManagerServer();
}

/**
 * Get server-side SpaceManager
 */
export function getSpaceManagerServer(): SpaceManager {
  if (typeof window !== "undefined") {
    throw new Error("getSpaceManagerServer() can only be called on the server");
  }
  if (!serverInstance) {
    serverInstance = SpaceManager.createServerSync();
  }
  return serverInstance;
}
