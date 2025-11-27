/**
 * RAG Interfaces
 */

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  embedding?: number[];
}

export interface VectorStore {
  addDocuments(documents: DocumentChunk[]): Promise<void>;
  similaritySearch(query: number[], k: number): Promise<DocumentChunk[]>;
  deleteDocuments(ids: string[]): Promise<void>;
}

export interface EmbeddingModel {
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
}

import { getVibexDataManagerServer } from "@vibex/data";

export class KnowledgeBase {
  constructor(
    private embeddings: EmbeddingModel
  ) {}

  async addText(text: string, metadata: Record<string, unknown> = {}): Promise<void> {
    // Simple chunking (can be improved)
    const chunks = this.chunkText(text);
    const vectors = await this.embeddings.embedDocuments(chunks);
    
    const docs: DocumentChunk[] = chunks.map((content, i) => ({
      id: `${Date.now()}-${i}`,
      content,
      metadata,
      embedding: vectors[i],
    }));

    const dataManager = getVibexDataManagerServer();
    await dataManager.saveChunks(docs);
  }

  async query(text: string, k: number = 5): Promise<DocumentChunk[]> {
    const vector = await this.embeddings.embedQuery(text);
    const dataManager = getVibexDataManagerServer();
    return dataManager.searchChunks(vector, k);
  }

  private chunkText(text: string, size: number = 1000): string[] {
    const chunks = [];
    for (let i = 0; i < text.length; i += size) {
      chunks.push(text.slice(i, i + size));
    }
    return chunks;
  }
}

