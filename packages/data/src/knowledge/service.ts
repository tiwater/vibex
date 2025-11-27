import { EmbeddingModel, KnowledgeDataManager, DocumentChunk } from "@vibex/core/dist/types/knowledge";

export class KnowledgeService {
  constructor(
    private embeddings: EmbeddingModel,
    private dataManager: KnowledgeDataManager
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

    await this.dataManager.saveChunks(docs);
  }

  async query(text: string, k: number = 5): Promise<DocumentChunk[]> {
    const vector = await this.embeddings.embedQuery(text);
    return this.dataManager.searchChunks(vector, k);
  }

  private chunkText(text: string, size: number = 1000): string[] {
    const chunks = [];
    for (let i = 0; i < text.length; i += size) {
      chunks.push(text.slice(i, i + size));
    }
    return chunks;
  }
}

