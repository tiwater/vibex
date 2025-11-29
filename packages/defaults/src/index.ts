/**
 * @vibex/defaults - Default configurations and templates
 *
 * This package provides default configurations for agents, tools, spaces, and prompts.
 * The actual YAML/MD files are in the src/ directory and should be accessed via
 * the file system or bundled as assets.
 */

import * as path from "path";
import * as fs from "fs";
import * as yaml from "yaml";
import { fileURLToPath } from "url";

// Handle both CommonJS and ESM
const getDirname = () => {
  if (typeof __dirname !== "undefined") {
    return __dirname;
  }
  // ESM mode - use import.meta.url
  if (typeof import.meta !== "undefined" && import.meta.url) {
    return path.dirname(fileURLToPath(import.meta.url));
  }
  // Fallback
  throw new Error("Cannot determine __dirname in this environment");
};

/**
 * Get the path to the defaults directory
 */
export function getDefaultsPath(): string {
  return path.join(getDirname(), "..");
}

/**
 * Get the path to a specific defaults subdirectory
 */
export function getDefaultsSubPath(subPath: string): string {
  return path.join(getDefaultsPath(), subPath);
}

/**
 * List all agent templates
 */
export function listAgentTemplates(): string[] {
  const agentsDir = getDefaultsSubPath("agents");
  try {
    return fs.readdirSync(agentsDir).filter((f) => f.endsWith(".yaml"));
  } catch {
    return [];
  }
}

/**
 * List all space templates
 */
export function listSpaceTemplates(): string[] {
  const spacesDir = getDefaultsSubPath("spaces");
  try {
    return fs.readdirSync(spacesDir).filter((f) => {
      const stat = fs.statSync(path.join(spacesDir, f));
      return stat.isDirectory();
    });
  } catch {
    return [];
  }
}

/**
 * List all tool configurations
 */
export function listToolConfigs(): string[] {
  const toolsDir = getDefaultsSubPath("tools");
  try {
    return fs.readdirSync(toolsDir).filter((f) => f.endsWith(".yaml"));
  } catch {
    return [];
  }
}

/**
 * Default paths for common resources
 */
export const DefaultPaths = {
  agents: () => getDefaultsSubPath("agents"),
  spaces: () => getDefaultsSubPath("spaces"),
  tools: () => getDefaultsSubPath("tools"),
  prompts: () => getDefaultsSubPath("prompts"),
  config: () => getDefaultsSubPath("config"),
  datasources: () => getDefaultsSubPath("datasources"),
} as const;

// ============================================================================
// Agent YAML Configuration Types
// ============================================================================

export interface AgentYamlConfig {
  id?: string;
  name?: string;
  description?: string;
  llm?: {
    provider?: string;
    model?: string;
    settings?: {
      temperature?: number;
      maxTokens?: number;
      maxOutputTokens?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
    };
  };
  promptFile?: string;
  systemPrompt?: string;
  tools?: string[];
  personality?: Record<string, unknown>;
  examples?: unknown[];
  category?: string;
  tags?: string[];
  author?: string;
  version?: string;
  icon?: string;
  usageExamples?: string[];
  requirements?: string[];
  protected?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoadedAgentConfig {
  id: string;
  name: string;
  description: string;
  provider: string;
  model: string;
  systemPrompt?: string;
  tools: string[];
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

// ============================================================================
// Agent Loading Functions
// ============================================================================

/**
 * Get the source directory path (handles both dev and production builds)
 */
function getSourcePath(): string {
  // In development: __dirname = packages/defaults/src
  // In production: __dirname = packages/defaults/dist
  // We need to go up and check for src/ or use the current structure
  const defaultsPath = getDefaultsPath();
  const srcPath = path.join(defaultsPath, "src");

  // Check if we're in a built package (dist exists) or source (src exists)
  if (fs.existsSync(srcPath)) {
    return srcPath;
  }
  // If src doesn't exist, we might be in a different structure
  // Try to find src relative to the package root
  const possibleSrc = path.join(defaultsPath, "..", "src");
  if (fs.existsSync(possibleSrc)) {
    return possibleSrc;
  }
  // Fallback: assume we're in the package root and src is here
  return defaultsPath;
}

/**
 * Load an agent YAML configuration file
 */
export function loadAgentYaml(agentId: string): AgentYamlConfig | null {
  try {
    const sourcePath = getSourcePath();
    const agentsDir = path.join(sourcePath, "agents");
    const yamlPath = path.join(agentsDir, `${agentId}.yaml`);

    if (!fs.existsSync(yamlPath)) {
      return null;
    }

    const content = fs.readFileSync(yamlPath, "utf-8");
    const config = yaml.parse(content) as AgentYamlConfig;
    return config;
  } catch (error) {
    console.warn(`[defaults] Failed to load agent ${agentId}:`, error);
    return null;
  }
}

/**
 * Load a prompt file
 */
export function loadPromptFile(promptFileName: string): string | null {
  try {
    const sourcePath = getSourcePath();
    const promptsDir = path.join(sourcePath, "prompts");
    const promptPath = path.join(promptsDir, promptFileName);

    if (!fs.existsSync(promptPath)) {
      return null;
    }

    return fs.readFileSync(promptPath, "utf-8");
  } catch (error) {
    console.warn(`[defaults] Failed to load prompt ${promptFileName}:`, error);
    return null;
  }
}

/**
 * Load a complete agent configuration (YAML + prompt if specified)
 */
export function loadAgentConfig(agentId: string): LoadedAgentConfig | null {
  const yamlConfig = loadAgentYaml(agentId);
  if (!yamlConfig) {
    return null;
  }

  // Load prompt file if specified
  let systemPrompt = yamlConfig.systemPrompt;
  if (yamlConfig.promptFile && !systemPrompt) {
    systemPrompt = loadPromptFile(yamlConfig.promptFile) || undefined;
  }

  // Extract LLM configuration
  const llm = yamlConfig.llm || {};
  const provider = llm.provider || "openai";
  const model = llm.model || "gpt-4o";
  const settings = llm.settings || {};

  // Build the loaded config
  const config: LoadedAgentConfig = {
    id: yamlConfig.id || agentId,
    name: yamlConfig.name || agentId,
    description: yamlConfig.description || `${agentId} agent`,
    provider,
    model,
    systemPrompt,
    tools: yamlConfig.tools || [],
    temperature: settings.temperature,
    maxOutputTokens: settings.maxTokens || settings.maxOutputTokens,
    topP: settings.topP,
    frequencyPenalty: settings.frequencyPenalty,
    presencePenalty: settings.presencePenalty,
  };

  return config;
}

/**
 * Load multiple default agents by their IDs
 */
export function loadDefaultAgents(agentIds: string[]): LoadedAgentConfig[] {
  const configs: LoadedAgentConfig[] = [];

  for (const agentId of agentIds) {
    const config = loadAgentConfig(agentId);
    if (config) {
      configs.push(config);
    }
  }

  return configs;
}

/**
 * Get the default agent IDs that should be initialized
 */
export function getDefaultAgentIds(): string[] {
  // These are the core default agents that should be initialized
  return ["researcher", "developer", "content-writer"];
}
