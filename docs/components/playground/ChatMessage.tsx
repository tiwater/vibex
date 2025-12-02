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

import {
  formatTime,
  getAgentColor,
  getToolIcon,
  parseMessageToTimeline,
  type TimelineItem,
} from "./utils";

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
        <Avatar className="w-7 h-7 shrink-0 bg-purple-500">
          <AvatarFallback>
            <Bot className="w-4 h-4" />
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
