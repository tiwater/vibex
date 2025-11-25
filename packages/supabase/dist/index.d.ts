import { DataAdapter, Agent, Tool, Space, Artifact, Task, Conversation, ModelProvider, Datasource, StorageAdapter, ArtifactInfo } from '@vibex/data';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * SupabaseDatabaseAdapter - Direct Supabase/PostgreSQL database access
 * Mirrors the previous implementation from @vibex/data but lives in @vibex/supabase now.
 */
declare class SupabaseDataAdapter implements DataAdapter {
    private supabase;
    private toSnakeCase;
    private toCamelCase;
    getAgents(): Promise<Agent[]>;
    getAgent(id: string): Promise<Agent | null>;
    saveAgent(agent: Agent): Promise<Agent>;
    deleteAgent(id: string): Promise<void>;
    cloneAgent(id: string): Promise<Agent>;
    getTools(): Promise<Tool[]>;
    getTool(id: string): Promise<Tool | null>;
    saveTool(tool: Tool): Promise<Tool>;
    deleteTool(id: string): Promise<void>;
    cloneTool(id: string): Promise<Tool>;
    getSpaces(): Promise<Space[]>;
    getSpace(id: string): Promise<Space | null>;
    saveSpace(space: Space): Promise<Space>;
    deleteSpace(id: string): Promise<void>;
    getArtifacts(spaceId: string): Promise<Artifact[]>;
    getArtifact(id: string): Promise<Artifact | null>;
    saveArtifact(artifact: Artifact): Promise<Artifact>;
    deleteArtifact(id: string): Promise<void>;
    getArtifactsBySpace(spaceId: string): Promise<Artifact[]>;
    getArtifactsByTask(taskId: string): Promise<Artifact[]>;
    getArtifactsByCategory(id: string, category: "input" | "intermediate" | "output", isTask?: boolean): Promise<Artifact[]>;
    getTasks(spaceId: string): Promise<Task[]>;
    getTask(id: string): Promise<Task | null>;
    saveTask(task: Task): Promise<Task>;
    deleteTask(id: string): Promise<void>;
    getConversations(spaceId: string): Promise<Conversation[]>;
    getConversation(id: string): Promise<Conversation | null>;
    saveConversation(conversation: Conversation): Promise<Conversation>;
    deleteConversation(id: string): Promise<void>;
    getModelProviders(): Promise<ModelProvider[]>;
    getModelProvider(id: string): Promise<ModelProvider | null>;
    saveModelProvider(provider: ModelProvider): Promise<ModelProvider>;
    deleteModelProvider(id: string): Promise<void>;
    getDatasources(): Promise<Datasource[]>;
    getDatasource(id: string): Promise<Datasource | null>;
    saveDatasource(datasource: Datasource): Promise<Datasource>;
    deleteDatasource(id: string): Promise<void>;
}
declare function createSupabaseDataAdapter(): DataAdapter;

interface SupabaseStorageConfig {
    defaultBucket?: string;
    accessToken?: string;
}
declare class SupabaseStorageAdapter implements StorageAdapter {
    private client;
    private serviceClient;
    private config;
    constructor(config?: SupabaseStorageConfig);
    private bucket;
    private normalize;
    readFile(path: string): Promise<Buffer>;
    readTextFile(path: string): Promise<string>;
    writeFile(path: string, data: Buffer | string): Promise<void>;
    deleteFile(path: string): Promise<void>;
    exists(path: string): Promise<boolean>;
    mkdir(_path: string): Promise<void>;
    readdir(path: string): Promise<string[]>;
    stat(path: string): Promise<any>;
    saveArtifact(spaceId: string, artifact: ArtifactInfo, buffer: Buffer): Promise<ArtifactInfo>;
    getArtifact(spaceId: string, artifactId: string): Promise<{
        info: ArtifactInfo;
        buffer: Buffer;
    } | null>;
    getArtifactInfo(spaceId: string, artifactId: string): Promise<ArtifactInfo | null>;
    listArtifacts(spaceId: string): Promise<ArtifactInfo[]>;
    deleteArtifact(spaceId: string, artifactId: string): Promise<void>;
}

declare function createServiceRoleClient(): SupabaseClient;
declare function createAnonClient(accessToken?: string): SupabaseClient;

export { SupabaseDataAdapter, SupabaseStorageAdapter, createAnonClient, createServiceRoleClient, createSupabaseDataAdapter };
