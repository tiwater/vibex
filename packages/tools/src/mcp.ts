/**
 * MCP (Model Context Protocol) Client Manager
 *
 * Handles MCP server connections and tool discovery.
 * Supports both stdio and HTTP/SSE transports.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
// Note: SSEClientTransport is used for HTTP-based MCP servers
// import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { z } from "zod/v3";
import type { CoreTool } from "@vibex/core";

/**
 * MCP Server Configuration (from YAML definition)
 */
export interface McpServerConfig {
  id: string;
  name: string;
  description?: string;
  type: "mcp";
  transport: "stdio" | "http" | "sse" | "websocket";
  command?: string; // For stdio transport
  args?: string[]; // For stdio transport
  url?: string; // For http/sse/websocket transport
  enabled?: boolean;
  configSchema?: Array<{
    field: string;
    label: string;
    type: string;
    required?: boolean;
    envVar?: string;
  }>;
  // Runtime config (API keys, etc.)
  config?: Record<string, unknown>;
}

/**
 * Connected MCP Client with metadata
 */
interface ConnectedClient {
  client: Client;
  config: McpServerConfig;
  tools: Record<string, CoreTool>;
  connected: boolean;
}

// Cache for MCP clients
const mcpClients = new Map<string, ConnectedClient>();

/**
 * Create and connect an MCP client for a server configuration
 */
export async function connectMcpServer(
  serverConfig: McpServerConfig
): Promise<ConnectedClient | null> {
  // Check cache first
  const cached = mcpClients.get(serverConfig.id);
  if (cached?.connected) {
    return cached;
  }

  try {
    const client = new Client(
      {
        name: "vibex-tools",
        version: "0.1.0",
      },
      {
        capabilities: {},
      }
    );

    // Create transport based on type
    if (serverConfig.transport === "stdio") {
      if (!serverConfig.command) {
        console.warn(
          `[MCP] Server ${serverConfig.id} has stdio transport but no command`
        );
        return null;
      }

      // Build environment with config values mapped to env vars
      const env: Record<string, string> = { ...process.env } as Record<
        string,
        string
      >;
      if (serverConfig.config && serverConfig.configSchema) {
        for (const schema of serverConfig.configSchema) {
          if (schema.envVar) {
            const value = serverConfig.config[schema.field];
            if (value !== undefined && value !== null) {
              env[schema.envVar] = String(value);
            }
          }
        }
      }

      const transport = new StdioClientTransport({
        command: serverConfig.command,
        args: serverConfig.args || [],
        env,
      });

      await client.connect(transport);
    } else if (
      serverConfig.transport === "http" ||
      serverConfig.transport === "sse"
    ) {
      if (!serverConfig.url) {
        console.warn(
          `[MCP] Server ${serverConfig.id} has ${serverConfig.transport} transport but no url`
        );
        return null;
      }

      // For HTTP/SSE transport, we need to use SSEClientTransport
      // This is currently commented out as it requires additional setup
      console.warn(
        `[MCP] HTTP/SSE transport not fully implemented yet for ${serverConfig.id}`
      );
      return null;

      // TODO: Implement SSE transport
      // const transport = new SSEClientTransport(new URL(serverConfig.url));
      // await client.connect(transport);
    } else {
      console.warn(
        `[MCP] Unsupported transport type: ${serverConfig.transport}`
      );
      return null;
    }

    // Discover tools from the server
    const tools = await discoverMcpTools(client, serverConfig);

    const connectedClient: ConnectedClient = {
      client,
      config: serverConfig,
      tools,
      connected: true,
    };

    mcpClients.set(serverConfig.id, connectedClient);
    console.log(
      `[MCP] Connected to ${serverConfig.name} with ${Object.keys(tools).length} tools`
    );

    return connectedClient;
  } catch (error) {
    console.error(`[MCP] Failed to connect to ${serverConfig.id}:`, error);
    return null;
  }
}

/**
 * Discover and convert MCP tools to CoreTool format
 */
async function discoverMcpTools(
  client: Client,
  serverConfig: McpServerConfig
): Promise<Record<string, CoreTool>> {
  const tools: Record<string, CoreTool> = {};

  try {
    const result = await client.listTools();

    for (const mcpTool of result.tools) {
      // Convert MCP tool to CoreTool
      const toolName = `${serverConfig.id}_${mcpTool.name}`;

      // Convert JSON Schema to Zod schema (simplified)
      const inputSchema = jsonSchemaToZod(mcpTool.inputSchema);

      tools[toolName] = {
        description:
          mcpTool.description || `${mcpTool.name} from ${serverConfig.name}`,
        inputSchema,
        execute: createMcpToolExecutor(client, mcpTool.name),
      };
    }
  } catch (error) {
    console.error(
      `[MCP] Failed to discover tools from ${serverConfig.id}:`,
      error
    );
  }

  return tools;
}

/**
 * Create an executor function for an MCP tool
 */
function createMcpToolExecutor(
  client: Client,
  toolName: string
): (args: unknown) => Promise<unknown> {
  return async (args: unknown) => {
    try {
      const result = await client.callTool({
        name: toolName,
        arguments: args as Record<string, unknown>,
      });

      // Extract content from MCP response
      if (result.content && Array.isArray(result.content)) {
        // Return text content if available
        const textContent = result.content.find(
          (c: { type: string }) => c.type === "text"
        );
        if (textContent && "text" in textContent) {
          return textContent.text;
        }
        return result.content;
      }

      return result;
    } catch (error) {
      console.error(`[MCP] Tool ${toolName} execution failed:`, error);
      throw error;
    }
  };
}

/**
 * Convert JSON Schema to Zod schema (simplified version)
 * Handles common cases; complex schemas may need enhancement
 */
function jsonSchemaToZod(schema: unknown): z.ZodSchema {
  if (!schema || typeof schema !== "object") {
    return z.any();
  }

  const s = schema as Record<string, unknown>;
  const type = s.type as string | undefined;

  switch (type) {
    case "string":
      return z.string();
    case "number":
    case "integer":
      return z.number();
    case "boolean":
      return z.boolean();
    case "array":
      if (s.items) {
        return z.array(jsonSchemaToZod(s.items));
      }
      return z.array(z.any());
    case "object": {
      const properties = s.properties as Record<string, unknown> | undefined;
      const required = (s.required as string[]) || [];

      if (!properties) {
        return z.record(z.any());
      }

      const shape: Record<string, z.ZodSchema> = {};
      for (const [key, propSchema] of Object.entries(properties)) {
        const propZod = jsonSchemaToZod(propSchema);
        shape[key] = required.includes(key) ? propZod : propZod.optional();
      }

      return z.object(shape);
    }
    default:
      return z.any();
  }
}

/**
 * Disconnect an MCP server
 */
export async function disconnectMcpServer(serverId: string): Promise<void> {
  const cached = mcpClients.get(serverId);
  if (cached) {
    try {
      await cached.client.close();
    } catch (error) {
      console.warn(`[MCP] Error closing connection to ${serverId}:`, error);
    }
    mcpClients.delete(serverId);
  }
}

/**
 * Get tools from a connected MCP server
 */
export function getMcpServerTools(serverId: string): Record<string, CoreTool> {
  const cached = mcpClients.get(serverId);
  return cached?.tools || {};
}

/**
 * Get all tools from all connected MCP servers
 */
export function getAllMcpTools(): Record<string, CoreTool> {
  const allTools: Record<string, CoreTool> = {};
  for (const [, client] of mcpClients) {
    if (client.connected) {
      Object.assign(allTools, client.tools);
    }
  }
  return allTools;
}

/**
 * Check if an MCP server is connected
 */
export function isMcpServerConnected(serverId: string): boolean {
  return mcpClients.get(serverId)?.connected || false;
}

/**
 * Clear all MCP client connections
 */
export async function clearMcpClients(): Promise<void> {
  for (const [serverId] of mcpClients) {
    await disconnectMcpServer(serverId);
  }
  mcpClients.clear();
}

/**
 * Get list of connected MCP server IDs
 */
export function getConnectedMcpServers(): string[] {
  return Array.from(mcpClients.entries())
    .filter(([, client]) => client.connected)
    .map(([id]) => id);
}
