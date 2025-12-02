import {
  Search,
  Globe,
  FileText,
  Code,
  Terminal,
  Wrench,
  LucideIcon,
} from "lucide-react";
import type { XChatMessage } from "@vibex/react";

// Predefined color palette for consistent agent colors
export const COLOR_PALETTE = [
  { bg: "bg-violet-500", border: "border-violet-500", text: "text-violet-600" },
  { bg: "bg-blue-500", border: "border-blue-500", text: "text-blue-600" },
  {
    bg: "bg-emerald-500",
    border: "border-emerald-500",
    text: "text-emerald-600",
  },
  { bg: "bg-amber-500", border: "border-amber-500", text: "text-amber-600" },
  { bg: "bg-cyan-500", border: "border-cyan-500", text: "text-cyan-600" },
  { bg: "bg-rose-500", border: "border-rose-500", text: "text-rose-600" },
  { bg: "bg-indigo-500", border: "border-indigo-500", text: "text-indigo-600" },
  { bg: "bg-teal-500", border: "border-teal-500", text: "text-teal-600" },
  { bg: "bg-orange-500", border: "border-orange-500", text: "text-orange-600" },
  { bg: "bg-pink-500", border: "border-pink-500", text: "text-pink-600" },
  { bg: "bg-purple-500", border: "border-purple-500", text: "text-purple-600" },
  { bg: "bg-slate-500", border: "border-slate-500", text: "text-slate-600" },
];

// Generate a deterministic color for an agent based on their name/id
export function getAgentColor(agentName: string) {
  // Simple hash function to convert agent name to a number
  let hash = 0;
  const name = agentName.toLowerCase().trim();
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Use absolute value and modulo to get index
  const index = Math.abs(hash) % COLOR_PALETTE.length;
  return COLOR_PALETTE[index];
}

// Use a simple format to avoid hydration mismatch (locale-dependent formatting differs server/client)
export function formatTime(date: Date | undefined): string {
  if (!date) return "";
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

// Get tool icon
export function getToolIcon(toolName: string): LucideIcon {
  const name = toolName.toLowerCase();
  if (name.includes("search")) return Search;
  if (name.includes("web") || name.includes("fetch") || name.includes("browse"))
    return Globe;
  if (name.includes("file") || name.includes("read") || name.includes("write"))
    return FileText;
  if (name.includes("code") || name.includes("execute")) return Code;
  if (name.includes("terminal") || name.includes("shell")) return Terminal;
  return Wrench;
}

// Timeline item - represents one agent's contribution (message + tool calls)
export interface TimelineItem {
  type: "agent-message" | "tool-call" | "tool-result" | "artifact";
  agentName: string;
  agentId?: string;
  content?: string;
  toolCallId?: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: string;
  toolStatus?: "running" | "completed" | "failed" | "pending";
  artifactId?: string;
  artifactTitle?: string;
  artifactVersion?: number;
  timestamp?: Date;
}

// Parse message parts into timeline items (group chat style)
export function parseMessageToTimeline(message: XChatMessage): TimelineItem[] {
  const items: TimelineItem[] = [];

  if (!message.parts || message.parts.length === 0) {
    // Fallback: if no parts, treat entire content as one message
    if (message.content) {
      items.push({
        type: "agent-message",
        agentName: message.agentName || "Assistant",
        agentId: message.agentName?.toLowerCase() || "assistant",
        content: message.content,
        timestamp: message.createdAt,
      });
    }
    return items;
  }

  // Track current agent context
  let currentAgent = message.agentName || "Assistant";
  let currentAgentId = currentAgent.toLowerCase();

  // Track tool calls to match with results
  const pendingToolCalls = new Map<
    string,
    { toolName: string; args: Record<string, unknown>; agentName: string }
  >();

  // Process parts in order - tool calls and artifacts should come before completion text
  // First, collect all parts
  const allParts = [...(message.parts || [])];

  // Separate tool calls, tool results, artifacts, and reasoning from text
  const toolCallParts: typeof allParts = [];
  const toolResultParts: typeof allParts = [];
  const artifactParts: typeof allParts = [];
  const reasoningParts: typeof allParts = [];
  const textParts: typeof allParts = [];

  for (const part of allParts) {
    if (part.type === "tool-call") {
      toolCallParts.push(part);
    } else if (part.type === "tool-result") {
      toolResultParts.push(part);
    } else if (part.type === "artifact") {
      artifactParts.push(part);
    } else if (part.type === "reasoning") {
      reasoningParts.push(part);
    } else {
      textParts.push(part);
    }
  }

  // Process reasoning parts first
  for (const part of reasoningParts) {
    const reasoningPart = part as { type: "reasoning"; text: string };
    if (reasoningPart.text) {
      items.push({
        type: "agent-message", // Reuse agent-message for now, but style it differently or add new type
        agentName: currentAgent,
        agentId: currentAgentId,
        content: `Thinking: ${reasoningPart.text}`, // Prefix to distinguish
        timestamp: message.createdAt,
        // Add a flag or specific type if we want custom rendering
      });
    }
  }

  // Process tool calls first (they should appear before completion messages)
  for (const part of toolCallParts) {
    const toolCall = part as {
      toolCallId?: string;
      toolName?: string;
      args?: Record<string, unknown>;
      status?: string;
    };

    if (toolCall.toolCallId && toolCall.toolName) {
      // Store for matching with result
      pendingToolCalls.set(toolCall.toolCallId, {
        toolName: toolCall.toolName,
        args: toolCall.args || {},
        agentName: currentAgent,
      });

      items.push({
        type: "tool-call",
        agentName: currentAgent,
        agentId: currentAgentId,
        toolCallId: toolCall.toolCallId,
        toolName: toolCall.toolName,
        toolArgs: toolCall.args || {},
        toolStatus: (toolCall.status as any) || "running",
        timestamp: message.createdAt,
      });
    }
  }

  // Process tool results
  for (const part of toolResultParts) {
    const toolResult = part as {
      toolCallId?: string;
      toolName?: string;
      result?: unknown;
    };

    if (toolResult.toolCallId) {
      const pending = pendingToolCalls.get(toolResult.toolCallId);
      if (pending) {
        items.push({
          type: "tool-result",
          agentName: pending.agentName,
          agentId: pending.agentName.toLowerCase(),
          toolCallId: toolResult.toolCallId,
          toolName: toolResult.toolName || pending.toolName,
          toolResult:
            typeof toolResult.result === "string"
              ? toolResult.result
              : JSON.stringify(toolResult.result, null, 2),
          toolStatus: "completed",
          timestamp: message.createdAt,
        });
        pendingToolCalls.delete(toolResult.toolCallId);
      }
    }
  }

  // Process artifacts
  for (const part of artifactParts) {
    const artifactPart = part as {
      artifactId?: string;
      title?: string;
      version?: number;
    };
    if (artifactPart.artifactId) {
      items.push({
        type: "artifact",
        agentName: currentAgent,
        agentId: currentAgentId,
        artifactId: artifactPart.artifactId,
        artifactTitle: artifactPart.title || artifactPart.artifactId,
        artifactVersion: artifactPart.version || 1,
        timestamp: message.createdAt,
      });
    }
  }

  // Now process text parts (completion messages, etc.)
  for (const part of textParts) {
    if (part.type === "text") {
      const text = part.text.trim();
      if (!text) continue;

      // Check if this is a delegation message (parsed from delegation events)
      const delegationMatch = text.match(
        /\*\*Delegated\*\* "([^"]+)" to \*\*([^*]+)\*\*/
      );
      if (delegationMatch) {
        // This is a delegation - the next agent will be the delegatee
        const taskTitle = delegationMatch[1];
        const agentName = delegationMatch[2].trim();
        items.push({
          type: "agent-message",
          agentName: currentAgent,
          agentId: currentAgentId,
          content: `Delegated "${taskTitle}" to ${agentName}`,
          timestamp: message.createdAt,
        });
        // Update current agent for subsequent messages
        currentAgent = agentName;
        currentAgentId = agentName.toLowerCase();
        continue;
      }

      // Check for completion messages (may include result)
      // BUT: Don't consume if we have tool-call or artifact parts - those should be shown separately
      // Only match if this is a simple completion without tool calls/artifacts
      const hasToolCallsOrArtifacts = message.parts?.some(
        (p) =>
          p.type === "tool-call" ||
          p.type === "tool-result" ||
          p.type === "artifact"
      );

      if (!hasToolCallsOrArtifacts) {
        const completedMatch = text.match(
          /\*\*([^*]+)\*\* completed "([^"]+)"([\s\S]*?)(?:\n\n|$)/
        );
        if (completedMatch) {
          const agentName = completedMatch[1].trim();
          const taskTitle = completedMatch[2];
          const result = completedMatch[3]?.trim();
          const content = result
            ? `Completed "${taskTitle}"\n\n${result}`
            : `Completed "${taskTitle}"`;
          items.push({
            type: "agent-message",
            agentName,
            agentId: agentName.toLowerCase(),
            content,
            timestamp: message.createdAt,
          });
          continue;
        }
      }

      // If we have tool calls/artifacts, just show the completion header without consuming the full text
      // The tool calls and artifacts will be shown as separate items
      const simpleCompletedMatch = text.match(
        /✅ \*\*([^*]+)\*\* completed "([^"]+)"/
      );
      if (simpleCompletedMatch && hasToolCallsOrArtifacts) {
        const agentName = simpleCompletedMatch[1].trim();
        const taskTitle = simpleCompletedMatch[2];
        items.push({
          type: "agent-message",
          agentName,
          agentId: agentName.toLowerCase(),
          content: `Completed "${taskTitle}"`,
          timestamp: message.createdAt,
        });
        // Don't continue - let tool calls and artifacts be processed as separate parts
        continue;
      }

      // Check for artifact IDs in text (pattern: artifact_* or explicit mentions)
      // Artifact IDs typically look like: artifact_<taskId>_<timestamp>
      const artifactIdPattern =
        /(?:artifact[_\s:]+|artifact\s+id[:\s]+)?(artifact_[a-zA-Z0-9_]+)/gi;
      const artifactMatches = [...text.matchAll(artifactIdPattern)];

      if (artifactMatches.length > 0) {
        // Split text by artifact IDs and create separate items
        let lastIndex = 0;
        for (const match of artifactMatches) {
          // Add text before artifact ID
          if (match.index !== undefined && match.index > lastIndex) {
            const beforeText = text.slice(lastIndex, match.index).trim();
            if (beforeText) {
              items.push({
                type: "agent-message",
                agentName: currentAgent,
                agentId: currentAgentId,
                content: beforeText,
                timestamp: message.createdAt,
              });
            }
          }

          // Add artifact item
          const artifactId = match[1];
          items.push({
            type: "artifact",
            agentName: currentAgent,
            agentId: currentAgentId,
            artifactId: artifactId,
            artifactTitle: artifactId, // Will be updated if we have metadata
            artifactVersion: 1,
            timestamp: message.createdAt,
          });

          lastIndex = (match.index || 0) + match[0].length;
        }

        // Add remaining text after last artifact
        if (lastIndex < text.length) {
          const afterText = text.slice(lastIndex).trim();
          if (afterText) {
            items.push({
              type: "agent-message",
              agentName: currentAgent,
              agentId: currentAgentId,
              content: afterText,
              timestamp: message.createdAt,
            });
          }
        }
      } else {
        // Regular text content from current agent (no artifacts detected)
        items.push({
          type: "agent-message",
          agentName: currentAgent,
          agentId: currentAgentId,
          content: text,
          timestamp: message.createdAt,
        });
      }
    } else if (part.type === "tool-call") {
      const toolCall = part as {
        toolCallId?: string;
        toolName?: string;
        args?: Record<string, unknown>;
        status?: string;
      };

      if (toolCall.toolCallId && toolCall.toolName) {
        // Store for matching with result
        pendingToolCalls.set(toolCall.toolCallId, {
          toolName: toolCall.toolName,
          args: toolCall.args || {},
          agentName: currentAgent,
        });

        items.push({
          type: "tool-call",
          agentName: currentAgent,
          agentId: currentAgentId,
          toolCallId: toolCall.toolCallId,
          toolName: toolCall.toolName,
          toolArgs: toolCall.args || {},
          toolStatus: (toolCall.status as any) || "running",
          timestamp: message.createdAt,
        });
      }
    } else if (part.type === "tool-result") {
      const toolResult = part as {
        toolCallId?: string;
        toolName?: string;
        result?: unknown;
      };

      if (toolResult.toolCallId) {
        const pending = pendingToolCalls.get(toolResult.toolCallId);
        if (pending) {
          items.push({
            type: "tool-result",
            agentName: pending.agentName,
            agentId: pending.agentName.toLowerCase(),
            toolCallId: toolResult.toolCallId,
            toolName: toolResult.toolName || pending.toolName,
            toolResult:
              typeof toolResult.result === "string"
                ? toolResult.result
                : JSON.stringify(toolResult.result, null, 2),
            toolStatus: "completed",
            timestamp: message.createdAt,
          });
          pendingToolCalls.delete(toolResult.toolCallId);
        }
      }
    } else if (part.type === "artifact") {
      const artifactPart = part as {
        artifactId?: string;
        title?: string;
        version?: number;
      };
      if (artifactPart.artifactId) {
        items.push({
          type: "artifact",
          agentName: currentAgent,
          agentId: currentAgentId,
          artifactId: artifactPart.artifactId,
          artifactTitle: artifactPart.title || artifactPart.artifactId,
          artifactVersion: artifactPart.version || 1,
          timestamp: message.createdAt,
        });
      }
    }
  }

  return items;
}
