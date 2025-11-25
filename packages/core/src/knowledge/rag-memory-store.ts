import { VectorStore, DocumentChunk } from "./rag";

export class InMemoryVectorStore implements VectorStore {
  private documents: DocumentChunk[] = [];

  async addDocuments(documents: DocumentChunk[]): Promise<void> {
    this.documents.push(...documents);
  }

  async similaritySearch(query: number[], k: number): Promise<DocumentChunk[]> {
    // Simple cosine similarity
    const scores = this.documents.map(doc => ({
      doc,
      score: this.cosineSimilarity(query, doc.embedding!),
    }));

    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, k).map(s => s.doc);
  }

  async deleteDocuments(ids: string[]): Promise<void> {
    this.documents = this.documents.filter(doc => !ids.includes(doc.id));
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

