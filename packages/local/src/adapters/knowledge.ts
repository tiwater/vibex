/**
 * Local knowledge adapter - filesystem + in-memory vector store
 */

import fs from "fs/promises";
import os from "os";
import path from "path";
import type {
  KnowledgeAdapter,
  DatasetType,
  KnowledgeDocumentType,
  DocumentChunkType,
} from "@vibex/core";

function resolveRoot(): string {
  return process.env.VIBEX_STORAGE_PATH || path.join(os.homedir(), ".vibex");
}

interface DocumentsMap {
  [key: string]: KnowledgeDocumentType[];
}

/**
 * Local in-memory vector store implementation
 */
class LocalVectorStore {
  private documents: DocumentChunkType[] = [];

  async addDocuments(documents: DocumentChunkType[]): Promise<void> {
    this.documents.push(...documents);
  }

  async similaritySearch(query: number[], k: number): Promise<DocumentChunkType[]> {
    const scores = this.documents.map((doc) => ({
      doc,
      score: this.cosineSimilarity(query, doc.embedding!),
    }));

    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, k).map((s) => s.doc);
  }

  async deleteDocuments(ids: string[]): Promise<void> {
    this.documents = this.documents.filter((doc) => !ids.includes(doc.id));
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
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export class LocalKnowledgeAdapter implements KnowledgeAdapter {
  private configDir: string;
  private datasetsPath: string;
  private documentsPath: string;
  private vectorsPath: string;
  private vectorStore: LocalVectorStore;

  constructor(basePath?: string) {
    const root = basePath || resolveRoot();
    this.configDir = path.join(root, "config", "datasets");
    this.datasetsPath = path.join(this.configDir, "datasets.json");
    this.documentsPath = path.join(this.configDir, "documents.json");
    this.vectorsPath = path.join(this.configDir, "vectors.json");
    this.vectorStore = new LocalVectorStore();
  }

  private async ensureDir(): Promise<void> {
    await fs.mkdir(this.configDir, { recursive: true });
  }

  // ==================== Datasets ====================

  async getDatasets(): Promise<DatasetType[]> {
    try {
      const data = await fs.readFile(this.datasetsPath, "utf-8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  async getDataset(id: string): Promise<DatasetType | null> {
    const datasets = await this.getDatasets();
    return datasets.find((d) => d.id === id) || null;
  }

  async saveDataset(dataset: DatasetType): Promise<void> {
    await this.ensureDir();
    const datasets = await this.getDatasets();
    const index = datasets.findIndex((d) => d.id === dataset.id);

    if (index !== -1) {
      datasets[index] = dataset;
    } else {
      datasets.push(dataset);
    }

    await fs.writeFile(this.datasetsPath, JSON.stringify(datasets, null, 2));
  }

  async deleteDataset(id: string): Promise<void> {
    const datasets = await this.getDatasets();
    const filtered = datasets.filter((d) => d.id !== id);
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

  async getDocuments(datasetId: string): Promise<KnowledgeDocumentType[]> {
    const map = await this.loadDocumentsMap();
    return map[datasetId] || [];
  }

  async addDocument(
    datasetId: string,
    document: KnowledgeDocumentType
  ): Promise<void> {
    const map = await this.loadDocumentsMap();
    if (!map[datasetId]) {
      map[datasetId] = [];
    }
    const existingIdx = map[datasetId].findIndex((d) => d.id === document.id);
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
      map[datasetId] = map[datasetId].filter((d) => d.id !== documentId);
      await this.saveDocumentsMap(map);
    }
  }

  // ==================== Vector Operations ====================

  private async loadChunks(): Promise<DocumentChunkType[]> {
    try {
      const data = await fs.readFile(this.vectorsPath, "utf-8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private async ensureVectorStoreLoaded(): Promise<void> {
    const chunks = await this.loadChunks();
    if (chunks.length > 0) {
      this.vectorStore = new LocalVectorStore();
      await this.vectorStore.addDocuments(chunks);
    }
  }

  private async saveAllChunks(chunks: DocumentChunkType[]): Promise<void> {
    await this.ensureDir();
    await fs.writeFile(this.vectorsPath, JSON.stringify(chunks, null, 2));
  }

  async saveChunks(newChunks: DocumentChunkType[]): Promise<void> {
    await this.ensureVectorStoreLoaded();
    await this.vectorStore.addDocuments(newChunks);

    const chunks = await this.loadChunks();
    const existingIds = new Set(chunks.map((c) => c.id));
    const toAdd = newChunks.filter((c) => !existingIds.has(c.id));

    chunks.push(...toAdd);
    await this.saveAllChunks(chunks);
  }

  async deleteChunks(ids: string[]): Promise<void> {
    await this.ensureVectorStoreLoaded();
    await this.vectorStore.deleteDocuments(ids);

    const chunks = await this.loadChunks();
    const filtered = chunks.filter((c) => !ids.includes(c.id));
    await this.saveAllChunks(filtered);
  }

  async searchChunks(queryVector: number[], k: number): Promise<DocumentChunkType[]> {
    await this.ensureVectorStoreLoaded();
    return this.vectorStore.similaritySearch(queryVector, k);
  }
}

