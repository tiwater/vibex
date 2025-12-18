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

// Split multi-agent workflow content into separate sections
interface ContentSection {
  content: string;
  agentName?: string;
}

function splitMultiAgentContent(text: string): ContentSection[] {
  const sections: ContentSection[] = [];

  // Define markers that indicate section boundaries
  // These are the visual markers emitted by the multi-agent workflow
  const markers = [
    { pattern: /🎯\s*\*\*Plan Created\*\*/g, type: "plan" },
    {
      pattern: /🔄\s*\*\*Delegating to ([^*:]+)\*\*:?\s*/g,
      type: "delegation",
    },
    { pattern: /✅\s*\*\*([^*]+)\s*completed\*\*:?\s*/g, type: "completed" },
    { pattern: /📊\s*\*\*Final Summary\*\*/g, type: "summary" },
  ];

  // Find all marker positions
  const markerPositions: {
    index: number;
    length: number;
    type: string;
    agentName?: string;
  }[] = [];

  for (const marker of markers) {
    let match;
    marker.pattern.lastIndex = 0; // Reset regex state
    while ((match = marker.pattern.exec(text)) !== null) {
      const agentName = match[1]?.trim(); // Capture agent name if present
      markerPositions.push({
        index: match.index,
        length: match[0].length,
        type: marker.type,
        agentName,
      });
    }
  }

  // If no markers found, return text as-is
  if (markerPositions.length === 0) {
    return [{ content: text }];
  }

  // Sort by position
  markerPositions.sort((a, b) => a.index - b.index);

  // Split content by markers
  let lastEnd = 0;

  for (let i = 0; i < markerPositions.length; i++) {
    const marker = markerPositions[i];
    const nextMarker = markerPositions[i + 1];

    // Content before this marker (if any)
    if (marker.index > lastEnd) {
      const beforeContent = text.slice(lastEnd, marker.index).trim();
      if (beforeContent) {
        sections.push({ content: beforeContent });
      }
    }

    // Content of this section (from marker to next marker or end)
    const sectionStart = marker.index;
    const sectionEnd = nextMarker?.index ?? text.length;
    const sectionContent = text.slice(sectionStart, sectionEnd).trim();

    if (sectionContent) {
      // Determine agent name based on marker type
      let agentName: string | undefined;
      if (marker.type === "plan") {
        agentName = "X (Orchestrator)";
      } else if (marker.type === "delegation" && marker.agentName) {
        agentName = marker.agentName;
      } else if (marker.type === "completed" && marker.agentName) {
        agentName = marker.agentName;
      } else if (marker.type === "summary") {
        agentName = "X (Orchestrator)";
      }

      sections.push({ content: sectionContent, agentName });
    }

    lastEnd = sectionEnd;
  }

  // Any remaining content after last marker
  if (lastEnd < text.length) {
    const remaining = text.slice(lastEnd).trim();
    if (remaining) {
      sections.push({ content: remaining });
    }
  }

  return sections;
}

// Timeline item - represents one contribution in the conversation
export interface TimelineItem {
  type:
    | "user-message"
    | "agent-message"
    | "tool-call"
    | "tool-result"
    | "artifact"
    | "reasoning";
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

  // Handle user messages separately - they should never be shown as "Assistant"
  if (message.role === "user") {
    if (message.content) {
      items.push({
        type: "user-message",
        agentName: "You",
        agentId: "user",
        content: message.content,
        timestamp: message.createdAt,
      });
    }
    return items;
  }

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

  // Track current agent context (for assistant messages only)
  let currentAgent = message.agentName || "Assistant";
  let currentAgentId = currentAgent.toLowerCase();

  // Track tool calls to match with results
  const pendingToolCalls = new Map<
    string,
    { toolName: string; args: Record<string, unknown>; agentName: string }
  >();

  // Process parts sequentially to maintain context
  for (const part of message.parts) {
    if (part.type === "tool-call") {
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
    } else if (part.type === "reasoning") {
      const reasoningPart = part as { type: "reasoning"; text: string };
      if (reasoningPart.text) {
        items.push({
          type: "reasoning",
          agentName: currentAgent,
          agentId: currentAgentId,
          content: reasoningPart.text,
          timestamp: message.createdAt,
        });
      }
    } else if ((part as any).type === "agent-text") {
      // Handle agent-text parts directly
      items.push({
        type: "agent-message",
        agentName: (part as any).agentId,
        agentId: (part as any).agentId,
        content: (part as any).text,
        timestamp: message.createdAt,
      });
    } else if ((part as any).type === "data-agent") {
      // Handle data-agent parts - update current agent context
      const agentData = (part as any).data;
      if (agentData && agentData.agentId) {
        currentAgent = agentData.agentId;
        currentAgentId = agentData.agentId.toLowerCase();
      }
    } else if (part.type === "text") {
      const text = part.text.trim();
      if (!text) continue;

      // Split multi-agent workflow content into separate sections
      // Pattern: 🎯 **Plan Created**, 🔄 **Delegating to**, ✅ **X completed**, 📊 **Final Summary**
      const sections = splitMultiAgentContent(text);

      if (sections.length > 1) {
        // Multiple sections detected - render each as separate bubble
        for (const section of sections) {
          if (!section.content.trim()) continue;

          items.push({
            type: "agent-message",
            agentName: section.agentName || currentAgent,
            agentId: (section.agentName || currentAgent).toLowerCase(),
            content: section.content,
            timestamp: message.createdAt,
          });

          // Update current agent if this was a delegation
          if (section.agentName) {
            currentAgent = section.agentName;
            currentAgentId = section.agentName.toLowerCase();
          }
        }
        continue;
      }

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

      // Check for artifact IDs in text (pattern: artifact_* or explicit mentions)
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
            artifactTitle: artifactId,
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
        // Regular text content from current agent
        items.push({
          type: "agent-message",
          agentName: currentAgent,
          agentId: currentAgentId,
          content: text,
          timestamp: message.createdAt,
        });
      }
    }
  }

  return items;
}
