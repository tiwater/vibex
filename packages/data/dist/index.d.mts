/**
 * Data types for Vibex entities
 * Moved from lib/data/types.ts to make Vibex the single source of truth
 */
interface Agent {
    id: string;
    userId?: string;
    name: string;
    description: string;
    category?: string;
    icon?: string;
    logoUrl?: string;
    tags?: string[];
    systemPrompt?: string;
    llm?: {
        provider: string;
        model: string;
        settings?: {
            temperature?: number;
            maxTokens?: number;
            topP?: number;
            frequencyPenalty?: number;
            presencePenalty?: number;
        };
    };
    tools?: string[];
    author?: string;
    version?: string;
    usageExamples?: string[];
    requirements?: string[];
    createdAt?: string;
    updatedAt?: string;
}
interface Tool {
    id: string;
    userId?: string;
    name: string;
    description: string;
    type: "builtin" | "mcp" | "custom";
    vendor?: string;
    category?: string;
    icon?: string;
    logoUrl?: string;
    config?: Record<string, any>;
    configSchema?: any[];
    features?: string[];
    tags?: string[];
    status?: "active" | "inactive" | "deprecated";
    ready?: boolean;
    createdAt?: string;
    updatedAt?: string;
}
interface Space {
    id: string;
    userId?: string;
    name: string;
    description?: string;
    goal?: string;
    config?: Record<string, any>;
    teamConfig?: any;
    activeArtifactId?: string;
    createdAt?: string;
    updatedAt?: string;
}
interface Artifact {
    id: string;
    spaceId?: string;
    taskId?: string;
    userId?: string;
    category?: "input" | "intermediate" | "output";
    storageKey: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    metadata?: Record<string, any>;
    createdAt?: string;
    updatedAt?: string;
}
interface Conversation {
    id: string;
    spaceId?: string;
    userId?: string;
    title?: string;
    messages?: any[];
    metadata?: Record<string, any>;
    createdAt?: string;
    updatedAt?: string;
}
interface Task {
    id: string;
    spaceId?: string;
    userId?: string;
    title?: string;
    description?: string;
    status?: "pending" | "active" | "completed" | "failed";
    result?: any;
    metadata?: Record<string, any>;
    createdAt?: string;
    updatedAt?: string;
}
interface ModelConfig {
    id: string;
    name: string;
}
interface ModelProvider {
    id: string;
    name: string;
    provider: string;
    enabled?: boolean;
    baseUrl?: string;
    apiKey?: string;
    models?: string[] | ModelConfig[];
    config?: Record<string, any>;
    createdAt?: string;
    updatedAt?: string;
}
interface Datasource {
    id: string;
    name: string;
    type: string;
    config?: Record<string, any>;
    createdAt?: string;
    updatedAt?: string;
}

/**
 * DataAdapter interface for accessing agents, tools, spaces, etc.
 * This is an internal interface used by VibexDataManager.
 * External code should use VibexDataManager, not DataAdapter directly.
 */

/**
 * Internal adapter interface for data persistence
 * Implementations handle local files or remote database/API
 */
interface DataAdapter {
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
    getArtifactsByCategory(spaceOrTaskId: string, category: "input" | "intermediate" | "output", isTask?: boolean): Promise<Artifact[]>;
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

/**
 * Base Storage - Abstract storage interface for all Vibex storage needs
 */
interface ArtifactInfo {
    id: string;
    storageKey: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    category?: "input" | "intermediate" | "output";
    metadata?: Record<string, any>;
    createdAt?: string;
    updatedAt?: string;
}
interface StorageAdapter {
    readFile(path: string): Promise<Buffer>;
    readTextFile(path: string): Promise<string>;
    writeFile(path: string, data: Buffer | string): Promise<void>;
    deleteFile(path: string): Promise<void>;
    exists(path: string): Promise<boolean>;
    mkdir(path: string): Promise<void>;
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
/**
 * Base storage class with common operations
 */
declare class BaseStorage {
    protected adapter: StorageAdapter;
    protected basePath: string;
    constructor(basePath?: string, adapter?: StorageAdapter);
    /**
     * Get full path relative to base
     */
    protected getPath(...segments: string[]): string;
    /**
     * Initialize storage (ensure directories exist)
     */
    initialize(): Promise<void>;
    /**
     * Read JSON file
     */
    readJSON<T = any>(relativePath: string): Promise<T | null>;
    /**
     * Read YAML file
     */
    readYaml<T = any>(relativePath: string): Promise<T | null>;
    /**
     * Write JSON file
     */
    writeJSON(relativePath: string, data: any): Promise<void>;
    /**
     * Check if file exists
     */
    exists(relativePath: string): Promise<boolean>;
    /**
     * Read text file
     */
    readTextFile(relativePath: string): Promise<string>;
    /**
     * Write file (text or binary)
     */
    writeFile(relativePath: string, data: Buffer | string): Promise<void>;
    /**
     * Delete file
     */
    delete(relativePath: string): Promise<void>;
    /**
     * List files in directory
     */
    list(relativePath?: string): Promise<string[]>;
    /**
     * Create directory
     */
    mkdir(relativePath: string): Promise<void>;
    /**
     * Read binary file
     */
    readFile(relativePath: string): Promise<Buffer>;
    /**
     * Copy file from one storage to another
     */
    copyFileTo(relativePath: string, targetStorage: BaseStorage, targetPath: string): Promise<void>;
}

/**
 * Space Storage - Handles storage operations for spaces
 */

interface StorageOptions {
    rootPath: string;
    spaceId: string;
    adapter?: StorageAdapter;
}
declare class SpaceStorage extends BaseStorage {
    private spaceId;
    constructor(options: StorageOptions);
    getSpacePath(): string;
    getFilePath(filename: string): string;
    saveFile(filename: string, data: any): Promise<void>;
    saveFileBuffer(filename: string, data: Buffer): Promise<void>;
    /**
     * DEPRECATED: Use artifact operations below instead
     * Save an artifact file (low-level file operation only)
     */
    saveArtifact(storageKey: string, buffer: Buffer, _metadata: {
        mimeType: string;
        size: number;
        artifactType?: string;
    }, _originalFilename?: string): Promise<void>;
    saveCompleteArtifact(artifact: ArtifactInfo, buffer: Buffer): Promise<ArtifactInfo>;
    getCompleteArtifact(artifactId: string): Promise<{
        info: ArtifactInfo;
        buffer: Buffer;
    } | null>;
    getArtifactInfo(artifactId: string): Promise<ArtifactInfo | null>;
    listArtifacts(): Promise<ArtifactInfo[]>;
    deleteCompleteArtifact(artifactId: string): Promise<void>;
    listFiles(): Promise<string[]>;
    createDirectory(dirname: string): Promise<void>;
    getMetadata(): Promise<any>;
    saveMetadata(metadata: any): Promise<void>;
    getArtifact(filename: string): Promise<{
        content: Buffer;
        metadata?: any;
    } | null>;
    cleanup(): Promise<void>;
}
declare class SpaceStorageFactory {
    private static rootPath;
    static setRootPath(rootPath: string): void;
    static create(spaceId: string): Promise<SpaceStorage>;
    static list(): Promise<string[]>;
    static exists(spaceId: string): Promise<boolean>;
    static delete(spaceId: string): Promise<void>;
}

/**
 * VibexDataManager - Unified Data Access Layer
 *
 * This is the single source of truth for all Vibex data operations.
 * It unifies DataAdapter (metadata) and SpaceStorage (files) into one interface.
 *
 * Key features:
 * - Unified query interface for spaces, artifacts, tasks, agents, tools
 * - Automatic caching
 * - Real-time subscriptions (when supported)
 * - Optimistic updates
 */

interface SpaceFilters {
    userId?: string;
    name?: string;
    createdAfter?: Date;
    createdBefore?: Date;
}
interface ArtifactFilters {
    spaceId?: string;
    taskId?: string;
    category?: "input" | "intermediate" | "output";
    mimeType?: string;
}
interface TaskFilters {
    spaceId: string;
    status?: "active" | "completed" | "archived";
    createdAfter?: Date;
}
type Unsubscribe = () => void;
type SubscriptionCallback<T> = (data: T) => void;
/**
 * VibexDataManager - Central data access layer
 */
declare class VibexDataManager {
    private dataAdapter;
    private cache;
    private subscriptions;
    private cacheTTL;
    constructor(dataAdapter?: DataAdapter);
    /**
     * Create a server-side instance (uses direct database access)
     * Uses dynamic import to avoid bundling server code in client
     *
     * NOTE: This should only be called from server-side code (API routes, server components)
     */
    static createServer(): Promise<VibexDataManager>;
    /**
     * Create a server-side instance synchronously (for use in server contexts)
     * This uses require() to avoid bundling in client code
     */
    static createServerSync(): VibexDataManager;
    /**
     * Create a client-side instance (uses API calls)
     * @deprecated Client-side direct usage is deprecated. Use server actions instead.
     */
    static createClient(): VibexDataManager;
    private getCacheKey;
    private getCached;
    private setCache;
    private invalidateCache;
    private notifySubscribers;
    /**
     * Get a single space by ID
     */
    getSpace(spaceId: string): Promise<Space | null>;
    /**
     * List all spaces with optional filters
     */
    listSpaces(filters?: SpaceFilters): Promise<Space[]>;
    /**
     * Create a new space
     */
    createSpace(space: Partial<Space>): Promise<Space>;
    /**
     * Update a space
     */
    updateSpace(spaceId: string, updates: Partial<Space>): Promise<Space>;
    /**
     * Delete a space
     */
    deleteSpace(spaceId: string): Promise<void>;
    /**
     * Subscribe to space changes
     */
    subscribeToSpace(spaceId: string, callback: SubscriptionCallback<Space | null>): Unsubscribe;
    /**
     * Subscribe to all spaces
     */
    subscribeToSpaces(callback: SubscriptionCallback<Space[]>): Unsubscribe;
    /**
     * Get artifacts for a space
     */
    getArtifacts(spaceId: string, filters?: ArtifactFilters): Promise<Artifact[]>;
    /**
     * Get a single artifact by ID
     */
    getArtifact(artifactId: string): Promise<Artifact | null>;
    /**
     * Create an artifact (metadata only - file upload handled separately)
     */
    createArtifact(spaceId: string, artifact: Partial<Artifact>): Promise<Artifact>;
    /**
     * Update an artifact
     */
    updateArtifact(artifactId: string, updates: Partial<Artifact>): Promise<Artifact>;
    /**
     * Delete an artifact
     */
    deleteArtifact(artifactId: string, spaceId: string): Promise<void>;
    /**
     * Subscribe to artifacts for a space
     */
    subscribeToArtifacts(spaceId: string, callback: SubscriptionCallback<Artifact[]>): Unsubscribe;
    /**
     * Get tasks for a space
     */
    getTasks(spaceId: string, filters?: TaskFilters): Promise<Task[]>;
    /**
     * Get a single task by ID
     */
    getTask(taskId: string): Promise<Task | null>;
    /**
     * Create a new task
     */
    createTask(spaceId: string, task: Partial<Task>): Promise<Task>;
    /**
     * Update a task
     */
    updateTask(taskId: string, updates: Partial<Task>): Promise<Task>;
    /**
     * Delete a task
     */
    deleteTask(taskId: string, spaceId: string): Promise<void>;
    /**
     * Subscribe to tasks for a space
     */
    subscribeToTasks(spaceId: string, callback: SubscriptionCallback<Task[]>): Unsubscribe;
    /**
     * Get all agents
     */
    getAgents(): Promise<Agent[]>;
    /**
     * Get a single agent by ID
     */
    getAgent(agentId: string): Promise<Agent | null>;
    /**
     * Get all tools
     */
    getTools(): Promise<Tool[]>;
    /**
     * Get a single tool by ID
     */
    getTool(toolId: string): Promise<Tool | null>;
    /**
     * Get SpaceStorage instance for a space
     */
    getSpaceStorage(spaceId: string): Promise<SpaceStorage>;
    /**
     * Upload an artifact file
     */
    uploadArtifactFile(spaceId: string, artifactId: string, file: File | Blob, filename: string): Promise<string>;
    /**
     * Download an artifact file
     */
    downloadArtifactFile(spaceId: string, storageKey: string): Promise<Blob>;
    /**
     * Delete an artifact file
     */
    deleteArtifactFile(spaceId: string, storageKey: string): Promise<void>;
}
declare function getVibexDataManager(): VibexDataManager;
/**
 * Get server-side VibexDataManager (for API routes and server components)
 * This uses direct database access, not API calls
 *
 * NOTE: This function can only be called from server-side code
 */
declare function getVibexDataManagerServer(): VibexDataManager;

/**
 * DataAdapterFactory - Creates appropriate data adapter based on configuration
 * Internal to Vibex - external code should use VibexDataManager
 */

/**
 * Get data adapter for client-side and general use
 * Internal to Vibex - use VibexDataManager instead
 */
declare function getDataAdapter(): DataAdapter;
/**
 * Get data adapter for server-side API routes
 * Uses direct Supabase access in database mode (not API calls)
 *
 * NOTE: This function uses server-only imports and should only be called
 * from server-side code (API routes, server components, server actions).
 */
declare function getServerDataAdapter(): DataAdapter;

/**
 * Local filesystem adapter for storage
 * Uses ~/.vibex/spaces/{spaceId}/artifacts for blob storage
 * Uses SQLite (via LocalDataAdapter) for metadata
 */

/**
 * Local filesystem adapter
 */
declare class LocalStorageAdapter implements StorageAdapter {
    private dataAdapter;
    constructor();
    readFile(filepath: string): Promise<Buffer>;
    readTextFile(filepath: string): Promise<string>;
    writeFile(filepath: string, data: Buffer | string): Promise<void>;
    deleteFile(filepath: string): Promise<void>;
    exists(filepath: string): Promise<boolean>;
    mkdir(dirpath: string): Promise<void>;
    readdir(dirpath: string): Promise<string[]>;
    stat(filepath: string): Promise<any>;
    private getArtifactPath;
    saveArtifact(spaceId: string, artifact: ArtifactInfo, buffer: Buffer): Promise<ArtifactInfo>;
    getArtifact(spaceId: string, artifactId: string): Promise<{
        info: ArtifactInfo;
        buffer: Buffer;
    } | null>;
    getArtifactInfo(spaceId: string, artifactId: string): Promise<ArtifactInfo | null>;
    listArtifacts(spaceId: string): Promise<ArtifactInfo[]>;
    deleteArtifact(spaceId: string, artifactId: string): Promise<void>;
}

export { type Agent, type Artifact, type ArtifactInfo, BaseStorage, type Conversation, type DataAdapter, type Datasource, LocalStorageAdapter, type ModelConfig, type ModelProvider, type Space, SpaceStorage, SpaceStorageFactory, type StorageAdapter, type Task, type Tool, VibexDataManager, getDataAdapter, getServerDataAdapter, getVibexDataManager, getVibexDataManagerServer };
