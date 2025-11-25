/**
 * Tool System for Vibex
 *
 * Coordinates between custom tools and MCP tools.
 * Knows nothing about specific tool implementations.
 */

import { z } from "zod";

// Core tool interface that AI SDK expects
export interface CoreTool {
  description: string;
  inputSchema: z.ZodSchema | any;
  execute: (args: any, context?: any) => Promise<any>;
}

// Cache for MCP clients
const mcpClients = new Map<string, any>();

/**
 * Build a tool map for streamText from an array of tool IDs
 * Delegates to appropriate providers without knowing their internals
 */
export async function buildToolMap(
  toolIds: string[],
  context?: { spaceId?: string }
): Promise<Record<string, CoreTool>> {
  const tools: Record<string, CoreTool> = {};

  // Load MCP server configurations to determine tool types
  const { getServerDataAdapter } = await import("@vibex/data");
  const adapter = getServerDataAdapter();
  const mcpServers = await adapter.getTools();
  const mcpServerIds = new Set(mcpServers.map((s: any) => s.id));

  // Separate custom tools and MCP tools
  const customToolIds: string[] = [];
  const mcpToolIds: string[] = [];

  for (const id of toolIds) {
    // Check if it's an MCP server ID
    if (mcpServerIds.has(id)) {
      mcpToolIds.push(id);
    } else {
      customToolIds.push(id);
    }
  }

  // Load custom tools if needed
  if (customToolIds.length > 0) {
    try {
      // @ts-ignore - @vibex/tools may not be built yet
      const toolsModule = await import("@vibex/tools");
      const buildCustomToolMap = (toolsModule as any).buildToolMap;
      if (buildCustomToolMap) {
        const customTools = buildCustomToolMap(customToolIds, context);
        Object.assign(tools, customTools);
      }
    } catch (error) {
      console.warn(
        `[Tools] Failed to load custom tools from @vibex/tools:`,
        error
      );
    }
  }

  // Load MCP tools if needed
  if (mcpToolIds.length > 0) {
    const mcpTools = await loadMcpTools(mcpToolIds);
    Object.assign(tools, mcpTools);
  }

  return tools;
}

/**
 * Load MCP tools by ID
 * This is the only part that knows about MCP specifics
 */
async function loadMcpTools(ids: string[]): Promise<Record<string, CoreTool>> {
  const tools: Record<string, CoreTool> = {};

  // Group by server for efficient loading
  const serverGroups = new Map<string, string[]>();
  for (const id of ids) {
    // Handle both mcp:serverId format and direct serverId format
    let serverId = id;
    if (id.startsWith("mcp:")) {
      const parts = id.split(":");
      serverId = parts[1] || id;
    }

    if (!serverGroups.has(serverId)) {
      serverGroups.set(serverId, []);
    }
    serverGroups.get(serverId)!.push(id);
  }

  // Load each server's tools
  for (const [serverId, _toolIds] of serverGroups) {
    try {
      let mcpClient = mcpClients.get(serverId);

      if (!mcpClient) {
        // MCP support is not yet implemented - skip for now
        console.warn(
          `[Tools] MCP support not yet implemented for server: ${serverId}`
        );
        continue;

        // TODO: Re-enable when MCP support is implemented
        /*
        const adapter = getServerDataAdapter();
        const serverTools = await adapter.getTools();
        const server = serverTools.find((t: any) => t.id === serverId);

        if (!server) {
          console.warn(`[Tools] MCP server not found: ${serverId}`);
          continue;
        }

        const { createAISdkMcpClient } = await import("../../lib/mcp");
        mcpClient = await createAISdkMcpClient({
          id: server.id,
          transport:
            (server as any).transport || server.config?.transport || "stdio",
          url:
            (server as any).url ||
            (server as any).endpoint ||
            server.config?.url ||
            server.config?.endpoint,
          command: (server as any).command || server.config?.command,
          args: (server as any).args || server.config?.args,
          description: server.description,
          config: server.config, // Pass configuration (access tokens, etc.)
        });

        if (mcpClient) {
          mcpClients.set(serverId, mcpClient);
        }
        */
      }

      // Extract requested tools (commented out until MCP is implemented)
      /*
      if (mcpClient && typeof mcpClient === "object") {
        // Get all tools from the MCP client
        const mcpTools = await mcpClient.tools();

        // Return all tools from this server
        for (const [toolName, tool] of Object.entries(mcpTools)) {
          if (isValidTool(tool)) {
            tools[toolName] = tool as CoreTool;
          }
        }
      }
      */
    } catch (error) {
      console.error(`[Tools] Failed to load MCP server ${serverId}:`, error);
    }
  }

  return tools;
}

// isValidTool function removed - not used until MCP support is implemented

/**
 * Clear MCP cache (useful for testing)
 */
export function clearToolCache(): void {
  mcpClients.clear();
}
