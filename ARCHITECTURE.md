# Vibex System Architecture

## Overview

Vibex is a comprehensive **Data Management and Multi-Agent Collaboration Engine**. It is designed to build "vibe-working platforms" that excel at interactive user experiences, document chat, and complex autonomous workflows. It bridges the gap between simple chat bots and production-grade agentic automation.

## Core Design Principles

1.  **Space-Centric**: All activities happen within a "Space" — a secure container for agents, data, artifacts, and history.
2.  **Agent-First but Human-in-the-Loop**: Autonomous agents drive execution, but the workflow engine natively supports pausing for human input and approval.
3.  **Storage Agnostic**: Seamlessly switches between local (SQLite/Filesystem) and cloud (Supabase/PostgreSQL) storage without changing application logic.
4.  **Interactive & Reactive**: Built for rich UIs, emitting fine-grained events for every step of execution (planning, thinking, tool use, workflow updates).

## High-Level Architecture

```mermaid
graph TD
    Client[Client App / UI] <--> API[API Layer / Server Actions]
    API <--> Core[@vibex/core]
    API <--> Data[@vibex/data]
    
    subgraph "@vibex/core"
        XAgent[XAgent (Orchestrator)]
        Workflow[Workflow Engine]
        RAG[RAG / KnowledgeBase]
        Collab[Collaboration Manager]
        
        XAgent --> Workflow
        XAgent --> Collab
        XAgent --> RAG
        
        Workflow --> Agents[Specialized Agents]
        Agents --> Tools[@vibex/tools]
    end
    
    subgraph "@vibex/data"
        Manager[Data Manager]
        Local[Local Adapter (SQLite + FS)]
        Cloud[Supabase Adapter (PgSQL + Storage)]
        
        Manager --> Local
        Manager --> Cloud
    end
```

## Package Structure

-   **`@vibex/core`**: The brain. Contains the `Agent` base class, `XAgent` orchestrator, `WorkflowEngine`, `RAG` utilities, and `Collaboration` primitives.
-   **`@vibex/data`**: The persistence layer. Handles storing Spaces, Tasks, Agents, and Artifacts. Supports dual modes:
    -   **Local**: Uses `better-sqlite3` for structured data and local filesystem for blobs.
    -   **Cloud**: Uses Supabase (PostgreSQL) and Supabase Storage.
-   **`@vibex/tools`**: Standard library of tools (Web browsing, File I/O, Search, etc.).
-   **`@vibex/react`**: React hooks and providers for building frontends.

## Key Subsystems

### 1. The Workflow Engine
Replacing simple task lists, Vibex uses a DAG-based (Directed Acyclic Graph) workflow engine.
-   **Capabilities**: Sequential steps, Parallel execution (`race`/`wait_all`), Conditionals (`if/else`), and `human_input`.
-   **State**: Maintains persistent `WorkflowContext` allowing workflows to be paused, serialized, and resumed days later.
-   **Planning**: `XAgent` uses LLMs to dynamically generate Zod-validated workflow definitions based on user goals.

### 2. XAgent (The Orchestrator)
Every Space has an `XAgent`. It is the user's primary interface.
-   **Responsibility**: Understands intent, manages the `Plan`, delegates to specialized agents, and manages the `KnowledgeBase`.
-   **Event-Driven**: Emits events like `stepStart`, `toolCall`, `workflowPaused` to the UI for real-time feedback.

### 3. RAG & Knowledge
Vibex treats documents as first-class citizens.
-   **Vector Store**: Abstraction layer supporting `InMemory` (dev) or external vector databases.
-   **Embedding**: Pluggable embedding models via AI SDK.
-   **Artifacts**: Files uploaded to a space are automatically indexed for RAG, enabling "Chat with Document" features.

### 4. Storage & Persistence
The `@vibex/data` package abstracts infrastructure.
-   **Dual-Mode**:
    -   **Local**: Ideal for desktop apps (Electron) or local dev. Data lives in `~/.vibex/`.
    -   **Database**: Ideal for SaaS/Web. Data lives in Supabase.
-   **Synchronization**: Metadata (SQLite/Postgres) is always kept in sync with Blob storage (FS/S3).

## Comparison to Other Frameworks

| Feature | Vibex | Others (e.g., Eko, LangChain) |
| :--- | :--- | :--- |
| **Architecture** | Modular Monorepo | Often Monolithic or overly fragmented |
| **Storage** | Native Local & Cloud support | Often requires external DB setup |
| **Workflows** | **Engine-based** (Pause/Resume/Human) | Often Chain-based (Run-to-completion) |
| **Frontend** | First-class React integration | Usually backend-only SDKs |
| **Browser** | Built-in Playwright Agent | Often plugin-based |

## Future Roadmap

-   **Real-time Collaboration**: Multiplayer editing of Spaces and Plans.
-   **Edge Runtime**: optimizing core for V8 edge environments.
-   **More Vector Stores**: pgvector, Chroma, Pinecone integrations.

