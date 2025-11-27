/**
 * @vibex/local - Local SQLite + filesystem adapters
 *
 * This package provides local storage implementations:
 * - LocalResourceAdapter: SQLite-based structured data storage
 * - LocalStorageAdapter: Filesystem-based blob storage
 * - LocalKnowledgeAdapter: Filesystem + in-memory vector store for RAG
 */

export { LocalResourceAdapter } from "./adapters/resource";
export { LocalStorageAdapter } from "./adapters/storage";
export { LocalKnowledgeAdapter } from "./adapters/knowledge";
