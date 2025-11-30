/**
 * @vibex/defaults - Default configurations and templates
 *
 * This package provides default configurations for agents, tools, spaces, and prompts.
 * All YAML/MD files are imported at build time and bundled into the output.
 */

// ============================================================================
// Agent Imports (YAML files bundled at build time)
// ============================================================================

import assistantAgent from "./agents/assistant.yaml";
import codeReviewerAgent from "./agents/code-reviewer.yaml";
import contentWriterAgent from "./agents/content-writer.yaml";
import dbaAgent from "./agents/dba.yaml";
import developerAgent from "./agents/developer.yaml";
import officeAgent from "./agents/office.yaml";
import researcherAgent from "./agents/researcher.yaml";
import webResearcherAgent from "./agents/web-researcher.yaml";

// ============================================================================
// Tool Imports (YAML files bundled at build time)
// ============================================================================

import chromeDevtoolsTool from "./tools/chrome-devtools.yaml";
import dbgateTool from "./tools/dbgate.yaml";
import githubTool from "./tools/github.yaml";
import officeTool from "./tools/office.yaml";
import playwrightTool from "./tools/playwright.yaml";
import postgresTool from "./tools/postgres.yaml";
import supabaseTool from "./tools/supabase.yaml";

// ============================================================================
// Config Imports
// ============================================================================

import toolsConfig from "./config/tools.yaml";

// ============================================================================
// Prompt Imports (MD files bundled at build time)
// ============================================================================

import assistantPrompt from "./prompts/assistant.md";
import codeReviewerPrompt from "./prompts/code-reviewer.md";
import contentWriterPrompt from "./prompts/content-writer.md";
import dbaPrompt from "./prompts/dba.md";
import developerPrompt from "./prompts/developer.md";
import officePrompt from "./prompts/office.md";
import researcherPrompt from "./prompts/researcher.md";
import webResearcherPrompt from "./prompts/web-researcher.md";

// ============================================================================
// Agent Registry
// ============================================================================

const agentConfigs: Record<string, AgentYamlConfig> = {
  assistant: assistantAgent as AgentYamlConfig,
  "code-reviewer": codeReviewerAgent as AgentYamlConfig,
  "content-writer": contentWriterAgent as AgentYamlConfig,
  dba: dbaAgent as AgentYamlConfig,
  developer: developerAgent as AgentYamlConfig,
  office: officeAgent as AgentYamlConfig,
  researcher: researcherAgent as AgentYamlConfig,
  "web-researcher": webResearcherAgent as AgentYamlConfig,
};

const promptContents: Record<string, string> = {
  "assistant.md": assistantPrompt as string,
  "code-reviewer.md": codeReviewerPrompt as string,
  "content-writer.md": contentWriterPrompt as string,
  "dba.md": dbaPrompt as string,
  "developer.md": developerPrompt as string,
  "office.md": officePrompt as string,
  "researcher.md": researcherPrompt as string,
  "web-researcher.md": webResearcherPrompt as string,
};

// ============================================================================
// Tool Registry
// ============================================================================

const toolConfigs: Record<string, ToolYamlConfig> = {
  "chrome-devtools": chromeDevtoolsTool as unknown as ToolYamlConfig,
  dbgate: dbgateTool as unknown as ToolYamlConfig,
  github: githubTool as unknown as ToolYamlConfig,
  office: officeTool as unknown as ToolYamlConfig,
  playwright: playwrightTool as unknown as ToolYamlConfig,
  postgres: postgresTool as unknown as ToolYamlConfig,
  supabase: supabaseTool as unknown as ToolYamlConfig,
};

// ============================================================================
// Type Definitions
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

interface RuntimeToolConfig {
  id: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

// ============================================================================
// Agent Functions
// ============================================================================

/**
 * List all agent template IDs
 */
export function listAgentTemplates(): string[] {
  return Object.keys(agentConfigs);
}

/**
 * Load an agent YAML configuration by ID
 */
export function loadAgentYaml(agentId: string): AgentYamlConfig | null {
  return agentConfigs[agentId] || null;
}

/**
 * Load a prompt file by name
 */
export function loadPromptFile(promptFileName: string): string | null {
  return promptContents[promptFileName] || null;
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
  return ["researcher", "developer", "content-writer"];
}

// ============================================================================
// Tool Functions
// ============================================================================

/**
 * List all tool configuration file names
 */
export function listToolConfigs(): string[] {
  return Object.keys(toolConfigs).map((id) => `${id}.yaml`);
}

/**
 * Load a tool YAML configuration by ID
 */
export function loadToolYaml(toolId: string): ToolYamlConfig | null {
  return toolConfigs[toolId] || null;
}

/**
 * Load runtime tool configurations
 */
export function loadRuntimeConfig<T = unknown>(configName: string): T | null {
  if (configName === "tools") {
    return toolsConfig as T;
  }
  return null;
}

/**
 * Get all tool IDs
 */
export function getToolIds(): string[] {
  return Object.keys(toolConfigs);
}

/**
 * Get all MCP tool configurations
 */
export function getMcpTools(): ToolYamlConfig[] {
  return Object.values(toolConfigs).filter((t) => t.type === "mcp");
}

/**
 * Get enabled MCP servers based on runtime config
 */
export function getEnabledMcpServers(): ToolYamlConfig[] {
  const runtimeConfig = toolsConfig as { tools?: RuntimeToolConfig[] };
  const enabledIds = new Set(
    (runtimeConfig.tools || []).filter((t) => t.enabled).map((t) => t.id)
  );

  return getMcpTools().filter(
    (tool) =>
      tool.enabled !== false &&
      (enabledIds.size === 0 || enabledIds.has(tool.id))
  );
}

// ============================================================================
// Legacy Exports (for backward compatibility)
// ============================================================================

/**
 * @deprecated Use loadAgentYaml instead
 */
export function getDefaultsPath(): string {
  console.warn("getDefaultsPath is deprecated - YAML files are now bundled");
  return "";
}

/**
 * @deprecated Use loadAgentYaml instead
 */
export function getDefaultsSubPath(_subPath: string): string {
  console.warn("getDefaultsSubPath is deprecated - YAML files are now bundled");
  return "";
}

/**
 * @deprecated Use listAgentTemplates instead
 */
export function listSpaceTemplates(): string[] {
  console.warn("listSpaceTemplates is deprecated");
  return [];
}

/**
 * Default paths - deprecated, kept for backward compatibility
 */
export const DefaultPaths = {
  agents: () => "",
  spaces: () => "",
  tools: () => "",
  prompts: () => "",
  config: () => "",
  datasources: () => "",
} as const;
