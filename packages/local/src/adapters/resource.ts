/**
 * LocalResourceAdapter - SQLite-based resource storage
 * Uses ~/.vibex/vibex.db for structured data
 */

import type {
  ResourceAdapter,
  AgentType,
  ToolType,
  SpaceType,
  ArtifactType,
  ConversationType,
  ModelProviderType,
  PlanType,
} from "@vibex/core";
import { customAlphabet } from "nanoid";
import os from "os";
import path from "path";
import fs from "fs";

// Lazy load better-sqlite3 to avoid bundling issues with native modules
let Database: any = null;
let DatabasePromise: Promise<any> | null = null;

async function getDatabase(): Promise<any> {
  if (Database) {
    return Database;
  }
  if (DatabasePromise) {
    return await DatabasePromise;
  }
  DatabasePromise = import("better-sqlite3").then((mod) => {
    Database = mod.default || mod;
    return Database;
  });
  return await DatabasePromise;
}

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
  private db: any;
  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.init();
  }

  private async init(): Promise<void> {
    try {
      const Database = await getDatabase();
      const root = resolveRoot();
      if (!fs.existsSync(root)) {
        fs.mkdirSync(root, { recursive: true });
      }
      const dbPath = path.join(root, "vibex.db");
      this.db = new Database(dbPath);
      this.initSchema();
    } catch (error) {
      // Database initialization failed (e.g., better-sqlite3 native module issue)
      // Store the error so ensureInitialized() can throw it
      this.db = null;
      throw error;
    }
  }

  private async ensureInitialized(): Promise<void> {
    try {
      await this.initPromise;
    } catch (error) {
      // Re-throw with a clearer message
      throw new Error(
        `Database initialization failed: ${error instanceof Error ? error.message : String(error)}. This is likely due to better-sqlite3 native module issues in Next.js/Turbopack.`
      );
    }
    if (!this.db) {
      throw new Error("Database not initialized");
    }
  }

  private initSchema() {
    // Agents
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
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

    // Artifacts (linked to space and optionally to conversation)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS artifacts (
        id TEXT PRIMARY KEY,
        space_id TEXT NOT NULL,
        conversation_id TEXT,
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

    // Conversations (chat sessions within a space)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        space_id TEXT NOT NULL,
        title TEXT,
        messages JSON,
        metadata JSON,
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

    // Space Plans
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS space_plans (
        space_id TEXT PRIMARY KEY,
        plan JSON NOT NULL,
        status TEXT,
        summary JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(space_id) REFERENCES spaces(id) ON DELETE CASCADE
      )
    `);
  }

  // ==================== Agents ====================

  async getAgents(): Promise<AgentType[]> {
    await this.ensureInitialized();
    const rows = this.db
      .prepare("SELECT * FROM agents ORDER BY created_at DESC")
      .all() as any[];
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      ...JSON.parse(row.data || "{}"),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async getAgent(id: string): Promise<AgentType | null> {
    await this.ensureInitialized();
    const row = this.db
      .prepare("SELECT * FROM agents WHERE id = ?")
      .get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      ...JSON.parse(row.data || "{}"),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async saveAgent(agent: AgentType): Promise<AgentType> {
    await this.ensureInitialized();
    const { id, name, description, createdAt, updatedAt, ...rest } = agent;
    const now = new Date().toISOString();

    this.db
      .prepare(
        `
      INSERT INTO agents (id, name, description, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name,
        description=excluded.description,
        data=excluded.data,
        updated_at=excluded.updated_at
    `
      )
      .run(
        id,
        name,
        description || null,
        JSON.stringify(rest),
        createdAt || now,
        now
      );
    return agent;
  }

  async deleteAgent(id: string): Promise<void> {
    await this.ensureInitialized();
    this.db.prepare("DELETE FROM agents WHERE id = ?").run(id);
  }

  async cloneAgent(id: string): Promise<AgentType> {
    await this.ensureInitialized();
    const agent = await this.getAgent(id);
    if (!agent) throw new Error(`Agent ${id} not found`);

    const newId = `custom-${generateShortId(8)}`;
    const cloned = { ...agent, id: newId };

    return await this.saveAgent(cloned);
  }

  // ==================== Tools ====================

  async getTools(): Promise<ToolType[]> {
    await this.ensureInitialized();
    const rows = this.db
      .prepare("SELECT * FROM tools ORDER BY created_at DESC")
      .all() as any[];
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      type: "builtin" as const,
      ...JSON.parse(row.data || "{}"),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async getTool(id: string): Promise<ToolType | null> {
    await this.ensureInitialized();
    const row = this.db
      .prepare("SELECT * FROM tools WHERE id = ?")
      .get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      type: "builtin" as const,
      ...JSON.parse(row.data || "{}"),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async saveTool(tool: ToolType): Promise<ToolType> {
    await this.ensureInitialized();
    const { id, name, description, createdAt, updatedAt, ...rest } = tool;
    const now = new Date().toISOString();

    this.db
      .prepare(
        `
      INSERT INTO tools (id, name, description, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name,
        description=excluded.description,
        data=excluded.data,
        updated_at=excluded.updated_at
    `
      )
      .run(
        id,
        name,
        description || null,
        JSON.stringify(rest),
        createdAt || now,
        now
      );
    return tool;
  }

  async deleteTool(id: string): Promise<void> {
    await this.ensureInitialized();
    this.db.prepare("DELETE FROM tools WHERE id = ?").run(id);
  }

  async cloneTool(id: string): Promise<ToolType> {
    await this.ensureInitialized();
    const tool = await this.getTool(id);
    if (!tool) throw new Error(`Tool ${id} not found`);

    const newId = `custom-${generateShortId(8)}`;
    const cloned = { ...tool, id: newId };

    return await this.saveTool(cloned);
  }

  // ==================== Spaces ====================

  async getSpaces(): Promise<SpaceType[]> {
    await this.ensureInitialized();
    const rows = this.db
      .prepare("SELECT * FROM spaces ORDER BY updated_at DESC")
      .all() as any[];
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      goal: row.description,
      config: JSON.parse(row.config || "{}"),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async getSpace(id: string): Promise<SpaceType | null> {
    await this.ensureInitialized();
    const row = this.db
      .prepare("SELECT * FROM spaces WHERE id = ?")
      .get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      goal: row.description,
      config: JSON.parse(row.config || "{}"),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async saveSpace(space: SpaceType): Promise<SpaceType> {
    await this.ensureInitialized();
    const { id, name, description, goal, config, createdAt } = space;
    const now = new Date().toISOString();
    const serializedConfig = JSON.stringify(config || {});
    const descriptionValue = goal || description || null;

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
      .run(id, name, descriptionValue, serializedConfig, createdAt || now, now);
    return space;
  }

  async deleteSpace(id: string): Promise<void> {
    await this.ensureInitialized();
    this.db.prepare("DELETE FROM spaces WHERE id = ?").run(id);
  }

  // ==================== Plans ====================

  async getPlan(spaceId: string): Promise<PlanType | null> {
    await this.ensureInitialized();
    const row = this.db
      .prepare("SELECT * FROM space_plans WHERE space_id = ?")
      .get(spaceId) as any;
    if (!row) return null;
    return {
      spaceId: row.space_id,
      plan: JSON.parse(row.plan || "{}"),
      status: row.status || undefined,
      summary: row.summary ? JSON.parse(row.summary) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async savePlan(plan: PlanType): Promise<PlanType> {
    await this.ensureInitialized();
    const now = new Date().toISOString();
    this.db
      .prepare(
        `
        INSERT INTO space_plans (space_id, plan, status, summary, created_at, updated_at)
        VALUES (?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?)
        ON CONFLICT(space_id) DO UPDATE SET
          plan=excluded.plan,
          status=excluded.status,
          summary=excluded.summary,
          updated_at=excluded.updated_at
      `
      )
      .run(
        plan.spaceId,
        JSON.stringify(plan.plan || {}),
        plan.status || null,
        plan.summary ? JSON.stringify(plan.summary) : null,
        plan.createdAt || now,
        now
      );
    return {
      ...plan,
      createdAt: plan.createdAt || now,
      updatedAt: now,
    };
  }

  async deletePlan(spaceId: string): Promise<void> {
    await this.ensureInitialized();
    this.db.prepare("DELETE FROM space_plans WHERE space_id = ?").run(spaceId);
  }

  // ==================== Artifacts ====================

  private mapRowToArtifact(row: any): ArtifactType {
    return {
      id: row.id,
      spaceId: row.space_id,
      conversationId: row.conversation_id || undefined,
      storageKey: row.storage_key,
      originalName: row.original_name,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      category: row.category,
      metadata: JSON.parse(row.metadata || "{}"),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getArtifacts(spaceId: string): Promise<ArtifactType[]> {
    await this.ensureInitialized();
    const rows = this.db
      .prepare(
        "SELECT * FROM artifacts WHERE space_id = ? ORDER BY created_at DESC"
      )
      .all(spaceId) as any[];
    return rows.map(this.mapRowToArtifact);
  }

  async getArtifact(id: string): Promise<ArtifactType | null> {
    await this.ensureInitialized();
    const row = this.db
      .prepare("SELECT * FROM artifacts WHERE id = ?")
      .get(id) as any;
    if (!row) return null;
    return this.mapRowToArtifact(row);
  }

  async saveArtifact(artifact: ArtifactType): Promise<ArtifactType> {
    await this.ensureInitialized();
    const {
      id,
      spaceId,
      conversationId,
      storageKey,
      originalName,
      mimeType,
      sizeBytes,
      category,
      metadata,
      createdAt,
    } = artifact;
    const now = new Date().toISOString();

    this.db
      .prepare(
        `
      INSERT INTO artifacts (id, space_id, conversation_id, storage_key, original_name, mime_type, size_bytes, category, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        space_id=excluded.space_id,
        conversation_id=excluded.conversation_id,
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
        conversationId || null,
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

  async deleteArtifact(id: string): Promise<void> {
    await this.ensureInitialized();
    this.db.prepare("DELETE FROM artifacts WHERE id = ?").run(id);
  }

  async getArtifactsBySpace(spaceId: string): Promise<ArtifactType[]> {
    await this.ensureInitialized();
    const rows = this.db
      .prepare(
        "SELECT * FROM artifacts WHERE space_id = ? AND conversation_id IS NULL ORDER BY created_at DESC"
      )
      .all(spaceId) as any[];
    return rows.map(this.mapRowToArtifact);
  }

  async getArtifactsByConversation(
    conversationId: string
  ): Promise<ArtifactType[]> {
    await this.ensureInitialized();
    const rows = this.db
      .prepare(
        "SELECT * FROM artifacts WHERE conversation_id = ? ORDER BY created_at DESC"
      )
      .all(conversationId) as any[];
    return rows.map(this.mapRowToArtifact);
  }

  async getArtifactsByCategory(
    spaceOrConversationId: string,
    category: "input" | "intermediate" | "output",
    isConversation = false
  ): Promise<ArtifactType[]> {
    await this.ensureInitialized();
    const field = isConversation ? "conversation_id" : "space_id";
    const rows = this.db
      .prepare(
        `SELECT * FROM artifacts WHERE ${field} = ? AND category = ? ORDER BY created_at DESC`
      )
      .all(spaceOrConversationId, category) as any[];
    return rows.map(this.mapRowToArtifact);
  }

  // ==================== Conversations ====================

  async getConversations(spaceId: string): Promise<ConversationType[]> {
    await this.ensureInitialized();
    const rows = this.db
      .prepare(
        "SELECT * FROM conversations WHERE space_id = ? ORDER BY updated_at DESC"
      )
      .all(spaceId) as any[];
    return rows.map((row) => ({
      id: row.id,
      spaceId: row.space_id,
      title: row.title,
      messages: JSON.parse(row.messages || "[]"),
      metadata: JSON.parse(row.metadata || "{}"),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async getConversation(id: string): Promise<ConversationType | null> {
    await this.ensureInitialized();
    const row = this.db
      .prepare("SELECT * FROM conversations WHERE id = ?")
      .get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      spaceId: row.space_id,
      title: row.title,
      messages: JSON.parse(row.messages || "[]"),
      metadata: JSON.parse(row.metadata || "{}"),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async saveConversation(
    conversation: ConversationType
  ): Promise<ConversationType> {
    await this.ensureInitialized();
    const { id, spaceId, title, messages, metadata, createdAt } = conversation;
    const now = new Date().toISOString();

    this.db
      .prepare(
        `
      INSERT INTO conversations (id, space_id, title, messages, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        space_id=excluded.space_id,
        title=excluded.title,
        messages=excluded.messages,
        metadata=excluded.metadata,
        updated_at=excluded.updated_at
    `
      )
      .run(
        id,
        spaceId,
        title || null,
        JSON.stringify(messages || []),
        JSON.stringify(metadata || {}),
        createdAt || now,
        now
      );
    return conversation;
  }

  async deleteConversation(id: string): Promise<void> {
    await this.ensureInitialized();
    this.db.prepare("DELETE FROM conversations WHERE id = ?").run(id);
  }

  // ==================== Model Providers ====================

  async getModelProviders(): Promise<ModelProviderType[]> {
    await this.ensureInitialized();
    const rows = this.db
      .prepare("SELECT * FROM model_providers ORDER BY created_at DESC")
      .all() as any[];
    return rows.map((row) => ({
      id: row.id,
      name: row.id,
      provider: row.provider,
      ...JSON.parse(row.data || "{}"),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async getModelProvider(id: string): Promise<ModelProviderType | null> {
    await this.ensureInitialized();
    const row = this.db
      .prepare("SELECT * FROM model_providers WHERE id = ?")
      .get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      name: row.id,
      provider: row.provider,
      ...JSON.parse(row.data || "{}"),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async saveModelProvider(
    provider: ModelProviderType
  ): Promise<ModelProviderType> {
    await this.ensureInitialized();
    const { id, provider: providerName, createdAt, ...rest } = provider;
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
    await this.ensureInitialized();
    this.db.prepare("DELETE FROM model_providers WHERE id = ?").run(id);
  }
}
