import type { ResourceAdapter } from "@vibex/data";
import type {
  Agent,
  Tool,
  Space,
  Artifact,
  Conversation,
  Task,
  ModelProvider,
  Datasource,
} from "@vibex/data";
import { createServiceRoleClient } from "./client";

/**
 * SupabaseDatabaseAdapter - Direct Supabase/PostgreSQL database access
 * Mirrors the previous implementation from @vibex/data but lives in @vibex/supabase now.
 */
export class SupabaseResourceAdapter implements ResourceAdapter {
  private supabase = createServiceRoleClient();

  // Helper conversions --------------------------------------------------
  private toSnakeCase(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map((v) => this.toSnakeCase(v));
    if (typeof obj !== "object") return obj;

    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      result[snakeKey] =
        typeof value === "object" && value !== null ? this.toSnakeCase(value) : value;
    }
    return result;
  }

  private toCamelCase(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map((v) => this.toCamelCase(v));
    if (typeof obj !== "object") return obj;

    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] =
        typeof value === "object" && value !== null ? this.toCamelCase(value) : value;
    }
    return result;
  }

  // Agents --------------------------------------------------------------
  async getAgents(): Promise<Agent[]> {
    const { data, error } = await this.supabase.from("agents").select("*");
    if (error) throw new Error(`Failed to fetch agents: ${error.message}`);
    return (data || []).map((row) => this.toCamelCase(row));
  }

  async getAgent(id: string): Promise<Agent | null> {
    const { data, error } = await this.supabase
      .from("agents")
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to fetch agent: ${error.message}`);
    }
    return this.toCamelCase(data);
  }

  async saveAgent(agent: Agent): Promise<Agent> {
    const dbAgent = this.toSnakeCase({
      ...agent,
      updatedAt: new Date().toISOString(),
    });
    const { data, error } = await this.supabase
      .from("agents")
      .upsert(dbAgent)
      .select()
      .single();
    if (error) throw new Error(`Failed to save agent: ${error.message}`);
    return this.toCamelCase(data);
  }

  async deleteAgent(id: string): Promise<void> {
    const { error } = await this.supabase.from("agents").delete().eq("id", id);
    if (error) throw new Error(`Failed to delete agent: ${error.message}`);
  }

  async cloneAgent(id: string): Promise<Agent> {
    const agent = await this.getAgent(id);
    if (!agent) throw new Error(`Agent ${id} not found`);
    const clone = { ...agent, id: `${id}-copy-${Date.now()}` };
    return this.saveAgent(clone);
  }

  // Tools ---------------------------------------------------------------
  async getTools(): Promise<Tool[]> {
    const { data, error } = await this.supabase.from("tools").select("*");
    if (error) throw new Error(`Failed to fetch tools: ${error.message}`);
    return (data || []).map((row) => this.toCamelCase(row));
  }

  async getTool(id: string): Promise<Tool | null> {
    const { data, error } = await this.supabase
      .from("tools")
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to fetch tool: ${error.message}`);
    }
    return this.toCamelCase(data);
  }

  async saveTool(tool: Tool): Promise<Tool> {
    const dbTool = this.toSnakeCase({
      ...tool,
      updatedAt: new Date().toISOString(),
    });
    const { data, error } = await this.supabase.from("tools").upsert(dbTool).select().single();
    if (error) throw new Error(`Failed to save tool: ${error.message}`);
    return this.toCamelCase(data);
  }

  async deleteTool(id: string): Promise<void> {
    const { error } = await this.supabase.from("tools").delete().eq("id", id);
    if (error) throw new Error(`Failed to delete tool: ${error.message}`);
  }

  async cloneTool(id: string): Promise<Tool> {
    const tool = await this.getTool(id);
    if (!tool) throw new Error(`Tool ${id} not found`);
    const clone = { ...tool, id: `${id}-copy-${Date.now()}` };
    return this.saveTool(clone);
  }

  // Spaces --------------------------------------------------------------
  async getSpaces(): Promise<Space[]> {
    const { data, error } = await this.supabase.from("spaces").select("*");
    if (error) throw new Error(`Failed to fetch spaces: ${error.message}`);
    return (data || []).map((row) => this.toCamelCase(row));
  }

  async getSpace(id: string): Promise<Space | null> {
    const { data, error } = await this.supabase
      .from("spaces")
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to fetch space: ${error.message}`);
    }
    return this.toCamelCase(data);
  }

  async saveSpace(space: Space): Promise<Space> {
    const dbSpace = this.toSnakeCase({
      ...space,
      updatedAt: new Date().toISOString(),
    });
    if (dbSpace.id === "") delete dbSpace.id;
    const { data, error } = await this.supabase
      .from("spaces")
      .upsert(dbSpace)
      .select()
      .single();
    if (error) throw new Error(`Failed to save space: ${error.message}`);
    return this.toCamelCase(data);
  }

  async deleteSpace(id: string): Promise<void> {
    const { error } = await this.supabase.from("spaces").delete().eq("id", id);
    if (error) throw new Error(`Failed to delete space: ${error.message}`);
  }

  // Artifacts -----------------------------------------------------------
  async getArtifacts(spaceId: string): Promise<Artifact[]> {
    const { data, error } = await this.supabase
      .from("artifacts")
      .select("*")
      .eq("space_id", spaceId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Failed to fetch artifacts: ${error.message}`);
    return (data || []).map((row) => this.toCamelCase(row));
  }

  async getArtifact(id: string): Promise<Artifact | null> {
    const { data, error } = await this.supabase
      .from("artifacts")
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to fetch artifact: ${error.message}`);
    }
    return this.toCamelCase(data);
  }

  async saveArtifact(artifact: Artifact): Promise<Artifact> {
    const dbArtifact = this.toSnakeCase({
      ...artifact,
      updatedAt: new Date().toISOString(),
    });
    const { data, error } = await this.supabase
      .from("artifacts")
      .upsert(dbArtifact)
      .select()
      .single();
    if (error) throw new Error(`Failed to save artifact: ${error.message}`);
    return this.toCamelCase(data);
  }

  async deleteArtifact(id: string): Promise<void> {
    const { error } = await this.supabase.from("artifacts").delete().eq("id", id);
    if (error) throw new Error(`Failed to delete artifact: ${error.message}`);
  }

  async getArtifactsBySpace(spaceId: string): Promise<Artifact[]> {
    const { data, error } = await this.supabase
      .from("artifacts")
      .select("*")
      .eq("space_id", spaceId)
      .is("task_id", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Failed to fetch space artifacts: ${error.message}`);
    return (data || []).map((row) => this.toCamelCase(row));
  }

  async getArtifactsByTask(taskId: string): Promise<Artifact[]> {
    const { data, error } = await this.supabase
      .from("artifacts")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Failed to fetch task artifacts: ${error.message}`);
    return (data || []).map((row) => this.toCamelCase(row));
  }

  async getArtifactsByCategory(
    id: string,
    category: "input" | "intermediate" | "output",
    isTask = false
  ): Promise<Artifact[]> {
    const field = isTask ? "task_id" : "space_id";
    const { data, error } = await this.supabase
      .from("artifacts")
      .select("*")
      .eq(field, id)
      .eq("category", category)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Failed to fetch categorized artifacts: ${error.message}`);
    return (data || []).map((row) => this.toCamelCase(row));
  }

  // Tasks ---------------------------------------------------------------
  async getTasks(spaceId: string): Promise<Task[]> {
    const { data, error } = await this.supabase
      .from("tasks")
      .select("*")
      .eq("space_id", spaceId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(`Failed to fetch tasks: ${error.message}`);
    return (data || []).map((row) => this.toCamelCase(row));
  }

  async getTask(id: string): Promise<Task | null> {
    const { data, error } = await this.supabase
      .from("tasks")
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to fetch task: ${error.message}`);
    }
    return this.toCamelCase(data);
  }

  async saveTask(task: Task): Promise<Task> {
    const dbTask = this.toSnakeCase({
      ...task,
      updatedAt: new Date().toISOString(),
    });
    const { data, error } = await this.supabase
      .from("tasks")
      .upsert(dbTask)
      .select()
      .single();
    if (error) throw new Error(`Failed to save task: ${error.message}`);
    return this.toCamelCase(data);
  }

  async deleteTask(id: string): Promise<void> {
    const { error } = await this.supabase.from("tasks").delete().eq("id", id);
    if (error) throw new Error(`Failed to delete task: ${error.message}`);
  }

  async getConversations(spaceId: string): Promise<Conversation[]> {
    const tasks = await this.getTasks(spaceId);
    return tasks as Conversation[];
  }

  async getConversation(id: string): Promise<Conversation | null> {
    const task = await this.getTask(id);
    return task as Conversation | null;
  }

  async saveConversation(conversation: Conversation): Promise<Conversation> {
    return (await this.saveTask(conversation as unknown as Task)) as unknown as Conversation;
  }

  async deleteConversation(id: string): Promise<void> {
    await this.deleteTask(id);
  }

  // Model Providers -----------------------------------------------------
  async getModelProviders(): Promise<ModelProvider[]> {
    const { data, error } = await this.supabase.from("model_providers").select("*");
    if (error) throw new Error(`Failed to fetch model providers: ${error.message}`);
    return (data || []).map((row) => this.toCamelCase(row));
  }

  async getModelProvider(id: string): Promise<ModelProvider | null> {
    const { data, error } = await this.supabase
      .from("model_providers")
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to fetch model provider: ${error.message}`);
    }
    return this.toCamelCase(data);
  }

  async saveModelProvider(provider: ModelProvider): Promise<ModelProvider> {
    const dbProvider = this.toSnakeCase({
      ...provider,
      updatedAt: new Date().toISOString(),
    });
    const { data, error } = await this.supabase
      .from("model_providers")
      .upsert(dbProvider)
      .select()
      .single();
    if (error) throw new Error(`Failed to save model provider: ${error.message}`);
    return this.toCamelCase(data);
  }

  async deleteModelProvider(id: string): Promise<void> {
    const { error } = await this.supabase.from("model_providers").delete().eq("id", id);
    if (error) throw new Error(`Failed to delete model provider: ${error.message}`);
  }

  // Datasources ---------------------------------------------------------
  async getDatasources(): Promise<Datasource[]> {
    const { data, error } = await this.supabase.from("datasources").select("*");
    if (error) throw new Error(`Failed to fetch datasources: ${error.message}`);
    return (data || []).map((row) => this.toCamelCase(row));
  }

  async getDatasource(id: string): Promise<Datasource | null> {
    const { data, error } = await this.supabase
      .from("datasources")
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to fetch datasource: ${error.message}`);
    }
    return this.toCamelCase(data);
  }

  async saveDatasource(datasource: Datasource): Promise<Datasource> {
    const dbDatasource = this.toSnakeCase({
      ...datasource,
      updatedAt: new Date().toISOString(),
    });
    const { data, error } = await this.supabase
      .from("datasources")
      .upsert(dbDatasource)
      .select()
      .single();
    if (error) throw new Error(`Failed to save datasource: ${error.message}`);
    return this.toCamelCase(data);
  }

  async deleteDatasource(id: string): Promise<void> {
    const { error } = await this.supabase.from("datasources").delete().eq("id", id);
    if (error) throw new Error(`Failed to delete datasource: ${error.message}`);
  }
}

export function createSupabaseResourceAdapter(): ResourceAdapter {
  return new SupabaseResourceAdapter();
}
