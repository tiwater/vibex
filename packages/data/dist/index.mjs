import {
  LocalDataAdapter,
  __esm,
  __export,
  __publicField,
  __require,
  __toCommonJS,
  factory_exports,
  getDataAdapter,
  getServerDataAdapter,
  init_factory,
  init_local
} from "./chunk-Y2PQI7IX.mjs";

// src/storage/adapters/local.ts
var local_exports = {};
__export(local_exports, {
  LocalStorageAdapter: () => LocalStorageAdapter
});
import { promises as fs } from "fs";
import os from "os";
import path from "path";
function resolveRoot() {
  return process.env.VIBEX_STORAGE_PATH || path.join(os.homedir(), ".vibex");
}
var LocalStorageAdapter;
var init_local2 = __esm({
  "src/storage/adapters/local.ts"() {
    "use strict";
    init_local();
    LocalStorageAdapter = class {
      constructor() {
        __publicField(this, "dataAdapter");
        this.dataAdapter = new LocalDataAdapter();
      }
      async readFile(filepath) {
        return fs.readFile(filepath);
      }
      async readTextFile(filepath) {
        return fs.readFile(filepath, "utf8");
      }
      async writeFile(filepath, data) {
        const dir = path.dirname(filepath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(filepath, data, typeof data === "string" ? "utf8" : void 0);
      }
      async deleteFile(filepath) {
        try {
          await fs.unlink(filepath);
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
      }
      async exists(filepath) {
        try {
          await fs.access(filepath);
          return true;
        } catch {
          return false;
        }
      }
      async mkdir(dirpath) {
        await fs.mkdir(dirpath, { recursive: true });
      }
      async readdir(dirpath) {
        return fs.readdir(dirpath);
      }
      async stat(filepath) {
        return fs.stat(filepath);
      }
      // ==================== Artifact Operations ====================
      getArtifactPath(spaceId, storageKey) {
        const root = resolveRoot();
        return path.join(root, "spaces", spaceId, "artifacts", storageKey);
      }
      async saveArtifact(spaceId, artifact, buffer) {
        const filePath = this.getArtifactPath(spaceId, artifact.storageKey);
        await this.writeFile(filePath, buffer);
        const fullArtifact = {
          ...artifact,
          spaceId,
          taskId: artifact.taskId,
          // Ensure taskId is passed if available
          artifactType: "file"
        };
        await this.dataAdapter.saveArtifact(fullArtifact);
        return artifact;
      }
      async getArtifact(spaceId, artifactId) {
        const info = await this.getArtifactInfo(spaceId, artifactId);
        if (!info) return null;
        const filePath = this.getArtifactPath(spaceId, info.storageKey);
        try {
          const buffer = await fs.readFile(filePath);
          return { info, buffer };
        } catch (error) {
          if (error.code === "ENOENT") return null;
          throw error;
        }
      }
      async getArtifactInfo(spaceId, artifactId) {
        const artifact = await this.dataAdapter.getArtifact(artifactId, spaceId);
        if (!artifact) return null;
        return {
          id: artifact.id,
          storageKey: artifact.storageKey,
          originalName: artifact.originalName,
          mimeType: artifact.mimeType,
          sizeBytes: artifact.sizeBytes,
          category: artifact.category,
          metadata: artifact.metadata,
          createdAt: artifact.createdAt,
          updatedAt: artifact.updatedAt
        };
      }
      async listArtifacts(spaceId) {
        const artifacts = await this.dataAdapter.getArtifacts(spaceId);
        return artifacts.map((a) => ({
          id: a.id,
          storageKey: a.storageKey,
          originalName: a.originalName,
          mimeType: a.mimeType,
          sizeBytes: a.sizeBytes,
          category: a.category,
          metadata: a.metadata,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt
        }));
      }
      async deleteArtifact(spaceId, artifactId) {
        const info = await this.getArtifactInfo(spaceId, artifactId);
        if (!info) throw new Error("Artifact not found");
        const filePath = this.getArtifactPath(spaceId, info.storageKey);
        await this.deleteFile(filePath);
        await this.dataAdapter.deleteArtifact(artifactId, spaceId);
      }
    };
  }
});

// src/manager.ts
init_factory();

// src/storage/space.ts
import os3 from "os";
import path3 from "path";

// src/storage/base.ts
import path2 from "path";
import os2 from "os";
function resolveVibexRoot() {
  return process.env.VIBEX_STORAGE_PATH || path2.join(os2.homedir(), ".vibex");
}
var BaseStorage = class {
  constructor(basePath, adapter) {
    __publicField(this, "adapter");
    __publicField(this, "basePath");
    this.basePath = basePath || resolveVibexRoot();
    if (adapter) {
      this.adapter = adapter;
    } else {
      if (typeof window === "undefined") {
        const { LocalStorageAdapter: LocalStorageAdapter2 } = (init_local2(), __toCommonJS(local_exports));
        this.adapter = new LocalStorageAdapter2();
      } else {
        throw new Error(
          "LocalStorageAdapter cannot be used in client code. Provide a client-compatible adapter."
        );
      }
    }
  }
  /**
   * Get full path relative to base
   */
  getPath(...segments) {
    return path2.join(this.basePath, ...segments);
  }
  /**
   * Initialize storage (ensure directories exist)
   */
  async initialize() {
    await this.adapter.mkdir(this.basePath);
  }
  /**
   * Read JSON file
   */
  async readJSON(relativePath) {
    try {
      const fullPath = this.getPath(relativePath);
      const content = await this.adapter.readTextFile(fullPath);
      return JSON.parse(content);
    } catch (error) {
      if (error.code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }
  /**
   * Read YAML file
   */
  async readYaml(relativePath) {
    try {
      const fullPath = this.getPath(relativePath);
      const content = await this.adapter.readTextFile(fullPath);
      const yaml = await import("yaml");
      return yaml.parse(content);
    } catch (error) {
      if (error.code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }
  /**
   * Write JSON file
   */
  async writeJSON(relativePath, data) {
    const fullPath = this.getPath(relativePath);
    const content = JSON.stringify(data, null, 2);
    await this.adapter.writeFile(fullPath, content);
  }
  /**
   * Check if file exists
   */
  async exists(relativePath) {
    const fullPath = this.getPath(relativePath);
    return this.adapter.exists(fullPath);
  }
  /**
   * Read text file
   */
  async readTextFile(relativePath) {
    const fullPath = this.getPath(relativePath);
    return this.adapter.readTextFile(fullPath);
  }
  /**
   * Write file (text or binary)
   */
  async writeFile(relativePath, data) {
    const fullPath = this.getPath(relativePath);
    await this.adapter.writeFile(fullPath, data);
  }
  /**
   * Delete file
   */
  async delete(relativePath) {
    const fullPath = this.getPath(relativePath);
    await this.adapter.deleteFile(fullPath);
  }
  /**
   * List files in directory
   */
  async list(relativePath = "") {
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
  async mkdir(relativePath) {
    const fullPath = this.getPath(relativePath);
    await this.adapter.mkdir(fullPath);
  }
  /**
   * Read binary file
   */
  async readFile(relativePath) {
    const fullPath = this.getPath(relativePath);
    return this.adapter.readFile(fullPath);
  }
  /**
   * Copy file from one storage to another
   */
  async copyFileTo(relativePath, targetStorage, targetPath) {
    const fileData = await this.readFile(relativePath);
    await targetStorage.writeFile(targetPath, fileData);
  }
};

// src/storage/space.ts
function resolveRoot2() {
  return process.env.VIBEX_STORAGE_PATH || path3.join(os3.homedir(), ".vibex");
}
var SpaceStorage = class extends BaseStorage {
  constructor(options) {
    super(options.rootPath, options.adapter);
    __publicField(this, "spaceId");
    this.spaceId = options.spaceId;
  }
  getSpacePath() {
    return this.basePath;
  }
  getFilePath(filename) {
    return this.getPath(filename);
  }
  async saveFile(filename, data) {
    const content = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    await this.writeFile(filename, content);
  }
  async saveFileBuffer(filename, data) {
    await this.writeFile(filename, data);
  }
  /**
   * DEPRECATED: Use artifact operations below instead
   * Save an artifact file (low-level file operation only)
   */
  async saveArtifact(storageKey, buffer, _metadata, _originalFilename) {
    const artifactPath = `artifacts/${storageKey}`;
    await this.mkdir("artifacts");
    await this.writeFile(artifactPath, buffer);
  }
  // ==================== High-Level Artifact Operations ====================
  async saveCompleteArtifact(artifact, buffer) {
    return this.adapter.saveArtifact(this.spaceId, artifact, buffer);
  }
  async getCompleteArtifact(artifactId) {
    return this.adapter.getArtifact(this.spaceId, artifactId);
  }
  async getArtifactInfo(artifactId) {
    return this.adapter.getArtifactInfo(this.spaceId, artifactId);
  }
  async listArtifacts() {
    return this.adapter.listArtifacts(this.spaceId);
  }
  async deleteCompleteArtifact(artifactId) {
    return this.adapter.deleteArtifact(this.spaceId, artifactId);
  }
  async listFiles() {
    return this.list();
  }
  async createDirectory(dirname) {
    await this.mkdir(dirname);
  }
  async getMetadata() {
    return this.readJSON("metadata.json");
  }
  async saveMetadata(metadata) {
    await this.writeJSON("metadata.json", metadata);
  }
  async getArtifact(filename) {
    try {
      const artifactPath = `artifacts/${filename}`;
      const content = await this.readFile(artifactPath);
      return { content, metadata: null };
    } catch (error) {
      return null;
    }
  }
  async cleanup() {
    const files = await this.listFiles();
    for (const file of files) {
      if (file.startsWith("tmp_") || file.endsWith(".tmp")) {
        await this.delete(file);
      }
    }
  }
};
var _SpaceStorageFactory = class _SpaceStorageFactory {
  static setRootPath(rootPath) {
    _SpaceStorageFactory.rootPath = rootPath;
  }
  static async create(spaceId) {
    if (typeof window !== "undefined") {
      throw new Error(
        "SpaceStorageFactory.create() can only run on the server"
      );
    }
    const { LocalStorageAdapter: LocalStorageAdapter2 } = (init_local2(), __toCommonJS(local_exports));
    const adapter = new LocalStorageAdapter2();
    const baseRoot = _SpaceStorageFactory.rootPath || resolveRoot2();
    const rootPath = path3.join(baseRoot, "spaces", spaceId);
    const storage = new SpaceStorage({
      rootPath,
      spaceId,
      adapter
    });
    await storage.initialize();
    return storage;
  }
  static async list() {
    if (typeof window !== "undefined") {
      throw new Error("SpaceStorageFactory.list() can only run on the server");
    }
    try {
      const fs2 = __require("fs").promises;
      const rootPath = _SpaceStorageFactory.rootPath || resolveRoot2();
      const spacesPath = path3.join(rootPath, "spaces");
      try {
        await fs2.access(spacesPath);
      } catch {
        return [];
      }
      const entries = await fs2.readdir(spacesPath);
      const spaces = [];
      for (const entry of entries) {
        const entryPath = path3.join(spacesPath, entry);
        const stat = await fs2.stat(entryPath);
        if (stat.isDirectory() && !entry.startsWith(".")) {
          spaces.push(entry);
        }
      }
      return spaces;
    } catch {
      return [];
    }
  }
  static async exists(spaceId) {
    const storage = await _SpaceStorageFactory.create(spaceId);
    return storage.exists("space.json");
  }
  static async delete(spaceId) {
    const storage = await _SpaceStorageFactory.create(spaceId);
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
    }
  }
};
__publicField(_SpaceStorageFactory, "rootPath", null);
var SpaceStorageFactory = _SpaceStorageFactory;

// src/manager.ts
var VibexDataManager = class _VibexDataManager {
  // 5 minutes default
  constructor(dataAdapter) {
    __publicField(this, "dataAdapter");
    __publicField(this, "cache");
    __publicField(this, "subscriptions");
    __publicField(this, "cacheTTL", 5 * 60 * 1e3);
    this.dataAdapter = dataAdapter || getDataAdapter();
    this.cache = /* @__PURE__ */ new Map();
    this.subscriptions = /* @__PURE__ */ new Map();
  }
  /**
   * Create a server-side instance (uses direct database access)
   * Uses dynamic import to avoid bundling server code in client
   *
   * NOTE: This should only be called from server-side code (API routes, server components)
   */
  static async createServer() {
    const { getServerDataAdapter: getServerDataAdapter2 } = await import("./factory-5W2EU5BD.mjs");
    return new _VibexDataManager(getServerDataAdapter2());
  }
  /**
   * Create a server-side instance synchronously (for use in server contexts)
   * This uses require() to avoid bundling in client code
   */
  static createServerSync() {
    if (typeof window !== "undefined") {
      throw new Error("createServerSync() can only be called on the server");
    }
    const { getServerDataAdapter: getServerDataAdapter2 } = (init_factory(), __toCommonJS(factory_exports));
    return new _VibexDataManager(getServerDataAdapter2());
  }
  /**
   * Create a client-side instance (uses API calls)
   * @deprecated Client-side direct usage is deprecated. Use server actions instead.
   */
  static createClient() {
    throw new Error(
      "VibexDataManager.createClient() is deprecated. Use server actions."
    );
  }
  // ==================== Cache Management ====================
  getCacheKey(prefix, id) {
    return id ? `${prefix}:${id}` : prefix;
  }
  getCached(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    const age = Date.now() - cached.timestamp;
    if (age > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }
    return cached.data;
  }
  setCache(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
  invalidateCache(pattern) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
      }
    }
  }
  notifySubscribers(key, data) {
    const callbacks = this.subscriptions.get(key);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (error) {
          console.error(
            `[VibexDataManager] Subscription callback error:`,
            error
          );
        }
      });
    }
  }
  // ==================== Space Operations ====================
  /**
   * Get a single space by ID
   */
  async getSpace(spaceId) {
    const cacheKey = this.getCacheKey("space", spaceId);
    const cached = this.getCached(cacheKey);
    if (cached) return cached;
    const space = await this.dataAdapter.getSpace(spaceId);
    if (space) {
      this.setCache(cacheKey, space);
    }
    return space;
  }
  /**
   * List all spaces with optional filters
   */
  async listSpaces(filters) {
    const cacheKey = `spaces:${JSON.stringify(filters || {})}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;
    let spaces = await this.dataAdapter.getSpaces();
    if (filters) {
      if (filters.userId) {
        spaces = spaces.filter((s) => s.userId === filters.userId);
      }
      if (filters.name) {
        const nameLower = filters.name.toLowerCase();
        spaces = spaces.filter(
          (s) => s.name?.toLowerCase().includes(nameLower)
        );
      }
      if (filters.createdAfter) {
        spaces = spaces.filter((s) => {
          if (!s.createdAt) return false;
          return new Date(s.createdAt) >= filters.createdAfter;
        });
      }
      if (filters.createdBefore) {
        spaces = spaces.filter((s) => {
          if (!s.createdAt) return false;
          return new Date(s.createdAt) <= filters.createdBefore;
        });
      }
    }
    this.setCache(cacheKey, spaces);
    return spaces;
  }
  /**
   * Create a new space
   */
  async createSpace(space) {
    const newSpace = await this.dataAdapter.saveSpace({
      id: space.id || `space-${Date.now()}`,
      name: space.name || "New Space",
      description: space.description,
      userId: space.userId,
      config: space.config,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    this.invalidateCache("spaces:");
    this.invalidateCache("space:");
    this.notifySubscribers("spaces", newSpace);
    this.notifySubscribers(`space:${newSpace.id}`, newSpace);
    return newSpace;
  }
  /**
   * Update a space
   */
  async updateSpace(spaceId, updates) {
    const existing = await this.getSpace(spaceId);
    if (!existing) {
      throw new Error(`Space ${spaceId} not found`);
    }
    const updated = await this.dataAdapter.saveSpace({
      ...existing,
      ...updates,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    this.setCache(this.getCacheKey("space", spaceId), updated);
    this.invalidateCache("spaces:");
    this.notifySubscribers(`space:${spaceId}`, updated);
    this.notifySubscribers("spaces", updated);
    return updated;
  }
  /**
   * Delete a space
   */
  async deleteSpace(spaceId) {
    await this.dataAdapter.deleteSpace(spaceId);
    this.invalidateCache("space:");
    this.invalidateCache("spaces:");
    this.invalidateCache(`artifacts:space:${spaceId}`);
    this.notifySubscribers(`space:${spaceId}`, null);
    this.notifySubscribers("spaces", null);
  }
  /**
   * Subscribe to space changes
   */
  subscribeToSpace(spaceId, callback) {
    const key = `space:${spaceId}`;
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, /* @__PURE__ */ new Set());
    }
    this.subscriptions.get(key).add(callback);
    this.getSpace(spaceId).then((space) => callback(space));
    return () => {
      const callbacks = this.subscriptions.get(key);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscriptions.delete(key);
        }
      }
    };
  }
  /**
   * Subscribe to all spaces
   */
  subscribeToSpaces(callback) {
    const key = "spaces";
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, /* @__PURE__ */ new Set());
    }
    this.subscriptions.get(key).add(callback);
    this.listSpaces().then((spaces) => callback(spaces));
    return () => {
      const callbacks = this.subscriptions.get(key);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscriptions.delete(key);
        }
      }
    };
  }
  // ==================== Artifact Operations ====================
  /**
   * Get artifacts for a space
   */
  async getArtifacts(spaceId, filters) {
    const cacheKey = `artifacts:space:${spaceId}:${JSON.stringify(
      filters || {}
    )}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;
    let artifacts = await this.dataAdapter.getArtifacts(spaceId);
    if (filters) {
      if (filters.taskId) {
        artifacts = artifacts.filter((a) => a.taskId === filters.taskId);
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
  /**
   * Get a single artifact by ID
   */
  async getArtifact(artifactId) {
    const cacheKey = this.getCacheKey("artifact", artifactId);
    const cached = this.getCached(cacheKey);
    if (cached) return cached;
    const artifact = await this.dataAdapter.getArtifact(artifactId);
    if (artifact) {
      this.setCache(cacheKey, artifact);
    }
    return artifact;
  }
  /**
   * Create an artifact (metadata only - file upload handled separately)
   */
  async createArtifact(spaceId, artifact) {
    const newArtifact = await this.dataAdapter.saveArtifact({
      id: artifact.id || `artifact-${Date.now()}`,
      spaceId,
      userId: artifact.userId,
      taskId: artifact.taskId,
      category: artifact.category || "intermediate",
      storageKey: artifact.storageKey || "",
      originalName: artifact.originalName || "untitled",
      mimeType: artifact.mimeType || "application/octet-stream",
      sizeBytes: artifact.sizeBytes || 0,
      metadata: artifact.metadata,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    this.invalidateCache(`artifacts:space:${spaceId}`);
    this.setCache(this.getCacheKey("artifact", newArtifact.id), newArtifact);
    this.notifySubscribers(`artifacts:space:${spaceId}`, newArtifact);
    this.notifySubscribers(`artifact:${newArtifact.id}`, newArtifact);
    return newArtifact;
  }
  /**
   * Update an artifact
   */
  async updateArtifact(artifactId, updates) {
    const existing = await this.getArtifact(artifactId);
    if (!existing) {
      throw new Error(`Artifact ${artifactId} not found`);
    }
    const updated = await this.dataAdapter.saveArtifact({
      ...existing,
      ...updates,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
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
  /**
   * Delete an artifact
   */
  async deleteArtifact(artifactId, spaceId) {
    await this.dataAdapter.deleteArtifact(artifactId);
    this.invalidateCache(`artifact:${artifactId}`);
    this.invalidateCache(`artifacts:space:${spaceId}`);
    this.notifySubscribers(`artifact:${artifactId}`, null);
    this.notifySubscribers(`artifacts:space:${spaceId}`, null);
  }
  /**
   * Subscribe to artifacts for a space
   */
  subscribeToArtifacts(spaceId, callback) {
    const key = `artifacts:space:${spaceId}`;
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, /* @__PURE__ */ new Set());
    }
    this.subscriptions.get(key).add(callback);
    this.getArtifacts(spaceId).then((artifacts) => callback(artifacts));
    return () => {
      const callbacks = this.subscriptions.get(key);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscriptions.delete(key);
        }
      }
    };
  }
  // ==================== Task Operations ====================
  /**
   * Get tasks for a space
   */
  async getTasks(spaceId, filters) {
    const cacheKey = `tasks:space:${spaceId}:${JSON.stringify(filters || {})}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;
    let tasks = await this.dataAdapter.getTasks(spaceId);
    if (filters) {
      if (filters.status) {
        tasks = tasks.filter((t) => t.metadata?.status === filters.status);
      }
      if (filters.createdAfter) {
        tasks = tasks.filter((t) => {
          if (!t.createdAt) return false;
          return new Date(t.createdAt) >= filters.createdAfter;
        });
      }
    }
    this.setCache(cacheKey, tasks);
    return tasks;
  }
  /**
   * Get a single task by ID
   */
  async getTask(taskId) {
    const cacheKey = this.getCacheKey("task", taskId);
    const cached = this.getCached(cacheKey);
    if (cached) return cached;
    const task = await this.dataAdapter.getTask(taskId);
    if (task) {
      this.setCache(cacheKey, task);
    }
    return task;
  }
  /**
   * Create a new task
   */
  async createTask(spaceId, task) {
    const newTask = await this.dataAdapter.saveTask({
      id: task.id || `task-${Date.now()}`,
      spaceId,
      userId: task.userId,
      title: task.title,
      metadata: task.metadata,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    this.invalidateCache(`tasks:space:${spaceId}`);
    this.setCache(this.getCacheKey("task", newTask.id), newTask);
    this.notifySubscribers(`tasks:space:${spaceId}`, newTask);
    this.notifySubscribers(`task:${newTask.id}`, newTask);
    return newTask;
  }
  /**
   * Update a task
   */
  async updateTask(taskId, updates) {
    const existing = await this.getTask(taskId);
    if (!existing) {
      throw new Error(`Task ${taskId} not found`);
    }
    const updated = await this.dataAdapter.saveTask({
      ...existing,
      ...updates,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    this.setCache(this.getCacheKey("task", taskId), updated);
    this.invalidateCache(`tasks:space:${existing.spaceId}`);
    this.notifySubscribers(`task:${taskId}`, updated);
    this.notifySubscribers(`tasks:space:${existing.spaceId}`, updated);
    return updated;
  }
  /**
   * Delete a task
   */
  async deleteTask(taskId, spaceId) {
    await this.dataAdapter.deleteTask(taskId);
    this.invalidateCache(`task:${taskId}`);
    this.invalidateCache(`tasks:space:${spaceId}`);
    this.notifySubscribers(`task:${taskId}`, null);
    this.notifySubscribers(`tasks:space:${spaceId}`, null);
  }
  /**
   * Subscribe to tasks for a space
   */
  subscribeToTasks(spaceId, callback) {
    const key = `tasks:space:${spaceId}`;
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, /* @__PURE__ */ new Set());
    }
    this.subscriptions.get(key).add(callback);
    this.getTasks(spaceId).then((tasks) => callback(tasks));
    return () => {
      const callbacks = this.subscriptions.get(key);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscriptions.delete(key);
        }
      }
    };
  }
  // ==================== Agent Operations ====================
  /**
   * Get all agents
   */
  async getAgents() {
    const cacheKey = "agents";
    const cached = this.getCached(cacheKey);
    if (cached) return cached;
    const agents = await this.dataAdapter.getAgents();
    this.setCache(cacheKey, agents);
    return agents;
  }
  /**
   * Get a single agent by ID
   */
  async getAgent(agentId) {
    const cacheKey = this.getCacheKey("agent", agentId);
    const cached = this.getCached(cacheKey);
    if (cached) return cached;
    const agent = await this.dataAdapter.getAgent(agentId);
    if (agent) {
      this.setCache(cacheKey, agent);
    }
    return agent;
  }
  // ==================== Tool Operations ====================
  /**
   * Get all tools
   */
  async getTools() {
    const cacheKey = "tools";
    const cached = this.getCached(cacheKey);
    if (cached) return cached;
    const tools = await this.dataAdapter.getTools();
    this.setCache(cacheKey, tools);
    return tools;
  }
  /**
   * Get a single tool by ID
   */
  async getTool(toolId) {
    const cacheKey = this.getCacheKey("tool", toolId);
    const cached = this.getCached(cacheKey);
    if (cached) return cached;
    const tool = await this.dataAdapter.getTool(toolId);
    if (tool) {
      this.setCache(cacheKey, tool);
    }
    return tool;
  }
  // ==================== Storage Operations ====================
  /**
   * Get SpaceStorage instance for a space
   */
  async getSpaceStorage(spaceId) {
    return await SpaceStorageFactory.create(spaceId);
  }
  /**
   * Upload an artifact file
   */
  async uploadArtifactFile(spaceId, artifactId, file, filename) {
    const storage = await this.getSpaceStorage(spaceId);
    const storageKey = `artifacts/${artifactId}/${filename}`;
    await storage.saveFile(storageKey, file);
    return storageKey;
  }
  /**
   * Download an artifact file
   */
  async downloadArtifactFile(spaceId, storageKey) {
    const storage = await this.getSpaceStorage(spaceId);
    const buffer = await storage.readFile(storageKey);
    const uint8Array = new Uint8Array(buffer);
    return new Blob([uint8Array]);
  }
  /**
   * Delete an artifact file
   */
  async deleteArtifactFile(spaceId, storageKey) {
    const storage = await this.getSpaceStorage(spaceId);
    await storage.delete(storageKey);
  }
};
var serverInstance = null;
function getVibexDataManager() {
  return getVibexDataManagerServer();
}
function getVibexDataManagerServer() {
  if (typeof window !== "undefined") {
    throw new Error(
      "getVibexDataManagerServer() can only be called on the server"
    );
  }
  if (!serverInstance) {
    serverInstance = VibexDataManager.createServerSync();
  }
  return serverInstance;
}

// src/index.ts
init_factory();
init_local2();
export {
  BaseStorage,
  LocalStorageAdapter,
  SpaceStorage,
  SpaceStorageFactory,
  getDataAdapter,
  getServerDataAdapter,
  getVibexDataManager,
  getVibexDataManagerServer
};
