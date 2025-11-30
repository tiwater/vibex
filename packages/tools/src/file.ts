/**
 * FileTool - File operations through storage abstraction
 *
 * All file operations go through the ToolStorage interface,
 * which is injected by the runtime. This allows the same tool
 * to work with different backends (local fs, Supabase, etc.)
 */

import { z } from "zod/v3";
import {
  Tool,
  ToolFunction,
  ToolMetadata,
  ToolConfig,
  ConfigSchema,
} from "./base";

export class FileTool extends Tool {
  private config: ToolConfig = {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedExtensions: null, // null means all extensions allowed
    excludedPaths: [".git", "node_modules", ".env"],
  };

  getMetadata(): ToolMetadata {
    return {
      id: "file",
      name: "File System Tools",
      description:
        "Read, write, manage and manipulate files and directories in the space's artifact storage",
      category: "file",
    };
  }

  getConfigSchema(): ConfigSchema {
    return {
      maxFileSize: {
        name: "Max File Size",
        type: "number",
        description: "Maximum file size in bytes",
        defaultValue: 10485760, // 10MB
        required: false,
      },
      allowedExtensions: {
        name: "Allowed Extensions",
        type: "array",
        description:
          "List of allowed file extensions (leave empty to allow all)",
        defaultValue: null,
        required: false,
      },
      excludedPaths: {
        name: "Excluded Paths",
        type: "array",
        description: "Directories and paths to exclude from operations",
        defaultValue: [".git", "node_modules", ".env"],
        required: false,
      },
    };
  }

  getConfig(): ToolConfig {
    return this.config;
  }

  setConfig(config: ToolConfig): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Ensure space context is available
   */
  private ensureSpaceContext(): void {
    if (!this.spaceId) {
      throw new Error(
        "FileTool requires space context. Set spaceId before using file operations."
      );
    }
  }

  @ToolFunction({
    description:
      "Create a new file or overwrite an existing file with the specified content. Creates parent directories if they don't exist.",
    input: z.object({
      path: z
        .string()
        .describe(
          "The file path to create or overwrite (relative to space artifacts)"
        ),
      content: z.string().describe("The content to write to the file"),
      encoding: z
        .enum(["utf8", "base64"])
        .optional()
        .default("utf8")
        .describe(
          "The encoding format for the file content (utf8 for text, base64 for binary)"
        ),
    }),
  })
  async create_file(input: {
    path: string;
    content: string;
    encoding?: "utf8" | "base64";
  }) {
    this.ensureSpaceContext();

    await this.writeArtifactFile(
      input.path,
      input.content,
      input.encoding || "utf8"
    );

    return {
      success: true,
      path: input.path,
      size: Buffer.byteLength(input.content, input.encoding || "utf8"),
    };
  }

  @ToolFunction({
    description:
      "Read the contents of a file from the space's artifact storage. Returns the file content along with metadata.",
    input: z.object({
      path: z
        .string()
        .describe("The file path to read (relative to space artifacts)"),
      encoding: z
        .enum(["utf8", "base64"])
        .optional()
        .default("utf8")
        .describe(
          "The encoding to use when reading the file (utf8 for text files, base64 for binary files)"
        ),
    }),
  })
  async read_file(input: { path: string; encoding?: "utf8" | "base64" }) {
    this.ensureSpaceContext();

    const content = await this.readArtifactFile(
      input.path,
      input.encoding || "utf8"
    );
    const stats = await this.getArtifactFileStats(input.path);

    return {
      content,
      path: input.path,
      size: stats.size,
      modified: stats.mtime.toISOString(),
    };
  }

  @ToolFunction({
    description:
      "Delete a file from the space's artifact storage. This operation is irreversible.",
    input: z.object({
      path: z
        .string()
        .describe("The file path to delete (relative to space artifacts)"),
    }),
  })
  async delete_file(input: { path: string }) {
    this.ensureSpaceContext();

    await this.deleteArtifactFile(input.path);

    return {
      success: true,
      path: input.path,
    };
  }

  @ToolFunction({
    description:
      "List all files in a directory with optional recursive traversal and pattern filtering.",
    input: z.object({
      directory: z
        .string()
        .optional()
        .default("")
        .describe(
          "The directory path to list files from (relative to space artifacts, empty for root)"
        ),
      recursive: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether to recursively list files in subdirectories"),
      pattern: z
        .string()
        .optional()
        .describe("Optional pattern to filter files (simple string matching)"),
    }),
  })
  async list_files(input: {
    directory?: string;
    recursive?: boolean;
    pattern?: string;
  }) {
    this.ensureSpaceContext();

    let files = await this.listArtifactFiles(
      input.directory || "",
      input.recursive || false
    );

    // Apply pattern filter if provided
    if (input.pattern) {
      files = files.filter((file) => file.includes(input.pattern!));
    }

    return {
      directory: input.directory || "/",
      files,
      count: files.length,
    };
  }

  @ToolFunction({
    description:
      "Move or rename a file from one location to another within the space's artifact storage.",
    input: z.object({
      source: z
        .string()
        .describe("The source file path (relative to space artifacts)"),
      destination: z
        .string()
        .describe("The destination file path (relative to space artifacts)"),
    }),
  })
  async move_file(input: { source: string; destination: string }) {
    this.ensureSpaceContext();

    await this.moveArtifactFile(input.source, input.destination);

    return {
      success: true,
      source: input.source,
      destination: input.destination,
    };
  }

  @ToolFunction({
    description:
      "Copy a file from one location to another within the space's artifact storage.",
    input: z.object({
      source: z
        .string()
        .describe("The source file path (relative to space artifacts)"),
      destination: z
        .string()
        .describe("The destination file path (relative to space artifacts)"),
    }),
  })
  async copy_file(input: { source: string; destination: string }) {
    this.ensureSpaceContext();

    await this.copyArtifactFile(input.source, input.destination);

    return {
      success: true,
      source: input.source,
      destination: input.destination,
    };
  }

  @ToolFunction({
    description:
      "Check if a file exists in the space's artifact storage. Returns existence status and metadata if it exists.",
    input: z.object({
      path: z
        .string()
        .describe("The file path to check (relative to space artifacts)"),
    }),
  })
  async file_exists(input: { path: string }) {
    this.ensureSpaceContext();

    const exists = await this.artifactFileExists(input.path);

    if (exists) {
      const stats = await this.getArtifactFileStats(input.path);
      return {
        exists: true,
        path: input.path,
        isFile: stats.isFile,
        isDirectory: stats.isDirectory,
        size: stats.size,
      };
    }

    return {
      exists: false,
      path: input.path,
    };
  }
}
