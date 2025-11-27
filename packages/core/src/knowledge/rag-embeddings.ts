import { EmbeddingModel } from "./rag";
import { embed, embedMany } from "ai";


export class AIEmbeddingModel implements EmbeddingModel {
  constructor(private model: any) {}

  async embedDocuments(texts: string[]): Promise<number[][]> {
    // Use embedMany for multiple texts
    const result = await embedMany({
      model: this.model,
      values: texts,
    });
    return result.embeddings;
  }

  async embedQuery(text: string): Promise<number[]> {
    const result = await embed({
      model: this.model,
      value: text,
    });
    return result.embedding;
  }
}

