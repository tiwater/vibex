import fs from "fs/promises";
import path from "path";
import { VibexPaths } from "../utils/paths";
import type { 
  KnowledgeAdapter, 
  Dataset, 
  KnowledgeDocument, 
  DocumentsMap,
  DocumentChunk 
} from "./adapter";

export class LocalKnowledgeAdapter implements KnowledgeAdapter {
  private configDir: string;
  private datasetsPath: string;
  private documentsPath: string;
  private vectorsPath: string;

  constructor(basePath?: string) {
    // Use provided path or default from VibexPaths
    this.configDir = basePath ? path.join(basePath, "config", "datasets") : VibexPaths.datasets();
    this.datasetsPath = path.join(this.configDir, "datasets.json");
    this.documentsPath = path.join(this.configDir, "documents.json");
    this.vectorsPath = path.join(this.configDir, "vectors.json");
  }

  private async ensureDir(): Promise<void> {
    await fs.mkdir(this.configDir, { recursive: true });
  }

  // ==================== Datasets ====================

  async getDatasets(): Promise<Dataset[]> {
    try {
      const data = await fs.readFile(this.datasetsPath, "utf-8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  async getDataset(id: string): Promise<Dataset | null> {
    const datasets = await this.getDatasets();
    return datasets.find(d => d.id === id) || null;
  }

  async saveDataset(dataset: Dataset): Promise<void> {
    await this.ensureDir();
    const datasets = await this.getDatasets();
    const index = datasets.findIndex(d => d.id === dataset.id);
    
    if (index !== -1) {
      datasets[index] = dataset;
    } else {
      datasets.push(dataset);
    }
    
    await fs.writeFile(this.datasetsPath, JSON.stringify(datasets, null, 2));
  }

  async deleteDataset(id: string): Promise<void> {
    const datasets = await this.getDatasets();
    const filtered = datasets.filter(d => d.id !== id);
    await this.ensureDir();
    await fs.writeFile(this.datasetsPath, JSON.stringify(filtered, null, 2));

    // Also remove associated documents
    const documents = await this.loadDocumentsMap();
    if (documents[id]) {
      delete documents[id];
      await this.saveDocumentsMap(documents);
    }
  }

  // ==================== Documents ====================

  private async loadDocumentsMap(): Promise<DocumentsMap> {
    try {
      const data = await fs.readFile(this.documentsPath, "utf-8");
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  private async saveDocumentsMap(documents: DocumentsMap): Promise<void> {
    await this.ensureDir();
    await fs.writeFile(this.documentsPath, JSON.stringify(documents, null, 2));
  }

  async getDocuments(datasetId: string): Promise<KnowledgeDocument[]> {
    const map = await this.loadDocumentsMap();
    return map[datasetId] || [];
  }

  async addDocument(datasetId: string, document: KnowledgeDocument): Promise<void> {
    const map = await this.loadDocumentsMap();
    if (!map[datasetId]) {
      map[datasetId] = [];
    }
    // Check if exists
    const existingIdx = map[datasetId].findIndex(d => d.id === document.id);
    if (existingIdx !== -1) {
      map[datasetId][existingIdx] = document;
    } else {
      map[datasetId].push(document);
    }
    await this.saveDocumentsMap(map);
  }

  async deleteDocument(datasetId: string, documentId: string): Promise<void> {
    const map = await this.loadDocumentsMap();
    if (map[datasetId]) {
      map[datasetId] = map[datasetId].filter(d => d.id !== documentId);
      await this.saveDocumentsMap(map);
    }
  }

  // ==================== Vector Operations ====================

  private async loadChunks(): Promise<DocumentChunk[]> {
    try {
      const data = await fs.readFile(this.vectorsPath, "utf-8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private async saveAllChunks(chunks: DocumentChunk[]): Promise<void> {
    await this.ensureDir();
    await fs.writeFile(this.vectorsPath, JSON.stringify(chunks, null, 2));
  }

  async saveChunks(newChunks: DocumentChunk[]): Promise<void> {
    const chunks = await this.loadChunks();
    // Append or replace? Usually append.
    // We might want to deduplicate by ID if needed.
    const existingIds = new Set(chunks.map(c => c.id));
    const toAdd = newChunks.filter(c => !existingIds.has(c.id));
    
    // If we want to support updates, we should replace.
    // For now, simple append of new IDs.
    chunks.push(...toAdd);
    await this.saveAllChunks(chunks);
  }

  async deleteChunks(ids: string[]): Promise<void> {
    const chunks = await this.loadChunks();
    const filtered = chunks.filter(c => !ids.includes(c.id));
    await this.saveAllChunks(filtered);
  }

  async searchChunks(queryVector: number[], k: number): Promise<DocumentChunk[]> {
    const chunks = await this.loadChunks();
    
    // Calculate cosine similarity
    const scored = chunks.map(chunk => {
      if (!chunk.embedding) return { chunk, score: -1 };
      return {
        chunk,
        score: this.cosineSimilarity(queryVector, chunk.embedding)
      };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, k).map(s => s.chunk);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
