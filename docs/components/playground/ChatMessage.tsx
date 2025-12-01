"use client";

import React, { useState, useMemo, memo, useRef } from "react";
import {
  Bot,
  User,
  Wrench,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  FileText,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Terminal,
  Code,
  Search,
  Globe,
  ArrowRight,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Markdown } from "@/components/Markdown";
import type { XChatMessage, XChatPart } from "@vibex/react";

interface ChatMessageProps {
  message: XChatMessage;
}

// Use a simple format to avoid hydration mismatch (locale-dependent formatting differs server/client)
function formatTime(date: Date | undefined): string {
  if (!date) return "";
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

// Predefined color palette for consistent agent colors
const COLOR_PALETTE = [
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
function getAgentColor(agentName: string) {
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

// Timeline item - represents one agent's contribution (message + tool calls)
interface TimelineItem {
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
function parseMessageToTimeline(message: XChatMessage): TimelineItem[] {
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

  // Separate tool calls, tool results, and artifacts from text
  const toolCallParts: typeof allParts = [];
  const toolResultParts: typeof allParts = [];
  const artifactParts: typeof allParts = [];
  const textParts: typeof allParts = [];

  for (const part of allParts) {
    if (part.type === "tool-call") {
      toolCallParts.push(part);
    } else if (part.type === "tool-result") {
      toolResultParts.push(part);
    } else if (part.type === "artifact") {
      artifactParts.push(part);
    } else {
      textParts.push(part);
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

// Copy button
function CopyButton({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`h-6 w-6 p-0 ${className}`}
      onClick={handleCopy}
    >
      {copied ? (
        <Check className="w-3 h-3 text-emerald-500" />
      ) : (
        <Copy className="w-3 h-3" />
      )}
    </Button>
  );
}

// Get tool icon
function getToolIcon(toolName: string) {
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

// Tool Call Component - shown as a separate message from the agent (memoized)
const ToolCallMessage = memo(function ToolCallMessage({
  item,
}: {
  item: TimelineItem;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const Icon = getToolIcon(item.toolName || "");
  const colors = getAgentColor(item.agentName);

  const statusConfig = {
    running: {
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "border-blue-200 dark:border-blue-800",
      icon: Loader2,
      spin: true,
      text: "text-blue-600 dark:text-blue-400",
    },
    completed: {
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      border: "border-emerald-200 dark:border-emerald-800",
      icon: CheckCircle,
      spin: false,
      text: "text-emerald-600 dark:text-emerald-400",
    },
    failed: {
      bg: "bg-red-50 dark:bg-red-950/30",
      border: "border-red-200 dark:border-red-800",
      icon: XCircle,
      spin: false,
      text: "text-red-600 dark:text-red-400",
    },
    pending: {
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-200 dark:border-amber-800",
      icon: Clock,
      spin: false,
      text: "text-amber-600 dark:text-amber-400",
    },
  };

  const status = statusConfig[item.toolStatus || "running"];
  const StatusIcon = status.icon;

  return (
    <div className="flex gap-2 my-2">
      {/* Agent Avatar */}
      <Avatar className={`w-7 h-7 shrink-0 ${colors.bg}`}>
        <AvatarFallback className="text-[10px] font-medium text-white">
          {item.agentName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Tool Call Bubble */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-xs font-medium ${colors.text}`}>
            {item.agentName}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatTime(item.timestamp)}
          </span>
        </div>
        <div
          className={`inline-block rounded-2xl rounded-tl-md border ${status.border} ${status.bg} overflow-hidden max-w-full`}
        >
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-black/5 dark:hover:bg-white/5"
          >
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span className="font-mono text-xs font-medium">
                {item.toolName}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <StatusIcon
                className={`w-3.5 h-3.5 ${status.spin ? "animate-spin" : ""} ${status.text}`}
              />
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </div>
          </button>

          {isExpanded && (
            <div className="overflow-hidden border-t border-inherit">
              <div className="p-2 space-y-2 text-xs">
                {item.toolArgs && Object.keys(item.toolArgs).length > 0 && (
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase mb-1">
                      Input
                    </div>
                    <pre className="p-2 rounded bg-white dark:bg-slate-900 overflow-x-auto">
                      {JSON.stringify(item.toolArgs, null, 2)}
                    </pre>
                  </div>
                )}
                {item.toolResult && (
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase mb-1">
                      Output
                    </div>
                    <pre className="p-2 rounded bg-white dark:bg-slate-900 overflow-x-auto max-h-96 overflow-y-auto">
                      {item.toolResult}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// Tool Result Component - shown as a separate message (memoized)
const ToolResultMessage = memo(function ToolResultMessage({
  item,
}: {
  item: TimelineItem;
}) {
  const colors = getAgentColor(item.agentName);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="flex gap-2 my-2">
      <Avatar className={`w-7 h-7 shrink-0 ${colors.bg}`}>
        <AvatarFallback className="text-[10px] font-medium text-white">
          {item.agentName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-xs font-medium ${colors.text}`}>
            {item.agentName}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatTime(item.timestamp)}
          </span>
        </div>
        <div className="inline-block bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl rounded-tl-md px-3 py-2 max-w-full">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full text-left flex items-center justify-between"
          >
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
              ✓ {item.toolName} completed
            </span>
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-slate-400" />
            ) : (
              <ChevronRight className="w-3 h-3 text-slate-400" />
            )}
          </button>
          {isExpanded && item.toolResult && (
            <div className="mt-2 pt-2 border-t border-emerald-200 dark:border-emerald-800">
              <pre className="text-xs p-2 rounded bg-white dark:bg-slate-900 overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap">
                {item.toolResult}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// Artifact Message Component (memoized)
const ArtifactMessage = memo(function ArtifactMessage({
  item,
  spaceId = "playground",
}: {
  item: TimelineItem;
  spaceId?: string;
}) {
  const colors = getAgentColor(item.agentName);
  const artifactId = item.artifactId || "";
  const artifactTitle = item.artifactTitle || artifactId;
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [artifactContent, setArtifactContent] = React.useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleViewArtifact = async () => {
    setIsDialogOpen(true);
    setIsLoading(true);
    setError(null);
    setArtifactContent(null);

    try {
      const response = await fetch(
        `/api/spaces/${spaceId}/artifacts/${artifactId}`
      );
      if (response.ok) {
        const blob = await response.blob();
        const text = await blob.text();
        setArtifactContent(text);
      } else {
        const errorText = await response.text();
        setError(
          `Failed to load artifact: ${errorText || response.statusText}`
        );
      }
    } catch (err) {
      console.error("Failed to fetch artifact:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex gap-2 my-2">
        <Avatar className={`w-7 h-7 shrink-0 ${colors.bg}`}>
          <AvatarFallback className="text-[10px] font-medium text-white">
            {item.agentName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-xs font-medium ${colors.text}`}>
              {item.agentName}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {formatTime(item.timestamp)}
            </span>
          </div>
          <div className="inline-block bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl rounded-tl-md px-3 py-2 max-w-full">
            <button
              onClick={handleViewArtifact}
              className="w-full text-left flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-blue-700 dark:text-blue-300">
                  📄 {artifactTitle}
                </div>
                <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">
                  Click to view artifact
                </div>
              </div>
              <ArrowRight className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
            </button>
          </div>
        </div>
      </div>

      {/* Artifact Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{artifactTitle}</DialogTitle>
            <DialogDescription>Artifact ID: {artifactId}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto min-h-0">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Loading artifact...
                </span>
              </div>
            )}
            {error && (
              <div className="py-4 text-sm text-destructive">{error}</div>
            )}
            {artifactContent !== null && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap text-xs bg-slate-50 dark:bg-slate-900 p-4 rounded border overflow-auto">
                  {artifactContent}
                </pre>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});

// Agent Message Bubble - group chat style (memoized)
const AgentMessageBubble = memo(function AgentMessageBubble({
  item,
}: {
  item: TimelineItem;
}) {
  const agentName = item.agentName || "Agent";
  const colors = getAgentColor(agentName);

  return (
    <div className="flex gap-2 my-2">
      {/* Agent Avatar */}
      <Avatar className={`w-7 h-7 shrink-0 ${colors.bg}`}>
        <AvatarFallback className="text-[10px] font-medium text-white">
          {agentName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Message */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-xs font-medium ${colors.text}`}>
            {agentName}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatTime(item.timestamp)}
          </span>
        </div>
        <div className="inline-block bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-md px-3 py-2 max-w-full">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <Markdown>{item.content || ""}</Markdown>
          </div>
        </div>
      </div>
    </div>
  );
});

// User Message Component (memoized)
const UserMessage = memo(function UserMessage({
  message,
}: {
  message: XChatMessage;
}) {
  const content =
    message.content ||
    message.parts
      ?.filter((p): p is XChatPart & { type: "text" } => p.type === "text")
      .map((p) => p.text)
      .join("") ||
    "";

  return (
    <div className="flex gap-3 flex-row-reverse">
      <Avatar className="w-8 h-8 shrink-0 bg-slate-200 dark:bg-slate-700">
        <AvatarFallback>
          <User className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 max-w-[90%] flex flex-col items-end">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-muted-foreground">
            {formatTime(message.createdAt)}
          </span>
          <span className="text-sm font-medium">You</span>
        </div>
        <div className="w-fit max-w-full bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5">
          <p className="text-sm text-left">{content}</p>
        </div>
      </div>
    </div>
  );
});

// Assistant Message Component - TRUE GROUP CHAT TIMELINE
// Memoized to prevent re-renders during streaming
const AssistantMessage = memo(function AssistantMessage({
  message,
}: {
  message: XChatMessage;
}) {
  // Extract spaceId from message metadata for artifact access
  const spaceId = (message.metadata?.spaceId as string) || "playground";

  // Track if this is the first render to apply animations only once
  const isFirstRender = useRef(true);

  const timelineItems = useMemo(() => {
    return parseMessageToTimeline(message);
  }, [message.parts, message.content]); // Only recompute when parts or content changes

  // If no timeline items, show loading state (no animation to prevent jumping)
  if (timelineItems.length === 0) {
    return (
      <div className="flex gap-2 my-2">
        <Avatar className="w-7 h-7 shrink-0 bg-violet-500">
          <AvatarFallback>
            <Bot className="w-4 h-4 text-white" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Thinking...</span>
        </div>
      </div>
    );
  }

  // Render each timeline item as a separate chat bubble
  // Use stable keys based on content hash to prevent re-renders
  return (
    <div className="space-y-0">
      {timelineItems.map((item, idx) => {
        // Create a stable key based on item content
        const stableKey = `${item.type}-${item.agentName}-${idx}-${item.toolCallId || item.artifactId || ""}`;

        if (item.type === "tool-call") {
          return <ToolCallMessage key={stableKey} item={item} />;
        } else if (item.type === "tool-result") {
          return <ToolResultMessage key={stableKey} item={item} />;
        } else if (item.type === "artifact") {
          return (
            <ArtifactMessage key={stableKey} item={item} spaceId={spaceId} />
          );
        } else {
          return <AgentMessageBubble key={stableKey} item={item} />;
        }
      })}
    </div>
  );
});

// Main Export (memoized to prevent unnecessary re-renders)
export const ChatMessage = memo(function ChatMessage({
  message,
}: ChatMessageProps) {
  if (message.role === "user") {
    return <UserMessage message={message} />;
  }
  return <AssistantMessage message={message} />;
});
