var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/client.ts
import { createClient } from "@supabase/supabase-js";
function getUrl() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error(
      "Supabase URL not configured. Set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL"
    );
  }
  return url;
}
function createServiceRoleClient() {
  const url = getUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for service access");
  }
  return createClient(url, key);
}
function createAnonClient(accessToken) {
  const url = getUrl();
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error(
      "Supabase anon key missing. Set SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }
  return createClient(url, anonKey, {
    global: accessToken ? {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    } : void 0
  });
}

// src/data-adapter.ts
var SupabaseDataAdapter = class {
  constructor() {
    __publicField(this, "supabase", createServiceRoleClient());
  }
  // Helper conversions --------------------------------------------------
  toSnakeCase(obj) {
    if (obj === null || obj === void 0) return obj;
    if (Array.isArray(obj)) return obj.map((v) => this.toSnakeCase(v));
    if (typeof obj !== "object") return obj;
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      result[snakeKey] = typeof value === "object" && value !== null ? this.toSnakeCase(value) : value;
    }
    return result;
  }
  toCamelCase(obj) {
    if (obj === null || obj === void 0) return obj;
    if (Array.isArray(obj)) return obj.map((v) => this.toCamelCase(v));
    if (typeof obj !== "object") return obj;
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = typeof value === "object" && value !== null ? this.toCamelCase(value) : value;
    }
    return result;
  }
  // Agents --------------------------------------------------------------
  async getAgents() {
    const { data, error } = await this.supabase.from("agents").select("*");
    if (error) throw new Error(`Failed to fetch agents: ${error.message}`);
    return (data || []).map((row) => this.toCamelCase(row));
  }
  async getAgent(id) {
    const { data, error } = await this.supabase.from("agents").select("*").eq("id", id).single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to fetch agent: ${error.message}`);
    }
    return this.toCamelCase(data);
  }
  async saveAgent(agent) {
    const dbAgent = this.toSnakeCase({
      ...agent,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    const { data, error } = await this.supabase.from("agents").upsert(dbAgent).select().single();
    if (error) throw new Error(`Failed to save agent: ${error.message}`);
    return this.toCamelCase(data);
  }
  async deleteAgent(id) {
    const { error } = await this.supabase.from("agents").delete().eq("id", id);
    if (error) throw new Error(`Failed to delete agent: ${error.message}`);
  }
  async cloneAgent(id) {
    const agent = await this.getAgent(id);
    if (!agent) throw new Error(`Agent ${id} not found`);
    const clone = { ...agent, id: `${id}-copy-${Date.now()}` };
    return this.saveAgent(clone);
  }
  // Tools ---------------------------------------------------------------
  async getTools() {
    const { data, error } = await this.supabase.from("tools").select("*");
    if (error) throw new Error(`Failed to fetch tools: ${error.message}`);
    return (data || []).map((row) => this.toCamelCase(row));
  }
  async getTool(id) {
    const { data, error } = await this.supabase.from("tools").select("*").eq("id", id).single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to fetch tool: ${error.message}`);
    }
    return this.toCamelCase(data);
  }
  async saveTool(tool) {
    const dbTool = this.toSnakeCase({
      ...tool,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    const { data, error } = await this.supabase.from("tools").upsert(dbTool).select().single();
    if (error) throw new Error(`Failed to save tool: ${error.message}`);
    return this.toCamelCase(data);
  }
  async deleteTool(id) {
    const { error } = await this.supabase.from("tools").delete().eq("id", id);
    if (error) throw new Error(`Failed to delete tool: ${error.message}`);
  }
  async cloneTool(id) {
    const tool = await this.getTool(id);
    if (!tool) throw new Error(`Tool ${id} not found`);
    const clone = { ...tool, id: `${id}-copy-${Date.now()}` };
    return this.saveTool(clone);
  }
  // Spaces --------------------------------------------------------------
  async getSpaces() {
    const { data, error } = await this.supabase.from("spaces").select("*");
    if (error) throw new Error(`Failed to fetch spaces: ${error.message}`);
    return (data || []).map((row) => this.toCamelCase(row));
  }
  async getSpace(id) {
    const { data, error } = await this.supabase.from("spaces").select("*").eq("id", id).single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to fetch space: ${error.message}`);
    }
    return this.toCamelCase(data);
  }
  async saveSpace(space) {
    const dbSpace = this.toSnakeCase({
      ...space,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    if (dbSpace.id === "") delete dbSpace.id;
    const { data, error } = await this.supabase.from("spaces").upsert(dbSpace).select().single();
    if (error) throw new Error(`Failed to save space: ${error.message}`);
    return this.toCamelCase(data);
  }
  async deleteSpace(id) {
    const { error } = await this.supabase.from("spaces").delete().eq("id", id);
    if (error) throw new Error(`Failed to delete space: ${error.message}`);
  }
  // Artifacts -----------------------------------------------------------
  async getArtifacts(spaceId) {
    const { data, error } = await this.supabase.from("artifacts").select("*").eq("space_id", spaceId).order("created_at", { ascending: false });
    if (error) throw new Error(`Failed to fetch artifacts: ${error.message}`);
    return (data || []).map((row) => this.toCamelCase(row));
  }
  async getArtifact(id) {
    const { data, error } = await this.supabase.from("artifacts").select("*").eq("id", id).single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to fetch artifact: ${error.message}`);
    }
    return this.toCamelCase(data);
  }
  async saveArtifact(artifact) {
    const dbArtifact = this.toSnakeCase({
      ...artifact,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    const { data, error } = await this.supabase.from("artifacts").upsert(dbArtifact).select().single();
    if (error) throw new Error(`Failed to save artifact: ${error.message}`);
    return this.toCamelCase(data);
  }
  async deleteArtifact(id) {
    const { error } = await this.supabase.from("artifacts").delete().eq("id", id);
    if (error) throw new Error(`Failed to delete artifact: ${error.message}`);
  }
  async getArtifactsBySpace(spaceId) {
    const { data, error } = await this.supabase.from("artifacts").select("*").eq("space_id", spaceId).is("task_id", null).order("created_at", { ascending: false });
    if (error) throw new Error(`Failed to fetch space artifacts: ${error.message}`);
    return (data || []).map((row) => this.toCamelCase(row));
  }
  async getArtifactsByTask(taskId) {
    const { data, error } = await this.supabase.from("artifacts").select("*").eq("task_id", taskId).order("created_at", { ascending: false });
    if (error) throw new Error(`Failed to fetch task artifacts: ${error.message}`);
    return (data || []).map((row) => this.toCamelCase(row));
  }
  async getArtifactsByCategory(id, category, isTask = false) {
    const field = isTask ? "task_id" : "space_id";
    const { data, error } = await this.supabase.from("artifacts").select("*").eq(field, id).eq("category", category).order("created_at", { ascending: false });
    if (error) throw new Error(`Failed to fetch categorized artifacts: ${error.message}`);
    return (data || []).map((row) => this.toCamelCase(row));
  }
  // Tasks ---------------------------------------------------------------
  async getTasks(spaceId) {
    const { data, error } = await this.supabase.from("tasks").select("*").eq("space_id", spaceId).order("updated_at", { ascending: false });
    if (error) throw new Error(`Failed to fetch tasks: ${error.message}`);
    return (data || []).map((row) => this.toCamelCase(row));
  }
  async getTask(id) {
    const { data, error } = await this.supabase.from("tasks").select("*").eq("id", id).single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to fetch task: ${error.message}`);
    }
    return this.toCamelCase(data);
  }
  async saveTask(task) {
    const dbTask = this.toSnakeCase({
      ...task,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    const { data, error } = await this.supabase.from("tasks").upsert(dbTask).select().single();
    if (error) throw new Error(`Failed to save task: ${error.message}`);
    return this.toCamelCase(data);
  }
  async deleteTask(id) {
    const { error } = await this.supabase.from("tasks").delete().eq("id", id);
    if (error) throw new Error(`Failed to delete task: ${error.message}`);
  }
  async getConversations(spaceId) {
    const tasks = await this.getTasks(spaceId);
    return tasks;
  }
  async getConversation(id) {
    const task = await this.getTask(id);
    return task;
  }
  async saveConversation(conversation) {
    return await this.saveTask(conversation);
  }
  async deleteConversation(id) {
    await this.deleteTask(id);
  }
  // Model Providers -----------------------------------------------------
  async getModelProviders() {
    const { data, error } = await this.supabase.from("model_providers").select("*");
    if (error) throw new Error(`Failed to fetch model providers: ${error.message}`);
    return (data || []).map((row) => this.toCamelCase(row));
  }
  async getModelProvider(id) {
    const { data, error } = await this.supabase.from("model_providers").select("*").eq("id", id).single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to fetch model provider: ${error.message}`);
    }
    return this.toCamelCase(data);
  }
  async saveModelProvider(provider) {
    const dbProvider = this.toSnakeCase({
      ...provider,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    const { data, error } = await this.supabase.from("model_providers").upsert(dbProvider).select().single();
    if (error) throw new Error(`Failed to save model provider: ${error.message}`);
    return this.toCamelCase(data);
  }
  async deleteModelProvider(id) {
    const { error } = await this.supabase.from("model_providers").delete().eq("id", id);
    if (error) throw new Error(`Failed to delete model provider: ${error.message}`);
  }
  // Datasources ---------------------------------------------------------
  async getDatasources() {
    const { data, error } = await this.supabase.from("datasources").select("*");
    if (error) throw new Error(`Failed to fetch datasources: ${error.message}`);
    return (data || []).map((row) => this.toCamelCase(row));
  }
  async getDatasource(id) {
    const { data, error } = await this.supabase.from("datasources").select("*").eq("id", id).single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to fetch datasource: ${error.message}`);
    }
    return this.toCamelCase(data);
  }
  async saveDatasource(datasource) {
    const dbDatasource = this.toSnakeCase({
      ...datasource,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    const { data, error } = await this.supabase.from("datasources").upsert(dbDatasource).select().single();
    if (error) throw new Error(`Failed to save datasource: ${error.message}`);
    return this.toCamelCase(data);
  }
  async deleteDatasource(id) {
    const { error } = await this.supabase.from("datasources").delete().eq("id", id);
    if (error) throw new Error(`Failed to delete datasource: ${error.message}`);
  }
};
function createSupabaseDataAdapter() {
  return new SupabaseDataAdapter();
}

// src/storage.ts
var SupabaseStorageAdapter = class {
  constructor(config) {
    __publicField(this, "client");
    __publicField(this, "serviceClient", createServiceRoleClient());
    __publicField(this, "config");
    this.config = config || {};
    this.client = createAnonClient(this.config.accessToken);
  }
  bucket() {
    return this.config.defaultBucket || "spaces";
  }
  normalize(path) {
    return path.replace(/^[\/]+/, "").replace(/\\/g, "/");
  }
  async readFile(path) {
    const key = this.normalize(path);
    const { data, error } = await this.client.storage.from(this.bucket()).download(key);
    if (error) throw error;
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
  async readTextFile(path) {
    const buffer = await this.readFile(path);
    return buffer.toString("utf-8");
  }
  async writeFile(path, data) {
    const key = this.normalize(path);
    const { error } = await this.client.storage.from(this.bucket()).upload(key, data, { upsert: true });
    if (error) throw error;
  }
  async deleteFile(path) {
    const key = this.normalize(path);
    const { error } = await this.client.storage.from(this.bucket()).remove([key]);
    if (error) throw error;
  }
  async exists(path) {
    try {
      const key = this.normalize(path);
      const dir = key.split("/").slice(0, -1).join("/");
      const name = key.split("/").pop();
      const { data } = await this.client.storage.from(this.bucket()).list(dir, {
        search: name
      });
      return !!data && data.some((entry) => entry.name === name);
    } catch {
      return false;
    }
  }
  async mkdir(_path) {
  }
  async readdir(path) {
    const dir = this.normalize(path);
    const { data, error } = await this.client.storage.from(this.bucket()).list(dir);
    if (error) throw error;
    return data.map((item) => item.name);
  }
  async stat(path) {
    const key = this.normalize(path);
    const dir = key.split("/").slice(0, -1).join("/");
    const name = key.split("/").pop();
    const { data, error } = await this.client.storage.from(this.bucket()).list(dir, {
      search: name
    });
    if (error) throw error;
    const match = data.find((item) => item.name === name);
    return match || null;
  }
  // Artifact helpers ----------------------------------------------------
  async saveArtifact(spaceId, artifact, buffer) {
    const storageKey = `${spaceId}/artifacts/${artifact.storageKey}`;
    await this.writeFile(storageKey, buffer);
    const { data, error } = await this.serviceClient.from("artifacts").upsert({
      id: artifact.id,
      space_id: spaceId,
      storage_key: artifact.storageKey,
      original_name: artifact.originalName,
      mime_type: artifact.mimeType,
      size_bytes: artifact.sizeBytes,
      category: artifact.category,
      metadata: artifact.metadata
    }).select().single();
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
      updatedAt: data.updated_at
    };
  }
  async getArtifact(spaceId, artifactId) {
    const info = await this.getArtifactInfo(spaceId, artifactId);
    if (!info) return null;
    const buffer = await this.readFile(`${spaceId}/artifacts/${info.storageKey}`);
    return { info, buffer };
  }
  async getArtifactInfo(spaceId, artifactId) {
    const { data, error } = await this.serviceClient.from("artifacts").select("*").eq("id", artifactId).eq("space_id", spaceId).single();
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
      updatedAt: data.updated_at
    };
  }
  async listArtifacts(spaceId) {
    const { data, error } = await this.serviceClient.from("artifacts").select("*").eq("space_id", spaceId).order("created_at", { ascending: false });
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
      updatedAt: row.updated_at
    }));
  }
  async deleteArtifact(spaceId, artifactId) {
    const info = await this.getArtifactInfo(spaceId, artifactId);
    if (!info) throw new Error("Artifact not found");
    await this.deleteFile(`${spaceId}/artifacts/${info.storageKey}`);
    const { error } = await this.serviceClient.from("artifacts").delete().eq("id", artifactId).eq("space_id", spaceId);
    if (error) throw error;
  }
};
export {
  SupabaseDataAdapter,
  SupabaseStorageAdapter,
  createAnonClient,
  createServiceRoleClient,
  createSupabaseDataAdapter
};
