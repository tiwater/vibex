/**
 * Centralized VibeX path resolution utility
 *
 * Handles the difference between local development and Railway deployment:
 * - Local: ~/.vibex (os.homedir() + '.vibex')
 * - Railway: /vibex (VIBEX_STORAGE_PATH environment variable)
 */

import path from "path";
import os from "os";

/**
 * Get the root VibeX directory path
 * Respects VIBEX_STORAGE_PATH environment variable for Railway deployment
 */
export function getVibexRoot(): string {
  return process.env.VIBEX_STORAGE_PATH || path.join(os.homedir(), ".vibex");
}

/**
 * Get a path within the VibeX directory structure
 * @param subPath - Relative path within .vibex directory (e.g., 'config/agents', 'bin/OfficeMcp')
 */
export function getVibexPath(...subPaths: string[]): string {
  return path.join(getVibexRoot(), ...subPaths);
}

/**
 * Get common VibeX directory paths
 */
export const VibexPaths = {
  root: () => getVibexRoot(),
  config: () => getVibexPath("config"),
  spaces: () => getVibexPath("spaces"),
  defaults: () => getVibexPath("defaults"),

  // MCP server organization
  mcpServers: () => getVibexPath("mcp-servers"),
  mcpServerShared: () => getVibexPath("mcp-servers", "shared"),

  // Specific paths
  agents: () => getVibexPath("agents"),
  datasets: () => getVibexPath("config", "datasets"),
  tools: () => getVibexPath("config", "tools"),

  // MCP server paths - now using npm package
  officeMcpServer: () => "office-mcp", // npm package name
  officeMcpExecutable: () => "office-mcp", // npm package command

  // Default templates and configuration
  defaultsAgents: () => getVibexPath("defaults", "agents"),
  defaultsSpaces: () => getVibexPath("defaults", "spaces"),

  // Space-specific paths
  space: (spaceId: string) => getVibexPath("spaces", spaceId),
  spaceArtifacts: (spaceId: string) =>
    getVibexPath("spaces", spaceId, "artifacts"),

  // Note: MCP servers are now distributed as npm packages, not local binaries
} as const;
