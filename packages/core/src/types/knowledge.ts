/**
 * RAG Interfaces
 * 
 * These interfaces define what the core runtime needs for knowledge/RAG operations.
 * Implementations are provided by @vibex/data package.
 */

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  embedding?: number[];
}

/**
 * VectorStore interface - defines vector operations needed by core
 * Implementations are in @vibex/data (LocalVectorStore, SupabaseVectorStore, etc.)
 */
export interface VectorStore {
  addDocuments(documents: DocumentChunk[]): Promise<void>;
  similaritySearch(query: number[], k: number): Promise<DocumentChunk[]>;
  deleteDocuments(ids: string[]): Promise<void>;
}

/**
 * EmbeddingModel interface - defines embedding operations
 * Implementation uses AI SDK (AIEmbeddingModel in this package)
 */
export interface EmbeddingModel {
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
}

/**
 * KnowledgeDataManager - Interface for knowledge/RAG data operations
 * Implemented by VibexDataManager in @vibex/data
 */
export interface KnowledgeDataManager {
  saveChunks(chunks: DocumentChunk[]): Promise<void>;
  searchChunks(vector: number[], k: number): Promise<DocumentChunk[]>;
  deleteChunks(ids: string[]): Promise<void>;
}

