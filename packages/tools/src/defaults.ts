/**
 * Default Tool Loader
 *
 * Loads tool configurations from @vibex/defaults package.
 * Uses the defaults package's API instead of direct filesystem access.
 */

import { listToolConfigs } from "@vibex/defaults";
import type { McpServerConfig } from "./mcp";

/**
 * Tool configuration from YAML
 */
export interface ToolYamlConfig {
  id: string;
  name: string;
  description?: string;
  type: "builtin" | "mcp";
  category?: string;
  icon?: string;
  transport?: "stdio" | "http" | "sse" | "websocket";
  command?: string;
  args?: string[];
  url?: string;
  enabled?: boolean;
  configSchema?: Array<{
    field: string;
    label: string;
    type: string;
    required?: boolean;
    envVar?: string;
  }>;
  tags?: string[];
  features?: string[];
}

/**
 * Runtime tool config from tools.yaml
 */
interface RuntimeToolConfig {
  id: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

// Cache for loaded tool definitions
const toolDefinitionCache = new Map<string, ToolYamlConfig | null>();
let mcpToolsCache: ToolYamlConfig[] | null = null;
let runtimeConfigsCache: RuntimeToolConfig[] | null = null;

/**
 * Load tool definition by ID
 * Uses @vibex/defaults package to access tool YAML files
 */
export function loadToolDefinition(toolId: string): ToolYamlConfig | null {
  // Check cache first
  if (toolDefinitionCache.has(toolId)) {
    return toolDefinitionCache.get(toolId) || null;
  }

  try {
    // Use @vibex/defaults to load the tool definition
    const { loadToolYaml } = require("@vibex/defaults");
    const config = loadToolYaml(toolId);
    toolDefinitionCache.set(toolId, config);
    return config;
  } catch (error) {
    console.warn(`[defaults] Failed to load tool definition: ${toolId}`, error);
    toolDefinitionCache.set(toolId, null);
    return null;
  }
}

/**
 * Load all MCP tool definitions from defaults
 */
export function loadMcpToolDefinitions(): ToolYamlConfig[] {
  // Return cached if available
  if (mcpToolsCache !== null) {
    return mcpToolsCache;
  }

  const tools: ToolYamlConfig[] = [];

  try {
    // Get list of tool config files from @vibex/defaults
    const toolFiles = listToolConfigs();

    for (const file of toolFiles) {
      const toolId = file.replace(".yaml", "");
      const config = loadToolDefinition(toolId);

      if (config && config.type === "mcp") {
        tools.push(config);
      }
    }
  } catch (error) {
    console.warn("[defaults] Failed to load MCP tool definitions:", error);
  }

  mcpToolsCache = tools;
  return tools;
}

/**
 * Load runtime tool configurations (enabled state, user config)
 */
export function loadRuntimeToolConfigs(): RuntimeToolConfig[] {
  // Return cached if available
  if (runtimeConfigsCache !== null) {
    return runtimeConfigsCache;
  }

  try {
    // Use @vibex/defaults to load runtime config
    const { loadRuntimeConfig } = require("@vibex/defaults");
    const config = loadRuntimeConfig("tools") as {
      tools?: RuntimeToolConfig[];
    } | null;
    runtimeConfigsCache = config?.tools || [];
    return runtimeConfigsCache;
  } catch (error) {
    console.warn("[defaults] Failed to load runtime tool configs:", error);
    runtimeConfigsCache = [];
    return [];
  }
}

/**
 * Get enabled MCP server configurations
 * Merges tool definitions with runtime configs
 */
export function getEnabledMcpServers(): McpServerConfig[] {
  const definitions = loadMcpToolDefinitions();
  const runtimeConfigs = loadRuntimeToolConfigs();

  // Create a map of runtime configs by ID
  const runtimeMap = new Map<string, RuntimeToolConfig>();
  for (const config of runtimeConfigs) {
    runtimeMap.set(config.id, config);
  }

  const enabledServers: McpServerConfig[] = [];

  for (const def of definitions) {
    const runtime = runtimeMap.get(def.id);

    // Check if enabled (runtime config overrides definition)
    const isEnabled = runtime?.enabled ?? def.enabled ?? true;

    if (isEnabled) {
      enabledServers.push({
        id: def.id,
        name: def.name,
        description: def.description,
        type: "mcp",
        transport: def.transport || "stdio",
        command: def.command,
        args: def.args,
        url: def.url,
        enabled: true,
        configSchema: def.configSchema,
        config: runtime?.config,
      });
    }
  }

  return enabledServers;
}

/**
 * Get all available tool IDs from defaults
 */
export function getDefaultToolIds(): string[] {
  try {
    const toolFiles = listToolConfigs();
    return toolFiles.map((f) => f.replace(".yaml", ""));
  } catch {
    return [];
  }
}

/**
 * Check if a tool ID is an MCP server
 */
export function isMcpTool(toolId: string): boolean {
  const def = loadToolDefinition(toolId);
  return def?.type === "mcp";
}

/**
 * Clear all caches (useful for testing or hot reload)
 */
export function clearDefaultsCache(): void {
  toolDefinitionCache.clear();
  mcpToolsCache = null;
  runtimeConfigsCache = null;
}
