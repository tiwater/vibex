var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/utils/paths.ts
import path from "path";
import os from "os";
function getVibexRoot() {
  return process.env.VIBEX_STORAGE_PATH || path.join(os.homedir(), ".vibex");
}
function getVibexPath(...subPaths) {
  return path.join(getVibexRoot(), ...subPaths);
}
var VibexPaths = {
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
  officeMcpServer: () => "office-mcp",
  // npm package name
  officeMcpExecutable: () => "office-mcp",
  // npm package command
  // Default templates and configuration
  defaultsAgents: () => getVibexPath("defaults", "agents"),
  defaultsSpaces: () => getVibexPath("defaults", "spaces"),
  // Space-specific paths
  space: (spaceId) => getVibexPath("spaces", spaceId),
  spaceArtifacts: (spaceId) => getVibexPath("spaces", spaceId, "artifacts")
  // Note: MCP servers are now distributed as npm packages, not local binaries
};

export {
  __publicField,
  getVibexRoot,
  getVibexPath,
  VibexPaths
};
