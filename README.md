<p align="center">
  <img src="docs/public/logo.png" alt="VibeX Logo" width="120" />
</p>

<h1 align="center">VibeX</h1>

<p align="center">
  <strong>Evolve with Dedicated Agentic Teams</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/vibex"><img src="https://img.shields.io/npm/v/vibex.svg?style=flat-square&color=blue" alt="npm version" /></a>
  <a href="https://github.com/tiwater/vibex/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg?style=flat-square" alt="License" /></a>
  <a href="https://github.com/tiwater/vibex"><img src="https://img.shields.io/github/stars/tiwater/vibex?style=flat-square" alt="GitHub stars" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg?style=flat-square" alt="Node.js" /></a>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-packages">Packages</a> •
  <a href="#-documentation">Documentation</a> •
  <a href="#-contributing">Contributing</a>
</p>

---

## 🌟 What is VibeX?

VibeX is a **space-oriented collaborative workspace platform** designed for persistent, evolving work with AI agents. Unlike traditional task-oriented frameworks that simply execute and terminate, VibeX provides **persistent workspaces** where artifacts evolve through continuous user-agent collaboration.

| Aspect           | Task-Oriented (Others)           | Space-Oriented (VibeX)                     |
| ---------------- | -------------------------------- | ------------------------------------------ |
| **Mental Model** | "Run a task, get a result, done" | "Enter a space, evolve artifacts, iterate" |
| **Lifecycle**    | One-shot execution               | Persistent, continuous collaboration       |
| **State**        | Ephemeral (task context)         | Persistent (space with history)            |
| **Artifacts**    | Output files                     | Living documents that evolve               |

## ✨ Features

- 🏠 **Persistent Spaces** — Your work survives across sessions with full context preservation
- 📄 **Artifact Evolution** — Documents and files improve over time with automatic version history
- 🤖 **Multi-Agent Orchestration** — XAgent coordinates specialist agents (Writer, Researcher, Developer, etc.)
- 🔧 **Rich Tool Library** — Web browsing, file I/O, search operations, and more out of the box
- 💾 **Storage Agnostic** — Seamlessly switch between local (SQLite/Filesystem) and cloud (Supabase/PostgreSQL)
- ⚛️ **React Integration** — First-class React hooks and components for building UIs
- 🔄 **Session Continuity** — Resume any workspace at any time with full context
- 🧠 **Context Accumulation** — The system remembers everything about your project

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/tiwater/vibex.git
cd vibex

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Basic Usage

```typescript
import { XAgent } from "vibex";

async function main() {
  // Start a new persistent workspace (returns XAgent)
  const xAgent = await XAgent.start("Write my thesis");
  const space = xAgent.getSpace();

  // Stream a response from XAgent
  const stream = await xAgent.streamText({
    messages: [{ role: "user", content: "Write the introduction" }],
    metadata: { mode: "agent", requestedAgent: "X" },
  });

  for await (const chunk of stream.textStream) {
    process.stdout.write(chunk);
  }

  // Save the workspace
  await space.persistState();

  // Later... resume the workspace
  const resumedXAgent = await XAgent.resume(space.spaceId);
  // XAgent remembers everything from before!
}
```

### Multi-Session Research Example

```typescript
// Session 1: Start research
const xAgent = await XAgent.start("Research climate change");
const space = xAgent.getSpace();

await xAgent.streamText({
  messages: [{ role: "user", content: "Research climate change impacts" }],
  metadata: { mode: "agent", requestedAgent: "X" },
});

await space.persistState(); // Save progress

// Session 2: Continue (days later...)
const xAgent2 = await XAgent.resume(space.spaceId);
// XAgent has full context from Session 1!

await xAgent2.streamText({
  messages: [{ role: "user", content: "Synthesize into key findings" }],
  metadata: { mode: "agent", requestedAgent: "X" },
});
```

## 📚 Examples

Explore these examples to see VibeX in action:

| Example                                                 | Description                                                            |
| ------------------------------------------------------- | ---------------------------------------------------------------------- |
| [**Quick Start**](./examples/quick-start)               | Get started in 5 minutes — basic usage, streaming, and session resume  |
| [**Thesis Writer**](./examples/thesis-writer)           | Multi-session document evolution — write and refine a thesis over days |
| [**Research Assistant**](./examples/research-assistant) | Knowledge accumulation — build a persistent knowledge base             |
| [**Code Review**](./examples/code-review)               | Collaborative code review — track issues and apply fixes iteratively   |

```bash
# Run an example
cd examples/quick-start
pnpm install
pnpm start
```

## 📦 Packages

VibeX is organized as a monorepo with the following packages:

| Package                                  | Description                                                           |
| ---------------------------------------- | --------------------------------------------------------------------- |
| [`vibex`](./packages/vibex)              | Core runtime engine — manages Spaces, XAgents, and artifact evolution |
| [`@vibex/core`](./packages/core)         | Shared types, interfaces, and utilities                               |
| [`@vibex/space`](./packages/space)       | Unified data persistence layer with adapters                          |
| [`@vibex/react`](./packages/react)       | React hooks and components (`useSpace`, `useChat`, `useArtifact`)     |
| [`@vibex/tools`](./packages/tools)       | Standard tool library (web browsing, file I/O, search)                |
| [`@vibex/supabase`](./packages/supabase) | Cloud backend adapter for Supabase                                    |
| [`@vibex/defaults`](./packages/defaults) | Default agent configurations and prompt templates                     |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client App / UI                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    vibex (Runtime Engine)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │    Space    │  │   XAgent    │  │    Specialist Agents    │  │
│  │ (Container) │  │  (Manager)  │  │ (Writer/Researcher/...) │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Artifacts  │  │   History   │  │    Workflow Engine      │  │
│  │ (Versioned) │  │ (Preserved) │  │    (DAG Execution)      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  @vibex/space (Data Layer)                      │
│  ┌───────────────┐  ┌─────────────────┐  ┌──────────────────┐   │
│  │ResourceAdapter│  │KnowledgeAdapter │  │ StorageAdapter   │   │
│  │(Spaces/Tasks) │  │ (RAG/Vectors)   │  │ (Files/Blobs)    │   │
│  └───────────────┘  └─────────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│     Local Storage       │     │   Supabase (Cloud)      │
│  SQLite + Filesystem    │     │  PostgreSQL + Storage   │
└─────────────────────────┘     └─────────────────────────┘
```

## 💾 Storage Providers

VibeX supports two built-in storage backends:

### Local Storage

Uses **SQLite** for structured data and the **local filesystem** for blob storage. Perfect for:

- Local development
- Desktop applications
- Offline-first apps

### Supabase (Cloud)

Uses **PostgreSQL** for structured data and **Supabase Storage** for blobs. Ideal for:

- Cloud-hosted applications
- Multi-user collaboration
- Apps requiring authentication and sync

```typescript
import { createLocalAdapter } from "@vibex/space";
import { createSupabaseAdapter } from "@vibex/supabase";

// Local development
const localAdapter = createLocalAdapter({ path: "./data" });

// Production with Supabase
const cloudAdapter = createSupabaseAdapter({
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY,
});
```

## 🛠️ Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run in development mode (with watch)
pnpm dev

# Run tests
pnpm test

# Lint the codebase
pnpm lint

# Format code
pnpm format
```

## 📖 Documentation

- **[Getting Started Guide](./docs/content/docs/getting-started.mdx)** — Your first steps with VibeX
- **[Architecture Overview](./docs/content/docs/design/architecture.mdx)** — Deep dive into the system design
- **[Package Structure](./docs/content/docs/design/package-structure.mdx)** — Detailed package responsibilities
- **[API Reference](./docs/content/sdk)** — Complete SDK documentation
- **[Tutorials](./docs/content/docs/tutorials)** — Step-by-step guides

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](./CONTRIBUTING.md) for details on:

- Setting up the development environment
- Code style and guidelines
- Submitting pull requests
- Reporting bugs and requesting features

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

VibeX is built with amazing open source technologies:

- [Vercel AI SDK](https://sdk.vercel.ai/) — AI/LLM integration
- [Zod](https://zod.dev/) — TypeScript-first schema validation
- [Turbo](https://turbo.build/) — High-performance build system
- [pnpm](https://pnpm.io/) — Fast, disk space efficient package manager

---

<p align="center">
  Made with ❤️ by the <a href="https://github.com/tiwater">Tiwater</a> team
</p>

<p align="center">
  <a href="https://github.com/tiwater/vibex">⭐ Star us on GitHub</a>
</p>
