/**
 * Base classes and decorators for custom tools
 * Provides decorator-based tool extraction for multi-tool providers
 */

import { z } from "zod/v3";
import "reflect-metadata";
import type { CoreTool } from "@vibex/core";

/**
 * Storage interface for space-aware tools
 * This is injected by the runtime (vibex) when tools are initialized
 */
export interface ToolStorage {
  readFile(path: string): Promise<Buffer>;
  writeFile(path: string, data: Buffer | string): Promise<void>;
  exists(path: string): Promise<boolean>;
  list(path: string): Promise<string[]>;
  delete(path: string): Promise<void>;
  stat?(path: string): Promise<{
    size: number;
    mtime: Date;
    isFile: boolean;
    isDirectory: boolean;
  }>;
}

/**
 * Storage provider function type
 * Called with spaceId to get storage for that space
 */
export type StorageProvider = (spaceId: string) => Promise<ToolStorage>;

// Global storage provider - set by vibex runtime
let globalStorageProvider: StorageProvider | null = null;

/**
 * Set the global storage provider
 * Called by vibex runtime during initialization
 */
export function setStorageProvider(provider: StorageProvider): void {
  globalStorageProvider = provider;
}

/**
 * Get the global storage provider
 */
export function getStorageProvider(): StorageProvider | null {
  return globalStorageProvider;
}

const TOOLS_METADATA_KEY = Symbol("tools");

/**
 * Option definition for select fields
 * Contains semantic information about options (NOT UI concerns like icons)
 */
export interface OptionDefinition {
  value: string; // The actual value stored
  label: string; // Human-readable label
  description?: string; // Semantic description of what this option does
}

/**
 * Base configuration item - shared properties for all field types
 */
interface BaseConfigItem {
  name: string; // Human-readable field name
  description?: string; // What this field does/controls
  required?: boolean; // Whether this field is required
  defaultValue?: any; // Default value for the field
}

/**
 * String field configuration
 * Supports environment variable integration
 */
export interface StringConfigItem extends BaseConfigItem {
  type: "string";
  envVar?: string; // Environment variable name if applicable
}

/**
 * Number field configuration
 * Supports min/max validation
 */
export interface NumberConfigItem extends BaseConfigItem {
  type: "number";
  min?: number; // Minimum value
  max?: number; // Maximum value
}

/**
 * Boolean field configuration
 */
export interface BooleanConfigItem extends BaseConfigItem {
  type: "boolean";
}

/**
 * Select field configuration
 * Supports simple string options or rich option definitions
 */
export interface SelectConfigItem extends BaseConfigItem {
  type: "select";
  options: string[] | OptionDefinition[]; // Available choices
}

/**
 * Array field configuration
 */
export interface ArrayConfigItem extends BaseConfigItem {
  type: "array";
  itemType?: "string" | "number"; // Type of array items
}

/**
 * Configuration item - discriminated union of all field types
 * Each type has its own specific properties, ensuring type safety
 */
export type ConfigItem =
  | StringConfigItem
  | NumberConfigItem
  | BooleanConfigItem
  | SelectConfigItem
  | ArrayConfigItem;

/**
 * Tool configuration schema using ConfigItem
 */
export interface ConfigSchema {
  [key: string]: ConfigItem;
}

/**
 * Tool function decorator - marks a method as a tool with schema and description
 */
export function ToolFunction<T extends z.ZodSchema>(config: {
  name?: string; // Optional, defaults to method name
  description: string;
  input: T; // Input schema
}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    // Store tool metadata
    const tools = Reflect.getMetadata(TOOLS_METADATA_KEY, target) || [];
    tools.push({
      methodName: propertyKey,
      toolName: config.name || propertyKey,
      description: config.description,
      inputSchema: config.input,
    });
    Reflect.defineMetadata(TOOLS_METADATA_KEY, tools, target);

    // Wrap the original method to validate input
    const originalMethod = descriptor.value;
    descriptor.value = async function (input: z.infer<T>) {
      // Validate input
      const validated = config.input.parse(input);
      // Call original method
      return originalMethod.call(this, validated);
    };

    return descriptor;
  };
}

// Shorter alias
export { ToolFunction as Function };

/**
 * Configuration schema for tools
 */
export interface ToolConfig {
  [key: string]: any;
}

/**
 * Tool metadata
 */
export interface ToolMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  requiresApiKey?: boolean;
  apiKeyName?: string;
}

/**
 * Base class for tools - a single class can provide multiple related tool methods
 *
 * Provides standardized space-aware file operations that automatically handle
 * VibeX space storage structure (.vibex/{spaceId}/artifacts/).
 *
 * Example usage in a custom tool:
 * ```typescript
 * class MyTool extends Tool {
 *   @ToolFunction({
 *     description: 'Process a file in the space',
 *     input: z.object({ fileName: z.string() })
 *   })
 *   async processFile(input: { fileName: string }) {
 *     // Check if file exists in space artifacts
 *     if (await this.artifactFileExists(input.fileName)) {
 *       // Read file content
 *       const content = await this.readArtifactFile(input.fileName);
 *
 *       // Process content...
 *       const processed = content.toUpperCase();
 *
 *       // Write back to artifacts
 *       await this.writeArtifactFile('processed_' + input.fileName, processed);
 *
 *       return { success: true };
 *     }
 *     throw new Error('File not found in space artifacts');
 *   }
 * }
 * ```
 */
export abstract class Tool {
  protected spaceId?: string;

  /**
   * Get tool metadata
   */
  abstract getMetadata(): ToolMetadata;

  /**
   * Get configuration schema for this tool
   * Returns null if no configuration needed
   */
  getConfigSchema(): ConfigSchema | null {
    return null;
  }

  /**
   * Validate configuration
   */
  validateConfig(config: any): boolean {
    const schema = this.getConfigSchema();
    if (!schema) return true;

    // Basic validation based on ConfigSchema
    for (const [key, item] of Object.entries(schema)) {
      const value = config[key];

      // Check required fields
      if (
        item.required &&
        (value === undefined || value === null || value === "")
      ) {
        return false;
      }

      // Type validation
      if (value !== undefined && value !== null) {
        switch (item.type) {
          case "number": {
            if (typeof value !== "number") return false;
            // TypeScript knows item is NumberConfigItem here
            if (item.min !== undefined && value < item.min) return false;
            if (item.max !== undefined && value > item.max) return false;
            break;
          }
          case "boolean":
            if (typeof value !== "boolean") return false;
            break;
          case "select": {
            // TypeScript knows item is SelectConfigItem here
            // Handle both string[] and OptionDefinition[]
            const validValues = item.options.map((opt) =>
              typeof opt === "string" ? opt : opt.value
            );
            if (!validValues.includes(value)) return false;
            break;
          }
          case "array":
            if (!Array.isArray(value)) return false;
            break;
        }
      }
    }

    return true;
  }

  /**
   * Get current configuration
   */
  getConfig(): ToolConfig | null {
    return null;
  }

  /**
   * Set configuration
   */
  setConfig(config: ToolConfig): void {
    // Override in subclasses if needed
    // The config parameter is intentionally unused in the base class
    void config;
  }

  /**
   * Set space context for this tool instance
   * Called by the tool system when spaceId is available
   */
  setSpaceId(spaceId?: string): void {
    this.spaceId = spaceId;
  }

  /**
   * Get the current space ID
   */
  getSpaceId(): string | undefined {
    return this.spaceId;
  }

  /**
   * Get storage instance for space operations
   * Uses the storage provider injected by the runtime
   */
  private async getStorage(): Promise<ToolStorage> {
    if (!this.spaceId) {
      throw new Error("Space ID not set. This tool requires space context.");
    }

    const provider = getStorageProvider();
    if (!provider) {
      throw new Error(
        "Storage provider not configured. The vibex runtime must call setStorageProvider() before using space-aware tools."
      );
    }

    return provider(this.spaceId);
  }

  /**
   * Read file from space artifacts directory
   */
  protected async readArtifactFile(
    filePath: string,
    encoding: BufferEncoding = "utf8"
  ): Promise<string> {
    if (!this.spaceId) {
      throw new Error("Space ID not set. This tool requires space context.");
    }

    const storage = await this.getStorage();

    // Normalize path - remove "artifacts/" prefix if present since storage methods handle it
    const normalizedPath = filePath.startsWith("artifacts/")
      ? filePath.substring(10)
      : filePath;
    const artifactPath = `artifacts/${normalizedPath}`;

    const buffer = await storage.readFile(artifactPath);
    return buffer.toString(encoding);
  }

  /**
   * Write file to space artifacts directory
   */
  protected async writeArtifactFile(
    filePath: string,
    content: string,
    encoding: BufferEncoding = "utf8"
  ): Promise<void> {
    if (!this.spaceId) {
      throw new Error("Space ID not set. This tool requires space context.");
    }

    const storage = await this.getStorage();

    // Normalize path - remove "artifacts/" prefix if present
    const normalizedPath = filePath.startsWith("artifacts/")
      ? filePath.substring(10)
      : filePath;
    const artifactPath = `artifacts/${normalizedPath}`;

    const buffer = Buffer.from(content, encoding);
    await storage.writeFile(artifactPath, buffer);
  }

  /**
   * Check if file exists in space artifacts directory
   */
  protected async artifactFileExists(filename: string): Promise<boolean> {
    if (!this.spaceId) {
      throw new Error("Space ID not set. This tool requires space context.");
    }
    try {
      const storage = await this.getStorage();

      // Check if the artifact file exists
      const artifactPath = `artifacts/${filename}`;
      return await storage.exists(artifactPath);
    } catch {
      return false;
    }
  }

  /**
   * Get file stats from space artifacts directory
   * Returns file metadata through the storage abstraction
   */
  protected async getArtifactFileStats(filePath: string): Promise<{
    size: number;
    mtime: Date;
    isFile: boolean;
    isDirectory: boolean;
  }> {
    if (!this.spaceId) {
      throw new Error("Space ID not set. This tool requires space context.");
    }

    const storage = await this.getStorage();

    // Normalize path
    const normalizedPath = filePath.startsWith("artifacts/")
      ? filePath.substring(10)
      : filePath;
    const artifactPath = `artifacts/${normalizedPath}`;

    // Try to get stats from storage
    if (storage.stat) {
      return await storage.stat(artifactPath);
    }

    // Fallback: read the file to get size, use current time for mtime
    try {
      const content = await storage.readFile(artifactPath);
      return {
        size: content.length,
        mtime: new Date(),
        isFile: true,
        isDirectory: false,
      };
    } catch {
      throw new Error(`File not found: ${filePath}`);
    }
  }

  /**
   * List files in space artifacts directory
   */
  protected async listArtifactFiles(
    dirPath: string = "",
    recursive: boolean = false
  ): Promise<string[]> {
    if (!this.spaceId) {
      throw new Error("Space ID not set. This tool requires space context.");
    }

    const storage = await this.getStorage();

    // Normalize directory path
    const normalizedPath = dirPath.startsWith("artifacts/")
      ? dirPath.substring(10)
      : dirPath;
    const searchPath = normalizedPath
      ? `artifacts/${normalizedPath}`
      : "artifacts";

    // Get list of files from storage
    const allFiles = await storage.list(searchPath);

    if (!recursive) {
      // Filter to only direct children (no subdirectories)
      return allFiles.filter((file: string) => !file.includes("/"));
    }

    return allFiles;
  }

  /**
   * Delete file from space artifacts directory
   */
  protected async deleteArtifactFile(filePath: string): Promise<void> {
    if (!this.spaceId) {
      throw new Error("Space ID not set. This tool requires space context.");
    }

    const storage = await this.getStorage();

    // Normalize path
    const normalizedPath = filePath.startsWith("artifacts/")
      ? filePath.substring(10)
      : filePath;
    const artifactPath = `artifacts/${normalizedPath}`;

    await storage.delete(artifactPath);
  }

  /**
   * Copy file within space artifacts directory
   */
  protected async copyArtifactFile(
    sourcePath: string,
    destPath: string
  ): Promise<void> {
    if (!this.spaceId) {
      throw new Error("Space ID not set. This tool requires space context.");
    }

    const storage = await this.getStorage();

    // Normalize paths
    const normalizedSource = sourcePath.startsWith("artifacts/")
      ? sourcePath.substring(10)
      : sourcePath;
    const normalizedDest = destPath.startsWith("artifacts/")
      ? destPath.substring(10)
      : destPath;

    const sourceArtifactPath = `artifacts/${normalizedSource}`;
    const destArtifactPath = `artifacts/${normalizedDest}`;

    // Read source file and write to destination
    const content = await storage.readFile(sourceArtifactPath);
    await storage.writeFile(destArtifactPath, content);
  }

  /**
   * Move file within space artifacts directory
   */
  protected async moveArtifactFile(
    sourcePath: string,
    destPath: string
  ): Promise<void> {
    if (!this.spaceId) {
      throw new Error("Space ID not set. This tool requires space context.");
    }

    const storage = await this.getStorage();

    // Normalize paths
    const normalizedSource = sourcePath.startsWith("artifacts/")
      ? sourcePath.substring(10)
      : sourcePath;
    const normalizedDest = destPath.startsWith("artifacts/")
      ? destPath.substring(10)
      : destPath;

    const sourceArtifactPath = `artifacts/${normalizedSource}`;
    const destArtifactPath = `artifacts/${normalizedDest}`;

    // Read, write, then delete source
    const content = await storage.readFile(sourceArtifactPath);
    await storage.writeFile(destArtifactPath, content);
    await storage.delete(sourceArtifactPath);
  }

  /**
   * Check if tool is available/properly configured
   */
  isAvailable(): boolean {
    return true;
  }

  /**
   * Automatically extract all decorated methods as tools
   */
  getTools(): Record<string, CoreTool> {
    const tools: Record<string, CoreTool> = {};

    // Get all decorated tool methods
    const toolMetadata = Reflect.getMetadata(TOOLS_METADATA_KEY, this) || [];

    for (const {
      methodName,
      toolName,
      description,
      inputSchema,
    } of toolMetadata) {
      // Create CoreTool entry - tool names should already be in snake_case
      tools[toolName] = {
        description,
        inputSchema: inputSchema || z.any(),
        execute: (this as any)[methodName].bind(this),
      };
    }

    return tools;
  }

  /**
   * Get list of tool names provided by this class
   */
  getToolNames(): string[] {
    const toolMetadata = Reflect.getMetadata(TOOLS_METADATA_KEY, this) || [];
    return toolMetadata.map((t: any) => t.toolName);
  }

  /**
   * Get detailed information about all tool functions
   * Returns the same structure as getTools() but without execute functions
   */
  getToolDetails(): Array<{
    name: string;
    description: string;
    inputSchema?: unknown;
    parameters?: unknown;
  }> {
    const tools = this.getTools();
    return Object.entries(tools).map(([name, tool]) => ({
      name,
      description: tool.description,
      inputSchema:
        (tool.inputSchema as { _def?: unknown })?._def ||
        tool.inputSchema ||
        {},
    }));
  }
}
