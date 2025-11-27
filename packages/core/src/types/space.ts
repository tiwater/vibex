/**
 * Space Types - Data persistence layer types
 *
 * This file contains all types related to Vibex's data persistence:
 * - Data types (what gets stored)
 * - Adapter interfaces (how data is accessed)
 *
 * Concrete implementations live in separate packages:
 * - @vibex/local: SQLite + filesystem
 * - @vibex/supabase: Supabase backend
 */

// ==================== Data Types ====================

/**
 * Agent data type
 */
export interface AgentType {
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
      maxOutputTokens?: number;
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

/**
 * Tool data type
 */
export interface ToolType {
  id: string;
  userId?: string;
  name: string;
  description: string;
  type: "builtin" | "mcp" | "custom";
  vendor?: string;
  category?: string;
  icon?: string;
  logoUrl?: string;
  config?: Record<string, unknown>;
  configSchema?: unknown[];
  features?: string[];
  tags?: string[];
  status?: "active" | "inactive" | "deprecated";
  ready?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Space data type
 */
export interface SpaceType {
  id: string;
  userId?: string;
  name: string;
  description?: string;
  goal?: string;
  icon?: string;
  agents?: string[];
  tools?: string[];
  config?: Record<string, unknown>;
  activeArtifactId?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Artifact data type
 */
export interface ArtifactType {
  id: string;
  spaceId?: string;
  conversationId?: string;
  userId?: string;
  category?: "input" | "intermediate" | "output";
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Conversation data type (chat session within a space)
 */
export interface ConversationType {
  id: string;
  spaceId?: string;
  userId?: string;
  title?: string;
  messages?: unknown[];
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Plan summary for progress tracking
 */
export interface PlanSummaryType {
  totalTasks: number;
  completedTasks: number;
  runningTasks: number;
  pendingTasks: number;
  failedTasks: number;
  blockedTasks: number;
  progressPercentage: number;
}

/**
 * Plan data type (stored per space, contains tasks)
 */
export interface PlanType {
  spaceId: string;
  plan: Record<string, unknown>;
  status?: string;
  summary?: PlanSummaryType;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Model provider configuration
 */
export interface ModelProviderType {
  id: string;
  name: string;
  provider: string;
  enabled?: boolean;
  baseUrl?: string;
  apiKey?: string;
  models?: string[] | { id: string; name: string }[];
  config?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Dataset for knowledge management
 */
export interface DatasetType {
  id: string;
  name: string;
  type: string;
  icon: string;
  description: string;
  items: number;
  lastUpdated: string;
  size: string;
}

/**
 * Document in a dataset
 */
export interface KnowledgeDocumentType {
  id: string;
  name: string;
  type: string;
  size: string;
  lastModified: string;
}

/**
 * Document chunk with embedding for vector search
 */
export interface DocumentChunkType {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  embedding?: number[];
}

/**
 * Artifact info for storage operations
 */
export interface ArtifactInfo {
  id: string;
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  category?: "input" | "intermediate" | "output";
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

// ==================== Adapter Interfaces ====================

/**
 * ResourceAdapter - Core interface for data persistence
 *
 * Implementations handle local files (SQLite) or remote database/API.
 * This is an internal interface; external code should use SpaceManager.
 */
export interface ResourceAdapter {
  // Agents
  getAgents(): Promise<AgentType[]>;
  getAgent(id: string): Promise<AgentType | null>;
  saveAgent(agent: AgentType): Promise<AgentType>;
  deleteAgent(id: string): Promise<void>;
  cloneAgent(id: string): Promise<AgentType>;

  // Tools
  getTools(): Promise<ToolType[]>;
  getTool(id: string): Promise<ToolType | null>;
  saveTool(tool: ToolType): Promise<ToolType>;
  deleteTool(id: string): Promise<void>;
  cloneTool(id: string): Promise<ToolType>;

  // Spaces
  getSpaces(): Promise<SpaceType[]>;
  getSpace(id: string): Promise<SpaceType | null>;
  saveSpace(space: SpaceType): Promise<SpaceType>;
  deleteSpace(id: string): Promise<void>;

  // Artifacts
  getArtifacts(spaceId: string): Promise<ArtifactType[]>;
  getArtifact(id: string): Promise<ArtifactType | null>;
  saveArtifact(artifact: ArtifactType): Promise<ArtifactType>;
  deleteArtifact(id: string): Promise<void>;
  getArtifactsBySpace(spaceId: string): Promise<ArtifactType[]>;
  getArtifactsByConversation(conversationId: string): Promise<ArtifactType[]>;
  getArtifactsByCategory(
    spaceOrConversationId: string,
    category: "input" | "intermediate" | "output",
    isConversation?: boolean
  ): Promise<ArtifactType[]>;

  // Plans (stored per space, contains tasks)
  getPlan(spaceId: string): Promise<PlanType | null>;
  savePlan(plan: PlanType): Promise<PlanType>;
  deletePlan(spaceId: string): Promise<void>;

  // Conversations (chat sessions within a space)
  getConversations(spaceId: string): Promise<ConversationType[]>;
  getConversation(id: string): Promise<ConversationType | null>;
  saveConversation(conversation: ConversationType): Promise<ConversationType>;
  deleteConversation(id: string): Promise<void>;

  // Model Providers
  getModelProviders(): Promise<ModelProviderType[]>;
  getModelProvider(id: string): Promise<ModelProviderType | null>;
  saveModelProvider(provider: ModelProviderType): Promise<ModelProviderType>;
  deleteModelProvider(id: string): Promise<void>;
}

/**
 * StorageAdapter - Interface for file/blob storage
 */
export interface StorageAdapter {
  // Low-level file operations
  readFile(path: string): Promise<Buffer>;
  readTextFile(path: string): Promise<string>;
  writeFile(path: string, data: Buffer | string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string): Promise<void>;
  readdir(path: string): Promise<string[]>;
  stat(path: string): Promise<unknown>;

  // High-level artifact operations
  saveArtifact(
    spaceId: string,
    artifact: ArtifactInfo,
    buffer: Buffer
  ): Promise<ArtifactInfo>;
  getArtifact(
    spaceId: string,
    artifactId: string
  ): Promise<{ info: ArtifactInfo; buffer: Buffer } | null>;
  getArtifactInfo(
    spaceId: string,
    artifactId: string
  ): Promise<ArtifactInfo | null>;
  listArtifacts(spaceId: string): Promise<ArtifactInfo[]>;
  deleteArtifact(spaceId: string, artifactId: string): Promise<void>;
}

/**
 * KnowledgeAdapter - Interface for knowledge/RAG operations
 */
export interface KnowledgeAdapter {
  // Datasets
  getDatasets(): Promise<DatasetType[]>;
  getDataset(id: string): Promise<DatasetType | null>;
  saveDataset(dataset: DatasetType): Promise<void>;
  deleteDataset(id: string): Promise<void>;

  // Documents
  getDocuments(datasetId: string): Promise<KnowledgeDocumentType[]>;
  addDocument(
    datasetId: string,
    document: KnowledgeDocumentType
  ): Promise<void>;
  deleteDocument(datasetId: string, documentId: string): Promise<void>;

  // Vector Operations (RAG)
  saveChunks(chunks: DocumentChunkType[]): Promise<void>;
  searchChunks(vector: number[], k: number): Promise<DocumentChunkType[]>;
  deleteChunks(ids: string[]): Promise<void>;
}
