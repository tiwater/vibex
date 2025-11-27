/**
 * @vibex/defaults - Default configurations and templates
 *
 * This package provides default configurations for agents, tools, spaces, and prompts.
 * The actual YAML/MD files are in the src/ directory and should be accessed via
 * the file system or bundled as assets.
 */

import * as path from "path";
import * as fs from "fs";

/**
 * Get the path to the defaults directory
 */
export function getDefaultsPath(): string {
  return path.join(__dirname, "..");
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



