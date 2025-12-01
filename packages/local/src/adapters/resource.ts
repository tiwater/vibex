/**
 * LocalResourceAdapter - SQLite resource storage using better-sqlite3
 *
 * Native module handling for Turbopack:
 * - better-sqlite3 must be in serverExternalPackages
 * - Use lazy loading to defer native module import to runtime
 * - The native .node binding is resolved at runtime, not build time
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

// Type for better-sqlite3 Database (we can't import types directly due to native module issues)
type Database = {
  exec(sql: string): void;
  prepare(sql: string): Statement;
  close(): void;
};

type Statement = {
  run(...params: any[]): { changes: number; lastInsertRowid: number | bigint };
  get(...params: any[]): any;
  all(...params: any[]): any[];
};

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

// Lazy loader for better-sqlite3
// Native modules are tricky in bundled environments
// We try multiple strategies to find and load the module
import { createRequire } from "module";

let BetterSqlite3: any = null;

async function getBetterSqlite3Async(): Promise<any> {
  if (BetterSqlite3) return BetterSqlite3;

  const errors: string[] = [];

  // Strategy 1: Dynamic import (works best with ESM and Turbopack externals)
  try {
    const mod = await import("better-sqlite3");
    BetterSqlite3 = mod.default || mod;
    return BetterSqlite3;
  } catch (e) {
    errors.push(`import(): ${e instanceof Error ? e.message : e}`);
  }

  // Strategy 2: createRequire from this module's URL
  try {
    const require = createRequire(import.meta.url);
    BetterSqlite3 = require("better-sqlite3");
    return BetterSqlite3;
  } catch (e) {
    errors.push(
      `createRequire(import.meta.url): ${e instanceof Error ? e.message : e}`
    );
  }

  // Strategy 3: createRequire from process.cwd
  try {
    const require = createRequire(`${process.cwd()}/`);
    BetterSqlite3 = require("better-sqlite3");
    return BetterSqlite3;
  } catch (e) {
    errors.push(`createRequire(cwd): ${e instanceof Error ? e.message : e}`);
  }

  throw new Error(
    `Failed to load better-sqlite3 native module. Tried multiple strategies:\n` +
      errors.map((e, i) => `  ${i + 1}. ${e}`).join("\n") +
      `\nMake sure 'better-sqlite3' is in next.config.ts serverExternalPackages.`
  );
}

function getBetterSqlite3(): any {
  if (BetterSqlite3) return BetterSqlite3;

  // Synchronous fallback - try createRequire strategies
  const errors: string[] = [];

  try {
    const require = createRequire(import.meta.url);
    BetterSqlite3 = require("better-sqlite3");
    return BetterSqlite3;
  } catch (e) {
    errors.push(
      `createRequire(import.meta.url): ${e instanceof Error ? e.message : e}`
    );
  }

  try {
    const require = createRequire(`${process.cwd()}/`);
    BetterSqlite3 = require("better-sqlite3");
    return BetterSqlite3;
  } catch (e) {
    errors.push(`createRequire(cwd): ${e instanceof Error ? e.message : e}`);
  }

  throw new Error(
    `Failed to load better-sqlite3. Errors:\n` +
      errors.map((e, i) => `  ${i + 1}. ${e}`).join("\n")
  );
}

export class LocalResourceAdapter implements ResourceAdapter {
  private db: Database | null = null;
  private dbPath: string;
  private initPromise: Promise<void> | null = null;

  constructor() {
    const root = resolveRoot();
    if (!fs.existsSync(root)) {
      fs.mkdirSync(root, { recursive: true });
    }
    this.dbPath = path.join(root, "vibex.db");
  }

  private async init(): Promise<void> {
    if (this.db) return;

    // Try async loading first (works better with ESM/Turbopack)
    const SqliteDatabase = await getBetterSqlite3Async();
    this.db = new SqliteDatabase(this.dbPath) as Database;
    this.initSchema();
  }

  async ensureInitialized(): Promise<void> {
    if (this.db) return;
    if (!this.initPromise) {
      this.initPromise = this.init();
    }
    await this.initPromise;
  }

  private initSchema() {
    if (!this.db) return;

    // Agents
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        data TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tools
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tools (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        data TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Spaces
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS spaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        config TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Artifacts
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
        metadata TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Conversations
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        space_id TEXT NOT NULL,
        title TEXT,
        messages TEXT,
        metadata TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Model Providers
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS model_providers (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        data TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Space Plans
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS space_plans (
        space_id TEXT PRIMARY KEY,
        plan TEXT NOT NULL,
        status TEXT,
        summary TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  // ==================== Agents ====================

  async getAgents(): Promise<AgentType[]> {
    await this.ensureInitialized();
    const rows = this.db!.prepare(
      "SELECT * FROM agents ORDER BY created_at DESC"
    ).all();
    return rows.map((row: any) => ({
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
    const row = this.db!.prepare("SELECT * FROM agents WHERE id = ?").get(
      id
    ) as any;
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

    this.db!.prepare(
      `INSERT OR REPLACE INTO agents (id, name, description, data, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
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
    this.db!.prepare("DELETE FROM agents WHERE id = ?").run(id);
  }

  async cloneAgent(id: string): Promise<AgentType> {
    const agent = await this.getAgent(id);
    if (!agent) throw new Error(`Agent ${id} not found`);
    const newId = `custom-${generateShortId(8)}`;
    const cloned = { ...agent, id: newId };
    return await this.saveAgent(cloned);
  }

  // ==================== Tools ====================

  async getTools(): Promise<ToolType[]> {
    await this.ensureInitialized();
    const rows = this.db!.prepare(
      "SELECT * FROM tools ORDER BY created_at DESC"
    ).all();
    return rows.map((row: any) => ({
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
    const row = this.db!.prepare("SELECT * FROM tools WHERE id = ?").get(
      id
    ) as any;
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

    this.db!.prepare(
      `INSERT OR REPLACE INTO tools (id, name, description, data, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
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
    this.db!.prepare("DELETE FROM tools WHERE id = ?").run(id);
  }

  async cloneTool(id: string): Promise<ToolType> {
    const tool = await this.getTool(id);
    if (!tool) throw new Error(`Tool ${id} not found`);
    const newId = `custom-${generateShortId(8)}`;
    const cloned = { ...tool, id: newId };
    return await this.saveTool(cloned);
  }

  // ==================== Spaces ====================

  async getSpaces(): Promise<SpaceType[]> {
    await this.ensureInitialized();
    const rows = this.db!.prepare(
      "SELECT * FROM spaces ORDER BY created_at DESC"
    ).all();
    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      config: JSON.parse(row.config || "{}"),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async getSpace(id: string): Promise<SpaceType | null> {
    await this.ensureInitialized();
    const row = this.db!.prepare("SELECT * FROM spaces WHERE id = ?").get(
      id
    ) as any;
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

  async saveSpace(space: SpaceType): Promise<SpaceType> {
    await this.ensureInitialized();
    const { id, name, description, config, createdAt, updatedAt, ...rest } =
      space;
    const now = new Date().toISOString();

    this.db!.prepare(
      `INSERT OR REPLACE INTO spaces (id, name, description, config, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      name,
      description || null,
      JSON.stringify(config || rest),
      createdAt || now,
      now
    );
    return space;
  }

  async deleteSpace(id: string): Promise<void> {
    await this.ensureInitialized();
    // Delete associated data
    this.db!.prepare("DELETE FROM artifacts WHERE space_id = ?").run(id);
    this.db!.prepare("DELETE FROM conversations WHERE space_id = ?").run(id);
    this.db!.prepare("DELETE FROM space_plans WHERE space_id = ?").run(id);
    this.db!.prepare("DELETE FROM spaces WHERE id = ?").run(id);
  }

  // ==================== Artifacts ====================

  async getArtifacts(spaceId?: string): Promise<ArtifactType[]> {
    await this.ensureInitialized();
    const sql = spaceId
      ? "SELECT * FROM artifacts WHERE space_id = ? ORDER BY created_at DESC"
      : "SELECT * FROM artifacts ORDER BY created_at DESC";
    const rows = spaceId
      ? this.db!.prepare(sql).all(spaceId)
      : this.db!.prepare(sql).all();
    return rows.map((row: any) => ({
      id: row.id,
      spaceId: row.space_id,
      conversationId: row.conversation_id,
      storageKey: row.storage_key,
      originalName: row.original_name,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      category: row.category,
      metadata: JSON.parse(row.metadata || "{}"),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async getArtifact(
    id: string,
    spaceId?: string
  ): Promise<ArtifactType | null> {
    await this.ensureInitialized();
    const sql = spaceId
      ? "SELECT * FROM artifacts WHERE id = ? AND space_id = ?"
      : "SELECT * FROM artifacts WHERE id = ?";
    const row = spaceId
      ? (this.db!.prepare(sql).get(id, spaceId) as any)
      : (this.db!.prepare(sql).get(id) as any);
    if (!row) return null;
    return {
      id: row.id,
      spaceId: row.space_id,
      conversationId: row.conversation_id,
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

  async saveArtifact(artifact: ArtifactType): Promise<ArtifactType> {
    await this.ensureInitialized();
    const now = new Date().toISOString();

    this.db!.prepare(
      `INSERT OR REPLACE INTO artifacts 
       (id, space_id, conversation_id, storage_key, original_name, mime_type, size_bytes, category, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      artifact.id,
      artifact.spaceId,
      artifact.conversationId || null,
      artifact.storageKey,
      artifact.originalName || null,
      artifact.mimeType || null,
      artifact.sizeBytes || null,
      artifact.category || null,
      JSON.stringify(artifact.metadata || {}),
      artifact.createdAt || now,
      now
    );
    return artifact;
  }

  async deleteArtifact(id: string, spaceId?: string): Promise<void> {
    await this.ensureInitialized();
    const sql = spaceId
      ? "DELETE FROM artifacts WHERE id = ? AND space_id = ?"
      : "DELETE FROM artifacts WHERE id = ?";
    if (spaceId) {
      this.db!.prepare(sql).run(id, spaceId);
    } else {
      this.db!.prepare(sql).run(id);
    }
  }

  async getArtifactsBySpace(spaceId: string): Promise<ArtifactType[]> {
    return this.getArtifacts(spaceId);
  }

  async getArtifactsByConversation(
    conversationId: string
  ): Promise<ArtifactType[]> {
    await this.ensureInitialized();
    const rows = this.db!.prepare(
      "SELECT * FROM artifacts WHERE conversation_id = ? ORDER BY created_at DESC"
    ).all(conversationId);
    return rows.map((row: any) => ({
      id: row.id,
      spaceId: row.space_id,
      conversationId: row.conversation_id,
      storageKey: row.storage_key,
      originalName: row.original_name,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      category: row.category,
      metadata: JSON.parse(row.metadata || "{}"),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async getArtifactsByCategory(
    spaceOrConversationId: string,
    category: "input" | "intermediate" | "output"
  ): Promise<ArtifactType[]> {
    await this.ensureInitialized();
    const rows = this.db!.prepare(
      `SELECT * FROM artifacts 
       WHERE (space_id = ? OR conversation_id = ?) AND category = ? 
       ORDER BY created_at DESC`
    ).all(spaceOrConversationId, spaceOrConversationId, category);
    return rows.map((row: any) => ({
      id: row.id,
      spaceId: row.space_id,
      conversationId: row.conversation_id,
      storageKey: row.storage_key,
      originalName: row.original_name,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      category: row.category,
      metadata: JSON.parse(row.metadata || "{}"),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  // ==================== Conversations ====================

  async getConversations(spaceId?: string): Promise<ConversationType[]> {
    await this.ensureInitialized();
    const sql = spaceId
      ? "SELECT * FROM conversations WHERE space_id = ? ORDER BY created_at DESC"
      : "SELECT * FROM conversations ORDER BY created_at DESC";
    const rows = spaceId
      ? this.db!.prepare(sql).all(spaceId)
      : this.db!.prepare(sql).all();
    return rows.map((row: any) => ({
      id: row.id,
      spaceId: row.space_id,
      title: row.title,
      messages: JSON.parse(row.messages || "[]"),
      metadata: JSON.parse(row.metadata || "{}"),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async getConversation(
    id: string,
    spaceId?: string
  ): Promise<ConversationType | null> {
    await this.ensureInitialized();
    const sql = spaceId
      ? "SELECT * FROM conversations WHERE id = ? AND space_id = ?"
      : "SELECT * FROM conversations WHERE id = ?";
    const row = spaceId
      ? (this.db!.prepare(sql).get(id, spaceId) as any)
      : (this.db!.prepare(sql).get(id) as any);
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
    const now = new Date().toISOString();

    this.db!.prepare(
      `INSERT OR REPLACE INTO conversations 
       (id, space_id, title, messages, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      conversation.id,
      conversation.spaceId,
      conversation.title || null,
      JSON.stringify(conversation.messages || []),
      JSON.stringify(conversation.metadata || {}),
      conversation.createdAt || now,
      now
    );
    return conversation;
  }

  async deleteConversation(id: string, spaceId?: string): Promise<void> {
    await this.ensureInitialized();
    const sql = spaceId
      ? "DELETE FROM conversations WHERE id = ? AND space_id = ?"
      : "DELETE FROM conversations WHERE id = ?";
    if (spaceId) {
      this.db!.prepare(sql).run(id, spaceId);
    } else {
      this.db!.prepare(sql).run(id);
    }
  }

  // ==================== Model Providers ====================

  async getModelProviders(): Promise<ModelProviderType[]> {
    await this.ensureInitialized();
    const rows = this.db!.prepare("SELECT * FROM model_providers").all();
    return rows.map((row: any) => ({
      id: row.id,
      provider: row.provider,
      ...JSON.parse(row.data || "{}"),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async getModelProvider(id: string): Promise<ModelProviderType | null> {
    await this.ensureInitialized();
    const row = this.db!.prepare(
      "SELECT * FROM model_providers WHERE id = ?"
    ).get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
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
    const {
      id,
      provider: providerName,
      createdAt,
      updatedAt,
      ...rest
    } = provider;
    const now = new Date().toISOString();

    this.db!.prepare(
      `INSERT OR REPLACE INTO model_providers (id, provider, data, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(id, providerName, JSON.stringify(rest), createdAt || now, now);
    return provider;
  }

  async deleteModelProvider(id: string): Promise<void> {
    await this.ensureInitialized();
    this.db!.prepare("DELETE FROM model_providers WHERE id = ?").run(id);
  }

  // ==================== Plans ====================

  async getPlan(spaceId: string): Promise<PlanType | null> {
    await this.ensureInitialized();
    const row = this.db!.prepare(
      "SELECT * FROM space_plans WHERE space_id = ?"
    ).get(spaceId) as any;
    if (!row) return null;
    return {
      spaceId: row.space_id,
      plan: JSON.parse(row.plan || "{}"),
      status: row.status,
      summary: JSON.parse(row.summary || "null"),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async savePlan(plan: PlanType): Promise<PlanType> {
    await this.ensureInitialized();
    const now = new Date().toISOString();

    this.db!.prepare(
      `INSERT OR REPLACE INTO space_plans (space_id, plan, status, summary, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      plan.spaceId,
      JSON.stringify(plan.plan),
      plan.status || null,
      JSON.stringify(plan.summary || null),
      plan.createdAt || now,
      now
    );
    return plan;
  }

  async deletePlan(spaceId: string): Promise<void> {
    await this.ensureInitialized();
    this.db!.prepare("DELETE FROM space_plans WHERE space_id = ?").run(spaceId);
  }
}
