/**
 * LocalResourceAdapter - SQLite-based resource storage
 * Uses ~/.vibex/vibex.db for structured data
 */

import type { ResourceAdapter } from "../adapter";
import type {
  Agent,
  Tool,
  Space,
  Artifact,
  Conversation,
  Task,
  ModelProvider,
  Datasource,
} from "../types";
import Database from "better-sqlite3";
import { customAlphabet } from "nanoid";
import os from "os";
import path from "path";
import fs from "fs";

const ID_ALPHABET =
  "abcdefghijklmnopqrstuvwxyz0123456789_ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function generateShortId(length = 8): string {
  const nanoid = customAlphabet(ID_ALPHABET, length);
  let id = nanoid();
  while (!/^[a-zA-Z]/.test(id)) {
    id = nanoid();
  }
  return id;
}

function resolveRoot(): string {
  return process.env.VIBEX_STORAGE_PATH || path.join(os.homedir(), ".vibex");
}

export class LocalResourceAdapter implements ResourceAdapter {
  private db: Database.Database;

  constructor() {
    const root = resolveRoot();
    if (!fs.existsSync(root)) {
      fs.mkdirSync(root, { recursive: true });
    }
    const dbPath = path.join(root, "vibex.db");
    this.db = new Database(dbPath);
    this.initSchema();
  }

  private initSchema() {
    // Agents
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

    // Tools
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

    // Spaces
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

    // Artifacts
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

    // Tasks (Conversations included)
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

    // Model Providers
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS model_providers (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        data JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Datasources
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

  async getAgents(): Promise<Agent[]> {
    const rows = this.db
      .prepare("SELECT * FROM agents ORDER BY created_at DESC")
      .all() as any[];
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
      updatedAt: row.updated_at,
    }));
  }

  async getAgent(id: string): Promise<Agent | null> {
    const row = this.db
      .prepare("SELECT * FROM agents WHERE id = ?")
      .get(id) as any;
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
      updatedAt: row.updated_at,
    };
  }

  async saveAgent(agent: Agent): Promise<Agent> {
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

    const now = new Date().toISOString();
    this.db
      .prepare(
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
      )
      .run(
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

  async deleteAgent(id: string): Promise<void> {
    this.db.prepare("DELETE FROM agents WHERE id = ?").run(id);
  }

  async cloneAgent(id: string): Promise<Agent> {
    const agent = await this.getAgent(id);
    if (!agent) throw new Error(`Agent ${id} not found`);

    const newId = `custom-${generateShortId(8)}`;
    const cloned = { ...agent, id: newId, isCustom: true };

    return await this.saveAgent(cloned);
  }

  // ==================== Tools ====================

  async getTools(): Promise<Tool[]> {
    const rows = this.db
      .prepare("SELECT * FROM tools ORDER BY created_at DESC")
      .all() as any[];
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      version: row.version,
      author: row.author,
      isCustom: !!row.is_custom,
      ...JSON.parse(row.data || "{}"),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async getTool(id: string): Promise<Tool | null> {
    const row = this.db
      .prepare("SELECT * FROM tools WHERE id = ?")
      .get(id) as any;
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
      updatedAt: row.updated_at,
    };
  }

  async saveTool(tool: Tool): Promise<Tool> {
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
    const now = new Date().toISOString();

    this.db
      .prepare(
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
      )
      .run(
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

  async deleteTool(id: string): Promise<void> {
    this.db.prepare("DELETE FROM tools WHERE id = ?").run(id);
  }

  async cloneTool(id: string): Promise<Tool> {
    const tool = await this.getTool(id);
    if (!tool) throw new Error(`Tool ${id} not found`);

    const newId = `custom-${generateShortId(8)}`;
    const cloned = { ...tool, id: newId };

    return await this.saveTool(cloned);
  }

  // ==================== Spaces ====================

  async getSpaces(): Promise<Space[]> {
    const rows = this.db
      .prepare("SELECT * FROM spaces ORDER BY updated_at DESC")
      .all() as any[];
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      config: JSON.parse(row.config || "{}"),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async getSpace(id: string): Promise<Space | null> {
    const row = this.db
      .prepare("SELECT * FROM spaces WHERE id = ?")
      .get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      config: JSON.parse(row.config || "{}"),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async saveSpace(space: Space): Promise<Space> {
    const { id, name, description, config, createdAt, updatedAt } = space;
    const now = new Date().toISOString();

    this.db
      .prepare(
        `
      INSERT INTO spaces (id, name, description, config, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name,
        description=excluded.description,
        config=excluded.config,
        updated_at=excluded.updated_at
    `
      )
      .run(
        id,
        name,
        description || null,
        JSON.stringify(config || {}),
        createdAt || now,
        now
      );
    return space;
  }

  async deleteSpace(id: string): Promise<void> {
    this.db.prepare("DELETE FROM spaces WHERE id = ?").run(id);
  }

  // ==================== Artifacts ====================

  async getArtifacts(spaceId: string): Promise<Artifact[]> {
    const rows = this.db
      .prepare(
        "SELECT * FROM artifacts WHERE space_id = ? ORDER BY created_at DESC"
      )
      .all(spaceId) as any[];
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
      artifactType: "file",
    }));
  }

  async getArtifact(id: string, spaceId?: string): Promise<Artifact | null> {
    let query = "SELECT * FROM artifacts WHERE id = ?";
    const params = [id];
    if (spaceId) {
      query += " AND space_id = ?";
      params.push(spaceId);
    }

    const row = this.db.prepare(query).get(...params) as any;
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
      artifactType: "file",
    };
  }

  async saveArtifact(artifact: Artifact): Promise<Artifact> {
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
      updatedAt,
    } = artifact;
    const now = new Date().toISOString();

    this.db
      .prepare(
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
      )
      .run(
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

  async deleteArtifact(id: string, spaceId?: string): Promise<void> {
    let query = "DELETE FROM artifacts WHERE id = ?";
    const params = [id];
    if (spaceId) {
      query += " AND space_id = ?";
      params.push(spaceId);
    }
    this.db.prepare(query).run(...params);
  }

  async getArtifactsBySpace(spaceId: string): Promise<Artifact[]> {
    const rows = this.db
      .prepare(
        "SELECT * FROM artifacts WHERE space_id = ? AND task_id IS NULL ORDER BY created_at DESC"
      )
      .all(spaceId) as any[];
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
      artifactType: "file",
    }));
  }

  async getArtifactsByTask(taskId: string): Promise<Artifact[]> {
    const rows = this.db
      .prepare(
        "SELECT * FROM artifacts WHERE task_id = ? ORDER BY created_at DESC"
      )
      .all(taskId) as any[];
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
      artifactType: "file",
    }));
  }

  async getArtifactsByCategory(
    spaceOrTaskId: string,
    category: "input" | "intermediate" | "output",
    isTask = false
  ): Promise<Artifact[]> {
    const field = isTask ? "task_id" : "space_id";
    const rows = this.db
      .prepare(
        `SELECT * FROM artifacts WHERE ${field} = ? AND category = ? ORDER BY created_at DESC`
      )
      .all(spaceOrTaskId, category) as any[];
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
      artifactType: "file",
    }));
  }

  // ==================== Tasks ====================

  async getTasks(spaceId: string): Promise<Task[]> {
    const rows = this.db
      .prepare(
        "SELECT * FROM tasks WHERE space_id = ? ORDER BY updated_at DESC"
      )
      .all(spaceId) as any[];
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
      updatedAt: row.updated_at,
    }));
  }

  async getTask(id: string): Promise<Task | null> {
    const row = this.db
      .prepare("SELECT * FROM tasks WHERE id = ?")
      .get(id) as any;
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
      updatedAt: row.updated_at,
    };
  }

  async saveTask(task: Task): Promise<Task> {
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
    } = task as any;
    const now = new Date().toISOString();

    this.db
      .prepare(
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
      )
      .run(
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

  async deleteTask(id: string): Promise<void> {
    this.db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
  }

  // ==================== Conversations (Mapped to Tasks) ====================

  async getConversations(spaceId: string): Promise<Conversation[]> {
    const tasks = await this.getTasks(spaceId);
    return tasks as unknown as Conversation[];
  }

  async getConversation(
    id: string,
    spaceId?: string
  ): Promise<Conversation | null> {
    let query = "SELECT * FROM tasks WHERE id = ?";
    const params = [id];
    if (spaceId) {
      query += " AND space_id = ?";
      params.push(spaceId);
    }
    const row = this.db.prepare(query).get(...params) as any;
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
      updatedAt: row.updated_at,
    } as unknown as Conversation;
  }

  async saveConversation(conversation: Conversation): Promise<Conversation> {
    return (await this.saveTask(
      conversation as unknown as Task
    )) as unknown as Conversation;
  }

  async deleteConversation(id: string, spaceId?: string): Promise<void> {
    let query = "DELETE FROM tasks WHERE id = ?";
    const params = [id];
    if (spaceId) {
      query += " AND space_id = ?";
      params.push(spaceId);
    }
    this.db.prepare(query).run(...params);
  }

  // ==================== Model Providers ====================

  async getModelProviders(): Promise<ModelProvider[]> {
    const rows = this.db
      .prepare("SELECT * FROM model_providers ORDER BY created_at DESC")
      .all() as any[];
    return rows.map((row) => ({
      id: row.id,
      provider: row.provider,
      ...JSON.parse(row.data || "{}"),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async getModelProvider(id: string): Promise<ModelProvider | null> {
    const row = this.db
      .prepare("SELECT * FROM model_providers WHERE id = ?")
      .get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      provider: row.provider,
      ...JSON.parse(row.data || "{}"),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async saveModelProvider(provider: ModelProvider): Promise<ModelProvider> {
    const {
      id,
      provider: providerName,
      createdAt,
      updatedAt,
      ...rest
    } = provider;
    const now = new Date().toISOString();

    this.db
      .prepare(
        `
      INSERT INTO model_providers (id, provider, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        provider=excluded.provider,
        data=excluded.data,
        updated_at=excluded.updated_at
    `
      )
      .run(id, providerName, JSON.stringify(rest), createdAt || now, now);
    return provider;
  }

  async deleteModelProvider(id: string): Promise<void> {
    this.db.prepare("DELETE FROM model_providers WHERE id = ?").run(id);
  }

  // ==================== Datasources ====================

  async getDatasources(): Promise<Datasource[]> {
    const rows = this.db
      .prepare("SELECT * FROM datasources ORDER BY created_at DESC")
      .all() as any[];
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      config: JSON.parse(row.config || "{}"),
      ...JSON.parse(row.data || "{}"),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async getDatasource(id: string): Promise<Datasource | null> {
    const row = this.db
      .prepare("SELECT * FROM datasources WHERE id = ?")
      .get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      config: JSON.parse(row.config || "{}"),
      ...JSON.parse(row.data || "{}"),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async saveDatasource(datasource: Datasource): Promise<Datasource> {
    const { id, name, type, config, createdAt, updatedAt, ...rest } =
      datasource;
    const now = new Date().toISOString();

    this.db
      .prepare(
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
      )
      .run(
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

  async deleteDatasource(id: string): Promise<void> {
    this.db.prepare("DELETE FROM datasources WHERE id = ?").run(id);
  }
}
