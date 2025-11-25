# Vibex

Vibex is a complete data management and multi-agent collaboration engine.

## Structure

- `packages/core`: Core logic, types, and utilities.
- `packages/react`: React hooks and components.
- `packages/tools`: Standard toolset.
- `packages/data`: Data management and storage.
- `docs`: Documentation.
- `examples`: Example applications (including demo).

## Storage Providers

Vibex supports two built-in storage methods:

1. **Local**: Uses SQLite for structured data (tables) and the local file system for blob storage. Ideal for local development and desktop apps.
2. **Supabase**: Uses Supabase (PostgreSQL) for structured data and Supabase Storage for blobs. Perfect for cloud-hosted applications with authentication and sync requirements.

## Getting Started

```bash
pnpm install
pnpm build
```
