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
import { createServiceRoleClient } from "./client";

/**
 * SupabaseResourceAdapter - Direct Supabase/PostgreSQL database access
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
      const snakeKey = key.replace(
        /[A-Z]/g,
        (letter) => `_${letter.toLowerCase()}`
      );
      result[snakeKey] =
        typeof value === "object" && value !== null
          ? this.toSnakeCase(value)
          : value;
    }
    return result;
  }

  private toCamelCase(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map((v) => this.toCamelCase(v));
    if (typeof obj !== "object") return obj;

    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
        letter.toUpperCase()
      );
      result[camelKey] =
        typeof value === "object" && value !== null
          ? this.toCamelCase(value)
          : value;
    }
    return result;
  }

  // Agents --------------------------------------------------------------
  async getAgents(): Promise<AgentType[]> {
    const { data, error } = await this.supabase.from("agents").select("*");
    if (error) throw new Error(`Failed to fetch agents: ${error.message}`);
    return (data || []).map((row) => this.toCamelCase(row));
  }

  async getAgent(id: string): Promise<AgentType | null> {
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

  async saveAgent(agent: AgentType): Promise<AgentType> {
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

  async cloneAgent(id: string): Promise<AgentType> {
    const agent = await this.getAgent(id);
    if (!agent) throw new Error(`Agent ${id} not found`);
    const clone = { ...agent, id: `${id}-copy-${Date.now()}` };
    return this.saveAgent(clone);
  }

  // Tools ---------------------------------------------------------------
  async getTools(): Promise<ToolType[]> {
    const { data, error } = await this.supabase.from("tools").select("*");
    if (error) throw new Error(`Failed to fetch tools: ${error.message}`);
    return (data || []).map((row) => this.toCamelCase(row));
  }

  async getTool(id: string): Promise<ToolType | null> {
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

  async saveTool(tool: ToolType): Promise<ToolType> {
    const dbTool = this.toSnakeCase({
      ...tool,
      updatedAt: new Date().toISOString(),
    });
    const { data, error } = await this.supabase
      .from("tools")
      .upsert(dbTool)
      .select()
      .single();
    if (error) throw new Error(`Failed to save tool: ${error.message}`);
    return this.toCamelCase(data);
  }

  async deleteTool(id: string): Promise<void> {
    const { error } = await this.supabase.from("tools").delete().eq("id", id);
    if (error) throw new Error(`Failed to delete tool: ${error.message}`);
  }

  async cloneTool(id: string): Promise<ToolType> {
    const tool = await this.getTool(id);
    if (!tool) throw new Error(`Tool ${id} not found`);
    const clone = { ...tool, id: `${id}-copy-${Date.now()}` };
    return this.saveTool(clone);
  }

  // Spaces --------------------------------------------------------------
  async getSpaces(): Promise<SpaceType[]> {
    const { data, error } = await this.supabase.from("spaces").select("*");
    if (error) throw new Error(`Failed to fetch spaces: ${error.message}`);
    return (data || []).map((row) => this.toCamelCase(row));
  }

  async getSpace(id: string): Promise<SpaceType | null> {
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

  async saveSpace(space: SpaceType): Promise<SpaceType> {
    const dbSpace = this.toSnakeCase({
      ...space,
      description: space.goal || space.description || null,
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

  // Plans ---------------------------------------------------------------
  async getPlan(spaceId: string): Promise<PlanType | null> {
    const { data, error } = await this.supabase
      .from("space_plans")
      .select("*")
      .eq("space_id", spaceId)
      .single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to fetch plan: ${error.message}`);
    }
    const record = this.toCamelCase(data);
    return {
      spaceId: record.spaceId,
      plan: record.plan,
      status: record.status,
      summary: record.summary,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async savePlan(plan: PlanType): Promise<PlanType> {
    const dbPlan = this.toSnakeCase({
      ...plan,
      updatedAt: new Date().toISOString(),
    });
    const { data, error } = await this.supabase
      .from("space_plans")
      .upsert(dbPlan)
      .select()
      .single();
    if (error) throw new Error(`Failed to save plan: ${error.message}`);
    const record = this.toCamelCase(data);
    return {
      spaceId: record.spaceId,
      plan: record.plan,
      status: record.status,
      summary: record.summary,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async deletePlan(spaceId: string): Promise<void> {
    const { error } = await this.supabase
      .from("space_plans")
      .delete()
      .eq("space_id", spaceId);
    if (error) throw new Error(`Failed to delete plan: ${error.message}`);
  }

  // Artifacts -----------------------------------------------------------
  async getArtifacts(spaceId: string): Promise<ArtifactType[]> {
    const { data, error } = await this.supabase
      .from("artifacts")
      .select("*")
      .eq("space_id", spaceId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Failed to fetch artifacts: ${error.message}`);
    return (data || []).map((row) => this.toCamelCase(row));
  }

  async getArtifact(id: string): Promise<ArtifactType | null> {
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

  async saveArtifact(artifact: ArtifactType): Promise<ArtifactType> {
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
    const { error } = await this.supabase
      .from("artifacts")
      .delete()
      .eq("id", id);
    if (error) throw new Error(`Failed to delete artifact: ${error.message}`);
  }

  async getArtifactsBySpace(spaceId: string): Promise<ArtifactType[]> {
    const { data, error } = await this.supabase
      .from("artifacts")
      .select("*")
      .eq("space_id", spaceId)
      .is("conversation_id", null)
      .order("created_at", { ascending: false });
    if (error)
      throw new Error(`Failed to fetch space artifacts: ${error.message}`);
    return (data || []).map((row) => this.toCamelCase(row));
  }

  async getArtifactsByConversation(conversationId: string): Promise<ArtifactType[]> {
    const { data, error } = await this.supabase
      .from("artifacts")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false });
    if (error)
      throw new Error(`Failed to fetch conversation artifacts: ${error.message}`);
    return (data || []).map((row) => this.toCamelCase(row));
  }

  async getArtifactsByCategory(
    spaceOrConversationId: string,
    category: "input" | "intermediate" | "output",
    isConversation = false
  ): Promise<ArtifactType[]> {
    const field = isConversation ? "conversation_id" : "space_id";
    const { data, error } = await this.supabase
      .from("artifacts")
      .select("*")
      .eq(field, spaceOrConversationId)
      .eq("category", category)
      .order("created_at", { ascending: false });
    if (error)
      throw new Error(
        `Failed to fetch categorized artifacts: ${error.message}`
      );
    return (data || []).map((row) => this.toCamelCase(row));
  }

  // Conversations -------------------------------------------------------
  async getConversations(spaceId: string): Promise<ConversationType[]> {
    const { data, error } = await this.supabase
      .from("conversations")
      .select("*")
      .eq("space_id", spaceId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(`Failed to fetch conversations: ${error.message}`);
    return (data || []).map((row) => this.toCamelCase(row));
  }

  async getConversation(id: string): Promise<ConversationType | null> {
    const { data, error } = await this.supabase
      .from("conversations")
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to fetch conversation: ${error.message}`);
    }
    return this.toCamelCase(data);
  }

  async saveConversation(conversation: ConversationType): Promise<ConversationType> {
    const dbConversation = this.toSnakeCase({
      ...conversation,
      updatedAt: new Date().toISOString(),
    });
    const { data, error } = await this.supabase
      .from("conversations")
      .upsert(dbConversation)
      .select()
      .single();
    if (error) throw new Error(`Failed to save conversation: ${error.message}`);
    return this.toCamelCase(data);
  }

  async deleteConversation(id: string): Promise<void> {
    const { error } = await this.supabase.from("conversations").delete().eq("id", id);
    if (error) throw new Error(`Failed to delete conversation: ${error.message}`);
  }

  // Model Providers -----------------------------------------------------
  async getModelProviders(): Promise<ModelProviderType[]> {
    const { data, error } = await this.supabase
      .from("model_providers")
      .select("*");
    if (error)
      throw new Error(`Failed to fetch model providers: ${error.message}`);
    return (data || []).map((row) => this.toCamelCase(row));
  }

  async getModelProvider(id: string): Promise<ModelProviderType | null> {
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

  async saveModelProvider(provider: ModelProviderType): Promise<ModelProviderType> {
    const dbProvider = this.toSnakeCase({
      ...provider,
      updatedAt: new Date().toISOString(),
    });
    const { data, error } = await this.supabase
      .from("model_providers")
      .upsert(dbProvider)
      .select()
      .single();
    if (error)
      throw new Error(`Failed to save model provider: ${error.message}`);
    return this.toCamelCase(data);
  }

  async deleteModelProvider(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("model_providers")
      .delete()
      .eq("id", id);
    if (error)
      throw new Error(`Failed to delete model provider: ${error.message}`);
  }
}

export function createSupabaseResourceAdapter(): ResourceAdapter {
  return new SupabaseResourceAdapter();
}
