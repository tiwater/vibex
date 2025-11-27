# Vibex Package Structure & Responsibilities

## Core Principle

**`@vibex/core` is the pure runtime engine that orchestrates and drives all other packages. It defines WHAT it needs, and other packages provide HOW to implement it.**

## Package Responsibilities

### `@vibex/core` - The Runtime Engine

**Position**: Central orchestrator that drives all other packages.

**Contains**:

- ✅ Agent base class and orchestration logic
- ✅ Workflow engine (DAG execution)
- ✅ XAgent (orchestrator)
- ✅ Collaboration primitives
- ✅ **Interfaces only** for data, knowledge, memory, storage

**Does NOT contain**:

- ❌ Storage implementations
- ❌ Vector store implementations
- ❌ Database adapters
- ❌ Any persistence logic

**Dependencies**:

- Uses `@vibex/data` for ALL data operations
- Uses `@vibex/tools` for tool registry
- Uses `@vibex/defaults` for configurations

---

### `@vibex/data` - Unified Data Persistence Layer

**Position**: Manages **ALL** data used by the core engine.

**Contains**:

- ✅ **Structured Data** (Spaces, Tasks, Artifacts, Agents, Tools)
  - `ResourceAdapter` interface
  - Local implementation (SQLite)
  - Supabase implementation (PostgreSQL)
- ✅ **Knowledge/Vector Data** (RAG chunks, embeddings)
  - `KnowledgeAdapter` interface
  - Local implementation (JSON + in-memory search)
  - Supabase implementation (pgvector)
- ✅ **Memory** (Semantic memory for agents) - _To be implemented_
  - `MemoryAdapter` interface
  - Local/Supabase implementations
- ✅ **File Storage** (Artifact files, blobs)
  - `StorageAdapter` interface
  - Local implementation (filesystem)
  - Supabase implementation (Supabase Storage)
- ✅ `VibexDataManager` - Unified access layer

**Key Principle**: Core never touches storage directly. All data access goes through `VibexDataManager`.

---

### `@vibex/supabase` - Cloud Backend

**Position**: Concrete Supabase implementations of `@vibex/data` adapters.

**Contains**:

- ✅ `SupabaseResourceAdapter`
- ✅ `SupabaseStorageAdapter`
- ✅ `SupabaseKnowledgeAdapter`
- ✅ `SupabaseMemoryAdapter` (to be implemented)

---

### `@vibex/tools` - Tool Library

**Position**: First-party tool implementations.

**Contains**:

- ✅ Web browsing (Playwright)
- ✅ File I/O
- ✅ Search operations
- ✅ Database tools

---

### `@vibex/react` - React Integration

**Position**: React-facing API.

**Contains**:

- ✅ React hooks
- ✅ Zustand store
- ✅ Server actions wrapper

---

### `@vibex/server` - Server Helpers

**Position**: Server-only integration helpers.

**Contains**:

- ✅ Next.js route handlers
- ✅ Server actions
- ✅ Background workers

---

### `@vibex/defaults` - Configurations

**Position**: Versioned configs and templates.

**Contains**:

- ✅ Agent templates (YAML)
- ✅ Tool configurations
- ✅ Space templates
- ✅ Prompts

---

## Data Flow

```
@vibex/core (Runtime Engine)
    ↓ drives
@vibex/data (Data Layer)
    ↓ uses adapters from
@vibex/supabase (Cloud) or Local (built-in)
```

## Current Issues & Migration

### Issues

1. ❌ `InMemoryVectorStore` in `@vibex/core` → Should be in `@vibex/data`
2. ❌ Knowledge interfaces split between core and data → Should be only in data
3. ❌ Memory system not implemented → Needs to be added to `@vibex/data`
4. ❌ Core has some storage assumptions → Should be pure interfaces

### Migration Steps

1. Move `InMemoryVectorStore` from `core/src/knowledge/rag-memory-store.ts` to `data/src/knowledge/`
2. Keep only interfaces in `core/src/knowledge/rag.ts`
3. Add `MemoryAdapter` to `data/src/knowledge/` or `data/src/memory/`
4. Ensure core has zero storage implementation dependencies
