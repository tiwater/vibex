"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/adapters/local.ts
function generateShortId(length = 8) {
  const nanoid = (0, import_nanoid.customAlphabet)(ID_ALPHABET, length);
  let id = nanoid();
  while (!/^[a-zA-Z]/.test(id)) {
    id = nanoid();
  }
  return id;
}
function resolveRoot() {
  return process.env.VIBEX_STORAGE_PATH || import_path.default.join(import_os.default.homedir(), ".vibex");
}
var import_better_sqlite3, import_nanoid, import_os, import_path, import_fs, ID_ALPHABET, LocalDataAdapter;
var init_local = __esm({
  "src/adapters/local.ts"() {
    "use strict";
    import_better_sqlite3 = __toESM(require("better-sqlite3"));
    import_nanoid = require("nanoid");
    import_os = __toESM(require("os"));
    import_path = __toESM(require("path"));
    import_fs = __toESM(require("fs"));
    ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789_ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    LocalDataAdapter = class {
      constructor() {
        __publicField(this, "db");
        const root = resolveRoot();
        if (!import_fs.default.existsSync(root)) {
          import_fs.default.mkdirSync(root, { recursive: true });
        }
        const dbPath = import_path.default.join(root, "vibex.db");
        this.db = new import_better_sqlite3.default(dbPath);
        this.initSchema();
      }
      initSchema() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        role TEXT,
        goal TEXT,
        backstory TEXT,
        is_custom BOOLEAN DEFAULT 0,
        data JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS tools (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        version TEXT,
        author TEXT,
        is_custom BOOLEAN DEFAULT 0,
        data JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS spaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        config JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS artifacts (
        id TEXT PRIMARY KEY,
        space_id TEXT NOT NULL,
        task_id TEXT,
        storage_key TEXT NOT NULL,
        original_name TEXT,
        mime_type TEXT,
        size_bytes INTEGER,
        category TEXT,
        metadata JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(space_id) REFERENCES spaces(id) ON DELETE CASCADE
      )
    `);
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        space_id TEXT NOT NULL,
        title TEXT,
        description TEXT,
        status TEXT,
        assigned_to TEXT,
        priority TEXT,
        data JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(space_id) REFERENCES spaces(id) ON DELETE CASCADE
      )
    `);
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS model_providers (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        data JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS datasources (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        config JSON,
        data JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
      }
      // ==================== Agents ====================
      async getAgents() {
        const rows = this.db.prepare("SELECT * FROM agents ORDER BY created_at DESC").all();
        return rows.map((row) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          role: row.role,
          goal: row.goal,
          backstory: row.backstory,
          isCustom: !!row.is_custom,
          ...JSON.parse(row.data || "{}"),
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }));
      }
      async getAgent(id) {
        const row = this.db.prepare("SELECT * FROM agents WHERE id = ?").get(id);
        if (!row) return null;
        return {
          id: row.id,
          name: row.name,
          description: row.description,
          role: row.role,
          goal: row.goal,
          backstory: row.backstory,
          isCustom: !!row.is_custom,
          ...JSON.parse(row.data || "{}"),
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };
      }
      async saveAgent(agent) {
        const {
          id,
          name,
          description,
          role,
          goal,
          backstory,
          isCustom,
          createdAt,
          updatedAt,
          ...rest
        } = agent;
        const now = (/* @__PURE__ */ new Date()).toISOString();
        this.db.prepare(
          `
      INSERT INTO agents (id, name, description, role, goal, backstory, is_custom, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name,
        description=excluded.description,
        role=excluded.role,
        goal=excluded.goal,
        backstory=excluded.backstory,
        is_custom=excluded.is_custom,
        data=excluded.data,
        updated_at=excluded.updated_at
    `
        ).run(
          id,
          name,
          description || null,
          role || null,
          goal || null,
          backstory || null,
          isCustom ? 1 : 0,
          JSON.stringify(rest),
          createdAt || now,
          now
        );
        return agent;
      }
      async deleteAgent(id) {
        this.db.prepare("DELETE FROM agents WHERE id = ?").run(id);
      }
      async cloneAgent(id) {
        const agent = await this.getAgent(id);
        if (!agent) throw new Error(`Agent ${id} not found`);
        const newId = `custom-${generateShortId(8)}`;
        const cloned = { ...agent, id: newId, isCustom: true };
        return await this.saveAgent(cloned);
      }
      // ==================== Tools ====================
      async getTools() {
        const rows = this.db.prepare("SELECT * FROM tools ORDER BY created_at DESC").all();
        return rows.map((row) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          version: row.version,
          author: row.author,
          isCustom: !!row.is_custom,
          ...JSON.parse(row.data || "{}"),
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }));
      }
      async getTool(id) {
        const row = this.db.prepare("SELECT * FROM tools WHERE id = ?").get(id);
        if (!row) return null;
        return {
          id: row.id,
          name: row.name,
          description: row.description,
          version: row.version,
          author: row.author,
          isCustom: !!row.is_custom,
          ...JSON.parse(row.data || "{}"),
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };
      }
      async saveTool(tool) {
        const {
          id,
          name,
          description,
          version,
          author,
          isCustom,
          createdAt,
          updatedAt,
          ...rest
        } = tool;
        const now = (/* @__PURE__ */ new Date()).toISOString();
        this.db.prepare(
          `
      INSERT INTO tools (id, name, description, version, author, is_custom, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name,
        description=excluded.description,
        version=excluded.version,
        author=excluded.author,
        is_custom=excluded.is_custom,
        data=excluded.data,
        updated_at=excluded.updated_at
    `
        ).run(
          id,
          name,
          description || null,
          version || null,
          author || null,
          isCustom ? 1 : 0,
          JSON.stringify(rest),
          createdAt || now,
          now
        );
        return tool;
      }
      async deleteTool(id) {
        this.db.prepare("DELETE FROM tools WHERE id = ?").run(id);
      }
      async cloneTool(id) {
        const tool = await this.getTool(id);
        if (!tool) throw new Error(`Tool ${id} not found`);
        const newId = `custom-${generateShortId(8)}`;
        const cloned = { ...tool, id: newId };
        return await this.saveTool(cloned);
      }
      // ==================== Spaces ====================
      async getSpaces() {
        const rows = this.db.prepare("SELECT * FROM spaces ORDER BY updated_at DESC").all();
        return rows.map((row) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          config: JSON.parse(row.config || "{}"),
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }));
      }
      async getSpace(id) {
        const row = this.db.prepare("SELECT * FROM spaces WHERE id = ?").get(id);
        if (!row) return null;
        return {
          id: row.id,
          name: row.name,
          description: row.description,
          config: JSON.parse(row.config || "{}"),
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };
      }
      async saveSpace(space) {
        const { id, name, description, config, createdAt, updatedAt } = space;
        const now = (/* @__PURE__ */ new Date()).toISOString();
        this.db.prepare(
          `
      INSERT INTO spaces (id, name, description, config, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name,
        description=excluded.description,
        config=excluded.config,
        updated_at=excluded.updated_at
    `
        ).run(
          id,
          name,
          description || null,
          JSON.stringify(config || {}),
          createdAt || now,
          now
        );
        return space;
      }
      async deleteSpace(id) {
        this.db.prepare("DELETE FROM spaces WHERE id = ?").run(id);
      }
      // ==================== Artifacts ====================
      async getArtifacts(spaceId) {
        const rows = this.db.prepare(
          "SELECT * FROM artifacts WHERE space_id = ? ORDER BY created_at DESC"
        ).all(spaceId);
        return rows.map((row) => ({
          id: row.id,
          spaceId: row.space_id,
          taskId: row.task_id,
          storageKey: row.storage_key,
          originalName: row.original_name,
          mimeType: row.mime_type,
          sizeBytes: row.size_bytes,
          category: row.category,
          metadata: JSON.parse(row.metadata || "{}"),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          artifactType: "file"
        }));
      }
      async getArtifact(id, spaceId) {
        let query = "SELECT * FROM artifacts WHERE id = ?";
        const params = [id];
        if (spaceId) {
          query += " AND space_id = ?";
          params.push(spaceId);
        }
        const row = this.db.prepare(query).get(...params);
        if (!row) return null;
        return {
          id: row.id,
          spaceId: row.space_id,
          taskId: row.task_id,
          storageKey: row.storage_key,
          originalName: row.original_name,
          mimeType: row.mime_type,
          sizeBytes: row.size_bytes,
          category: row.category,
          metadata: JSON.parse(row.metadata || "{}"),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          artifactType: "file"
        };
      }
      async saveArtifact(artifact) {
        const {
          id,
          spaceId,
          taskId,
          storageKey,
          originalName,
          mimeType,
          sizeBytes,
          category,
          metadata,
          createdAt,
          updatedAt
        } = artifact;
        const now = (/* @__PURE__ */ new Date()).toISOString();
        this.db.prepare(
          `
      INSERT INTO artifacts (id, space_id, task_id, storage_key, original_name, mime_type, size_bytes, category, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        space_id=excluded.space_id,
        task_id=excluded.task_id,
        storage_key=excluded.storage_key,
        original_name=excluded.original_name,
        mime_type=excluded.mime_type,
        size_bytes=excluded.size_bytes,
        category=excluded.category,
        metadata=excluded.metadata,
        updated_at=excluded.updated_at
    `
        ).run(
          id,
          spaceId,
          taskId || null,
          storageKey,
          originalName || null,
          mimeType || null,
          sizeBytes || null,
          category || null,
          JSON.stringify(metadata || {}),
          createdAt || now,
          now
        );
        return artifact;
      }
      async deleteArtifact(id, spaceId) {
        let query = "DELETE FROM artifacts WHERE id = ?";
        const params = [id];
        if (spaceId) {
          query += " AND space_id = ?";
          params.push(spaceId);
        }
        this.db.prepare(query).run(...params);
      }
      async getArtifactsBySpace(spaceId) {
        const rows = this.db.prepare(
          "SELECT * FROM artifacts WHERE space_id = ? AND task_id IS NULL ORDER BY created_at DESC"
        ).all(spaceId);
        return rows.map((row) => ({
          id: row.id,
          spaceId: row.space_id,
          taskId: row.task_id,
          storageKey: row.storage_key,
          originalName: row.original_name,
          mimeType: row.mime_type,
          sizeBytes: row.size_bytes,
          category: row.category,
          metadata: JSON.parse(row.metadata || "{}"),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          artifactType: "file"
        }));
      }
      async getArtifactsByTask(taskId) {
        const rows = this.db.prepare(
          "SELECT * FROM artifacts WHERE task_id = ? ORDER BY created_at DESC"
        ).all(taskId);
        return rows.map((row) => ({
          id: row.id,
          spaceId: row.space_id,
          taskId: row.task_id,
          storageKey: row.storage_key,
          originalName: row.original_name,
          mimeType: row.mime_type,
          sizeBytes: row.size_bytes,
          category: row.category,
          metadata: JSON.parse(row.metadata || "{}"),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          artifactType: "file"
        }));
      }
      async getArtifactsByCategory(spaceOrTaskId, category, isTask = false) {
        const field = isTask ? "task_id" : "space_id";
        const rows = this.db.prepare(
          `SELECT * FROM artifacts WHERE ${field} = ? AND category = ? ORDER BY created_at DESC`
        ).all(spaceOrTaskId, category);
        return rows.map((row) => ({
          id: row.id,
          spaceId: row.space_id,
          taskId: row.task_id,
          storageKey: row.storage_key,
          originalName: row.original_name,
          mimeType: row.mime_type,
          sizeBytes: row.size_bytes,
          category: row.category,
          metadata: JSON.parse(row.metadata || "{}"),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          artifactType: "file"
        }));
      }
      // ==================== Tasks ====================
      async getTasks(spaceId) {
        const rows = this.db.prepare(
          "SELECT * FROM tasks WHERE space_id = ? ORDER BY updated_at DESC"
        ).all(spaceId);
        return rows.map((row) => ({
          id: row.id,
          spaceId: row.space_id,
          title: row.title,
          description: row.description,
          status: row.status,
          assignedTo: row.assigned_to,
          priority: row.priority,
          ...JSON.parse(row.data || "{}"),
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }));
      }
      async getTask(id) {
        const row = this.db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
        if (!row) return null;
        return {
          id: row.id,
          spaceId: row.space_id,
          title: row.title,
          description: row.description,
          status: row.status,
          assignedTo: row.assigned_to,
          priority: row.priority,
          ...JSON.parse(row.data || "{}"),
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };
      }
      async saveTask(task) {
        const {
          id,
          spaceId,
          title,
          description,
          status,
          assignedTo,
          priority,
          createdAt,
          updatedAt,
          ...rest
        } = task;
        const now = (/* @__PURE__ */ new Date()).toISOString();
        this.db.prepare(
          `
      INSERT INTO tasks (id, space_id, title, description, status, assigned_to, priority, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        space_id=excluded.space_id,
        title=excluded.title,
        description=excluded.description,
        status=excluded.status,
        assigned_to=excluded.assigned_to,
        priority=excluded.priority,
        data=excluded.data,
        updated_at=excluded.updated_at
    `
        ).run(
          id,
          spaceId,
          title || null,
          description || null,
          status || null,
          assignedTo || null,
          priority || null,
          JSON.stringify(rest),
          createdAt || now,
          now
        );
        return task;
      }
      async deleteTask(id) {
        this.db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
      }
      // ==================== Conversations (Mapped to Tasks) ====================
      async getConversations(spaceId) {
        const tasks = await this.getTasks(spaceId);
        return tasks;
      }
      async getConversation(id, spaceId) {
        let query = "SELECT * FROM tasks WHERE id = ?";
        const params = [id];
        if (spaceId) {
          query += " AND space_id = ?";
          params.push(spaceId);
        }
        const row = this.db.prepare(query).get(...params);
        if (!row) return null;
        return {
          id: row.id,
          spaceId: row.space_id,
          title: row.title,
          description: row.description,
          status: row.status,
          assignedTo: row.assigned_to,
          priority: row.priority,
          ...JSON.parse(row.data || "{}"),
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };
      }
      async saveConversation(conversation) {
        return await this.saveTask(
          conversation
        );
      }
      async deleteConversation(id, spaceId) {
        let query = "DELETE FROM tasks WHERE id = ?";
        const params = [id];
        if (spaceId) {
          query += " AND space_id = ?";
          params.push(spaceId);
        }
        this.db.prepare(query).run(...params);
      }
      // ==================== Model Providers ====================
      async getModelProviders() {
        const rows = this.db.prepare("SELECT * FROM model_providers ORDER BY created_at DESC").all();
        return rows.map((row) => ({
          id: row.id,
          provider: row.provider,
          ...JSON.parse(row.data || "{}"),
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }));
      }
      async getModelProvider(id) {
        const row = this.db.prepare("SELECT * FROM model_providers WHERE id = ?").get(id);
        if (!row) return null;
        return {
          id: row.id,
          provider: row.provider,
          ...JSON.parse(row.data || "{}"),
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };
      }
      async saveModelProvider(provider) {
        const {
          id,
          provider: providerName,
          createdAt,
          updatedAt,
          ...rest
        } = provider;
        const now = (/* @__PURE__ */ new Date()).toISOString();
        this.db.prepare(
          `
      INSERT INTO model_providers (id, provider, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        provider=excluded.provider,
        data=excluded.data,
        updated_at=excluded.updated_at
    `
        ).run(id, providerName, JSON.stringify(rest), createdAt || now, now);
        return provider;
      }
      async deleteModelProvider(id) {
        this.db.prepare("DELETE FROM model_providers WHERE id = ?").run(id);
      }
      // ==================== Datasources ====================
      async getDatasources() {
        const rows = this.db.prepare("SELECT * FROM datasources ORDER BY created_at DESC").all();
        return rows.map((row) => ({
          id: row.id,
          name: row.name,
          type: row.type,
          config: JSON.parse(row.config || "{}"),
          ...JSON.parse(row.data || "{}"),
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }));
      }
      async getDatasource(id) {
        const row = this.db.prepare("SELECT * FROM datasources WHERE id = ?").get(id);
        if (!row) return null;
        return {
          id: row.id,
          name: row.name,
          type: row.type,
          config: JSON.parse(row.config || "{}"),
          ...JSON.parse(row.data || "{}"),
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };
      }
      async saveDatasource(datasource) {
        const { id, name, type, config, createdAt, updatedAt, ...rest } = datasource;
        const now = (/* @__PURE__ */ new Date()).toISOString();
        this.db.prepare(
          `
      INSERT INTO datasources (id, name, type, config, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name,
        type=excluded.type,
        config=excluded.config,
        data=excluded.data,
        updated_at=excluded.updated_at
    `
        ).run(
          id,
          name,
          type,
          JSON.stringify(config || {}),
          JSON.stringify(rest),
          createdAt || now,
          now
        );
        return datasource;
      }
      async deleteDatasource(id) {
        this.db.prepare("DELETE FROM datasources WHERE id = ?").run(id);
      }
    };
  }
});

// src/factory.ts
var factory_exports = {};
__export(factory_exports, {
  DataAdapterFactory: () => DataAdapterFactory,
  getDataAdapter: () => getDataAdapter,
  getServerDataAdapter: () => getServerDataAdapter
});
function getDataAdapter() {
  return DataAdapterFactory.create();
}
function getServerDataAdapter() {
  if (typeof window !== "undefined") {
    throw new Error("getServerDataAdapter() can only be called on the server");
  }
  const mode = DataAdapterFactory.getCurrentMode();
  if (mode === "database") {
    throw new Error(
      "No database adapter registered. Install a backend package (e.g. @vibex/supabase) and provide its adapter explicitly."
    );
  }
  console.log("[VibexDataAdapter] Server: Using local mode (file-based)");
  return new LocalDataAdapter();
}
var DataAdapterFactory;
var init_factory = __esm({
  "src/factory.ts"() {
    "use strict";
    init_local();
    DataAdapterFactory = class {
      /**
       * Create or get singleton data adapter instance
       */
      static create(mode) {
        if (this.instance) {
          return this.instance;
        }
        const dataMode = mode || this.detectMode();
        if (dataMode === "database") {
          throw new Error(
            "Database adapters are not bundled with @vibex/data. Install @vibex/supabase (or another backend) and provide a custom adapter."
          );
        }
        console.log("[VibexDataAdapter] Using local mode (SQLite + filesystem)");
        this.instance = new LocalDataAdapter();
        return this.instance;
      }
      /**
       * Auto-detect which mode to use based on environment
       */
      static detectMode() {
        const explicitMode = process.env.VIBEX_DATA_MODE;
        if (explicitMode === "local" || explicitMode === "database") {
          return explicitMode;
        }
        return "local";
      }
      /**
       * Reset singleton instance (useful for testing)
       */
      static reset() {
        this.instance = null;
      }
      /**
       * Get current mode
       */
      static getCurrentMode() {
        return this.detectMode();
      }
    };
    __publicField(DataAdapterFactory, "instance", null);
  }
});

// src/storage/adapters/local.ts
var local_exports = {};
__export(local_exports, {
  LocalStorageAdapter: () => LocalStorageAdapter
});
function resolveRoot2() {
  return process.env.VIBEX_STORAGE_PATH || import_path2.default.join(import_os2.default.homedir(), ".vibex");
}
var import_fs2, import_os2, import_path2, LocalStorageAdapter;
var init_local2 = __esm({
  "src/storage/adapters/local.ts"() {
    "use strict";
    import_fs2 = require("fs");
    import_os2 = __toESM(require("os"));
    import_path2 = __toESM(require("path"));
    init_local();
    LocalStorageAdapter = class {
      constructor() {
        __publicField(this, "dataAdapter");
        this.dataAdapter = new LocalDataAdapter();
      }
      async readFile(filepath) {
        return import_fs2.promises.readFile(filepath);
      }
      async readTextFile(filepath) {
        return import_fs2.promises.readFile(filepath, "utf8");
      }
      async writeFile(filepath, data) {
        const dir = import_path2.default.dirname(filepath);
        await import_fs2.promises.mkdir(dir, { recursive: true });
        await import_fs2.promises.writeFile(filepath, data, typeof data === "string" ? "utf8" : void 0);
      }
      async deleteFile(filepath) {
        try {
          await import_fs2.promises.unlink(filepath);
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
      }
      async exists(filepath) {
        try {
          await import_fs2.promises.access(filepath);
          return true;
        } catch {
          return false;
        }
      }
      async mkdir(dirpath) {
        await import_fs2.promises.mkdir(dirpath, { recursive: true });
      }
      async readdir(dirpath) {
        return import_fs2.promises.readdir(dirpath);
      }
      async stat(filepath) {
        return import_fs2.promises.stat(filepath);
      }
      // ==================== Artifact Operations ====================
      getArtifactPath(spaceId, storageKey) {
        const root = resolveRoot2();
        return import_path2.default.join(root, "spaces", spaceId, "artifacts", storageKey);
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
          const buffer = await import_fs2.promises.readFile(filePath);
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

// src/index.ts
var index_exports = {};
__export(index_exports, {
  BaseStorage: () => BaseStorage,
  LocalStorageAdapter: () => LocalStorageAdapter,
  SpaceStorage: () => SpaceStorage,
  SpaceStorageFactory: () => SpaceStorageFactory,
  getDataAdapter: () => getDataAdapter,
  getServerDataAdapter: () => getServerDataAdapter,
  getVibexDataManager: () => getVibexDataManager,
  getVibexDataManagerServer: () => getVibexDataManagerServer
});
module.exports = __toCommonJS(index_exports);

// src/manager.ts
init_factory();

// src/storage/space.ts
var import_os4 = __toESM(require("os"));
var import_path4 = __toESM(require("path"));

// src/storage/base.ts
var import_path3 = __toESM(require("path"));
var import_os3 = __toESM(require("os"));
function resolveVibexRoot() {
  return process.env.VIBEX_STORAGE_PATH || import_path3.default.join(import_os3.default.homedir(), ".vibex");
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
    return import_path3.default.join(this.basePath, ...segments);
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
function resolveRoot3() {
  return process.env.VIBEX_STORAGE_PATH || import_path4.default.join(import_os4.default.homedir(), ".vibex");
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
    const baseRoot = _SpaceStorageFactory.rootPath || resolveRoot3();
    const rootPath = import_path4.default.join(baseRoot, "spaces", spaceId);
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
      const fs3 = require("fs").promises;
      const rootPath = _SpaceStorageFactory.rootPath || resolveRoot3();
      const spacesPath = import_path4.default.join(rootPath, "spaces");
      try {
        await fs3.access(spacesPath);
      } catch {
        return [];
      }
      const entries = await fs3.readdir(spacesPath);
      const spaces = [];
      for (const entry of entries) {
        const entryPath = import_path4.default.join(spacesPath, entry);
        const stat = await fs3.stat(entryPath);
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
    const { getServerDataAdapter: getServerDataAdapter2 } = await Promise.resolve().then(() => (init_factory(), factory_exports));
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BaseStorage,
  LocalStorageAdapter,
  SpaceStorage,
  SpaceStorageFactory,
  getDataAdapter,
  getServerDataAdapter,
  getVibexDataManager,
  getVibexDataManagerServer
});
