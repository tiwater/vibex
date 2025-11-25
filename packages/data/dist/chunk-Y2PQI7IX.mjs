var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/adapters/local.ts
import Database from "better-sqlite3";
import { customAlphabet } from "nanoid";
import os from "os";
import path from "path";
import fs from "fs";
function generateShortId(length = 8) {
  const nanoid = customAlphabet(ID_ALPHABET, length);
  let id = nanoid();
  while (!/^[a-zA-Z]/.test(id)) {
    id = nanoid();
  }
  return id;
}
function resolveRoot() {
  return process.env.VIBEX_STORAGE_PATH || path.join(os.homedir(), ".vibex");
}
var ID_ALPHABET, LocalDataAdapter;
var init_local = __esm({
  "src/adapters/local.ts"() {
    "use strict";
    ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789_ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    LocalDataAdapter = class {
      constructor() {
        __publicField(this, "db");
        const root = resolveRoot();
        if (!fs.existsSync(root)) {
          fs.mkdirSync(root, { recursive: true });
        }
        const dbPath = path.join(root, "vibex.db");
        this.db = new Database(dbPath);
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

export {
  __require,
  __esm,
  __export,
  __toCommonJS,
  __publicField,
  LocalDataAdapter,
  init_local,
  DataAdapterFactory,
  getDataAdapter,
  getServerDataAdapter,
  factory_exports,
  init_factory
};
