/**
 * KnowledgeAdapter interface for managing datasets and documents.
 */

export interface Dataset {
  id: string;
  name: string;
  type: string;
  icon: string;
  description: string;
  items: number;
  lastUpdated: string;
  size: string;
}

export interface KnowledgeDocument {
  id: string;
  name: string;
  type: string;
  size: string;
  lastModified: string;
}

export interface DocumentsMap {
  [key: string]: KnowledgeDocument[];
}

export interface KnowledgeAdapter {
  // Datasets
  getDatasets(): Promise<Dataset[]>;
  getDataset(id: string): Promise<Dataset | null>;
  saveDataset(dataset: Dataset): Promise<void>;
  deleteDataset(id: string): Promise<void>;

  // Documents
  getDocuments(datasetId: string): Promise<KnowledgeDocument[]>;
  addDocument(datasetId: string, document: KnowledgeDocument): Promise<void>;
  deleteDocument(datasetId: string, documentId: string): Promise<void>;
  
  // Vector Operations (RAG)
  saveChunks(chunks: DocumentChunk[]): Promise<void>;
  searchChunks(vector: number[], k: number): Promise<DocumentChunk[]>;
  deleteChunks(ids: string[]): Promise<void>;
}

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  embedding?: number[];
}
