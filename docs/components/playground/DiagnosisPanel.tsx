"use client";

import { useState, useMemo } from "react";
import {
  Activity,
  FileText,
  X,
  ChevronRight,
  XCircle,
  Loader2,
  Brain,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { XChatMessage } from "@vibex/react";
import {
  parseMessageToTimeline,
  getAgentColor,
  getToolIcon,
  formatTime,
  type TimelineItem,
} from "./utils";

import type { DiagnosticInfo, DiagnosticEvent } from "./usePlayground";

interface DiagnosisPanelProps {
  messages: XChatMessage[];
  status: string;
  isLoading: boolean;
  onClose?: () => void;
  className?: string;
  // Debug info
  chatMode?: "ask" | "plan" | "agent";
  agentId?: string;
  error?: string | null;
  // Diagnostics - actual backend data flow
  diagnostics?: DiagnosticInfo;
}

export function DiagnosisPanel({
  messages,
  status,
  isLoading,
  onClose,
  className,
  chatMode,
  agentId,
  error,
  diagnostics,
}: DiagnosisPanelProps) {
  const [activeTab, setActiveTab] = useState("timeline");

  // Parse all messages into a single timeline
  const timelineItems = useMemo(() => {
    return messages.flatMap((msg) => parseMessageToTimeline(msg));
  }, [messages]);

  // Extract artifacts
  const artifacts = useMemo(() => {
    return timelineItems.filter((item) => item.type === "artifact");
  }, [timelineItems]);

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-background border-l border-border",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-violet-500" />
          <h3 className="text-sm font-medium">Diagnosis</h3>
          <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1">
            {status}
            {isLoading && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col min-h-0"
      >
        <div className="px-3 pt-3">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="timeline" className="text-xs">
              Timeline
            </TabsTrigger>
            <TabsTrigger value="system" className="text-xs">
              System
              {error && (
                <span className="ml-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </TabsTrigger>
            <TabsTrigger value="artifacts" className="text-xs">
              Artifacts
              {artifacts.length > 0 && (
                <span className="ml-1.5 bg-muted-foreground/20 px-1.5 rounded-full text-[10px]">
                  {artifacts.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="llm" className="text-xs">
              LLM
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Timeline Tab - Shows actual backend data flow */}
        <TabsContent value="timeline" className="flex-1 min-h-0 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              {/* Summary header */}
              {diagnostics && (
                <div className="bg-muted/50 rounded-lg p-2 mb-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Model:</span>
                    <span className="font-mono">
                      {diagnostics.model || "unknown"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total chunks:</span>
                    <span>{diagnostics.totalChunks}</span>
                  </div>
                  {diagnostics.errors.length > 0 && (
                    <div className="text-red-500 mt-1">
                      {diagnostics.errors.length} error(s)
                    </div>
                  )}
                </div>
              )}

              {/* Event flow */}
              {!diagnostics || diagnostics.events.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Send a message to see backend data flow.
                </div>
              ) : (
                <div className="space-y-1 font-mono text-[11px]">
                  {summarizeEvents(diagnostics.events).map((event) => (
                    <DataFlowEvent key={event.id} event={event} />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* System Tab - Debug Info */}
        <TabsContent value="system" className="flex-1 min-h-0 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {/* Error Alert */}
              {error && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-medium text-sm mb-1">
                    <XCircle className="w-4 h-4" />
                    Error
                  </div>
                  <div className="text-xs text-red-600 dark:text-red-300">
                    {error}
                  </div>
                </div>
              )}

              {/* Mode & Agent Info */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Configuration
                </h4>
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  {/* Model info - extracted from last assistant message metadata */}
                  {(() => {
                    const lastAssistant = [...messages]
                      .reverse()
                      .find((m) => m.role === "assistant");
                    const model = lastAssistant?.metadata?.model as
                      | string
                      | undefined;
                    return model ? (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Model</span>
                        <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">
                          {model}
                        </span>
                      </div>
                    ) : null;
                  })()}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Chat Mode</span>
                    <Badge
                      variant={chatMode === "agent" ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      {chatMode || "ask"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Target Agent</span>
                    <span className="font-mono">{agentId || "auto"}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant="outline" className="text-[10px] gap-1">
                      {status}
                      {isLoading && (
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      )}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Message Stats */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Statistics
                </h4>
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Total Messages
                    </span>
                    <span>{messages.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">User Messages</span>
                    <span>
                      {messages.filter((m) => m.role === "user").length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Assistant Messages
                    </span>
                    <span>
                      {messages.filter((m) => m.role === "assistant").length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Tool Calls</span>
                    <span>
                      {
                        timelineItems.filter((i) => i.type === "tool-call")
                          .length
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Artifacts</span>
                    <span>{artifacts.length}</span>
                  </div>
                </div>
              </div>

              {/* Last Message Metadata */}
              {messages.length > 0 &&
                messages[messages.length - 1].metadata && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Last Message Metadata
                    </h4>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <pre className="text-[10px] font-mono overflow-auto">
                        {JSON.stringify(
                          messages[messages.length - 1].metadata,
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  </div>
                )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Artifacts Tab */}
        <TabsContent value="artifacts" className="flex-1 min-h-0 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              {artifacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No artifacts generated yet.
                </div>
              ) : (
                artifacts.map((item, index) => (
                  <ArtifactCard key={index} item={item} />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* LLM Observability Tab */}
        <TabsContent value="llm" className="flex-1 min-h-0 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                LLM Calls
              </h4>
              {(() => {
                const llmCalls =
                  diagnostics?.events.filter((e) => e.type === "llm-call") ||
                  [];
                if (llmCalls.length === 0) {
                  return (
                    <div className="text-xs text-muted-foreground p-4 text-center">
                      No LLM calls recorded yet. Send a message in agent mode to
                      see LLM calls.
                    </div>
                  );
                }

                // Group by call ID to pair started/completed events
                const callsById = new Map<string, typeof llmCalls>();
                llmCalls.forEach((call) => {
                  const id = call.data.id as string;
                  if (!callsById.has(id)) {
                    callsById.set(id, []);
                  }
                  callsById.get(id)!.push(call);
                });

                return Array.from(callsById.entries()).map(
                  ([callId, events]): JSX.Element => {
                    const startEvent = events.find(
                      (e) => e.data.status === "started"
                    );
                    const endEvent = events.find(
                      (e) =>
                        e.data.status === "completed" ||
                        e.data.status === "failed"
                    );
                    const status = endEvent?.data.status || "in-progress";
                    const duration = endEvent?.data.durationMs as
                      | number
                      | undefined;

                    return (
                      <div
                        key={callId}
                        className={cn(
                          "rounded-lg border p-3 space-y-2",
                          status === "completed"
                            ? "border-green-500/30 bg-green-500/5"
                            : status === "failed"
                              ? "border-red-500/30 bg-red-500/5"
                              : "border-blue-500/30 bg-blue-500/5"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px]",
                                status === "completed"
                                  ? "border-green-500 text-green-500"
                                  : status === "failed"
                                    ? "border-red-500 text-red-500"
                                    : "border-blue-500 text-blue-500"
                              )}
                            >
                              {status === "completed"
                                ? "✓"
                                : status === "failed"
                                  ? "✗"
                                  : "⏳"}{" "}
                              {String(status)}
                            </Badge>
                            <span className="text-xs font-medium">
                              {String(
                                startEvent?.data.agentName || "Unknown Agent"
                              )}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              ({String(startEvent?.data.purpose || "unknown")})
                            </span>
                          </div>
                          {duration ? (
                            <span className="text-[10px] text-muted-foreground">
                              {String(duration)}ms
                            </span>
                          ) : null}
                        </div>

                        {endEvent?.data.error ? (
                          <div className="text-[10px] text-red-500 bg-red-500/10 rounded p-2">
                            Error: {String(endEvent.data.error)}
                          </div>
                        ) : null}

                        {/* Timestamp */}
                        <div className="text-[10px] text-muted-foreground">
                          Started:{" "}
                          {new Date(
                            startEvent?.timestamp || 0
                          ).toLocaleTimeString()}
                        </div>
                      </div>
                    );
                  }
                );
              })()}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TimelineEvent({ item }: { item: TimelineItem }) {
  const colors = getAgentColor(item.agentName);
  const Icon = item.toolName ? getToolIcon(item.toolName) : Activity;

  return (
    <div className="relative pl-6">
      {/* Dot */}
      <div
        className={cn(
          "absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full border-2 border-background",
          item.type === "user-message"
            ? "bg-emerald-500"
            : item.type === "tool-call" || item.type === "tool-result"
              ? "bg-blue-500"
              : item.type === "artifact"
                ? "bg-amber-500"
                : item.type === "reasoning"
                  ? "bg-purple-500"
                  : colors.bg
        )}
      />

      {/* Content */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-xs font-semibold",
              item.type === "user-message"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-foreground"
            )}
          >
            {item.agentName}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatTime(item.timestamp)}
          </span>
          <Badge
            variant={item.type === "user-message" ? "outline" : "secondary"}
            className={cn(
              "text-[10px] h-4 px-1",
              item.type === "user-message" &&
                "border-emerald-500/50 text-emerald-600 dark:text-emerald-400"
            )}
          >
            {item.type === "user-message" ? "user" : item.type}
          </Badge>
        </div>

        {item.type === "user-message" && (
          <div className="text-xs text-foreground bg-emerald-50/50 dark:bg-emerald-950/10 rounded-md p-2 border border-emerald-200/50 dark:border-emerald-800/30">
            {item.content}
          </div>
        )}

        {item.type === "agent-message" && (
          <div className="text-xs text-muted-foreground line-clamp-3">
            {item.content}
          </div>
        )}

        {item.type === "reasoning" && (
          <div className="bg-purple-50/50 dark:bg-purple-950/10 rounded-md border border-purple-200/50 dark:border-purple-800/30 p-2 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-purple-700 dark:text-purple-400 mb-1">
              <Brain className="w-3 h-3" />
              Thinking Process
            </div>
            <div className="text-muted-foreground whitespace-pre-wrap font-mono text-[10px] leading-relaxed">
              {item.content}
            </div>
          </div>
        )}

        {(item.type === "tool-call" || item.type === "tool-result") && (
          <div className="bg-muted/40 rounded-md border border-border p-2 text-xs">
            <div className="flex items-center gap-1.5 font-medium mb-1">
              <Icon className="w-3 h-3" />
              {item.toolName}
            </div>
            {item.toolArgs && (
              <div className="font-mono text-[10px] opacity-70 truncate">
                args: {JSON.stringify(item.toolArgs)}
              </div>
            )}
            {item.toolResult && (
              <div className="font-mono text-[10px] opacity-70 mt-1 truncate">
                result: {item.toolResult.slice(0, 100)}...
              </div>
            )}
          </div>
        )}

        {item.type === "artifact" && (
          <div className="bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-800 p-2 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400">
              <FileText className="w-3 h-3" />
              {item.artifactTitle}
            </div>
            <div className="text-[10px] text-amber-600/80 dark:text-amber-500/80 mt-1">
              ID: {item.artifactId}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Group and summarize events for display
function summarizeEvents(events: DiagnosticEvent[]): DiagnosticEvent[] {
  const result: DiagnosticEvent[] = [];
  let textBuffer = "";
  let textChunkCount = 0;
  let lastTextTimestamp = 0;

  for (const event of events) {
    if (
      event.type === "chunk" &&
      event.data.chunkType === "text-delta" &&
      event.data.content
    ) {
      // Aggregate text-delta chunks
      textBuffer += String(event.data.content);
      textChunkCount++;
      lastTextTimestamp = event.timestamp;
    } else {
      // Flush text buffer if we have accumulated text
      if (textBuffer.length > 0) {
        result.push({
          id: `text_${lastTextTimestamp}`,
          timestamp: lastTextTimestamp,
          type: "chunk",
          data: {
            chunkType: "text-delta",
            content: textBuffer,
            chunkCount: textChunkCount,
          },
        });
        textBuffer = "";
        textChunkCount = 0;
      }
      result.push(event);
    }
  }

  // Flush remaining text
  if (textBuffer.length > 0) {
    result.push({
      id: `text_${lastTextTimestamp}`,
      timestamp: lastTextTimestamp,
      type: "chunk",
      data: {
        chunkType: "text-delta",
        content: textBuffer,
        chunkCount: textChunkCount,
      },
    });
  }

  return result;
}

function DataFlowEvent({ event }: { event: DiagnosticEvent }) {
  const time = new Date(event.timestamp).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });

  const getEventColor = () => {
    switch (event.type) {
      case "request":
        return "text-blue-500";
      case "stream-start":
        return "text-green-500";
      case "chunk":
        return "text-muted-foreground";
      case "error":
        return "text-red-500";
      case "stream-end":
        return "text-green-500";
      case "orchestration":
        return "text-purple-500";
      case "delegation":
        return "text-amber-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getEventIcon = () => {
    switch (event.type) {
      case "request":
        return "→";
      case "stream-start":
        return "▶";
      case "chunk":
        return "·";
      case "error":
        return "✗";
      case "stream-end":
        return "■";
      case "orchestration":
        return "🧠";
      case "delegation":
        return "📤";
      default:
        return "•";
    }
  };

  return (
    <div className={cn("flex items-start gap-2 py-0.5", getEventColor())}>
      <span className="w-20 shrink-0 text-muted-foreground">{time}</span>
      <span className="w-4 text-center">{getEventIcon()}</span>
      <div className="flex-1 min-w-0">
        <span className="font-semibold">{event.type}</span>
        {event.type === "request" && (
          <span className="ml-2 text-muted-foreground truncate">
            mode={String(event.data.chatMode || "unknown")} msg="
            {event.data.message
              ? String(event.data.message).slice(0, 30)
              : "(empty)"}
            ..."
          </span>
        )}
        {event.type === "stream-start" && (
          <span className="ml-2 text-muted-foreground">
            model={event.data.model ? String(event.data.model) : "unknown"}{" "}
            agent=
            {event.data.agentName ? String(event.data.agentName) : "unknown"}
          </span>
        )}
        {event.type === "chunk" && event.data.chunkType === "text-delta" ? (
          <span className="ml-2 text-muted-foreground">
            <span className="text-xs">
              ({String(event.data.chunkCount || 1)} chars)
            </span>
            {event.data.content ? (
              <span className="ml-1 bg-muted px-1 rounded text-xs truncate max-w-[200px] inline-block align-middle">
                "{String(event.data.content).slice(0, 50)}
                {String(event.data.content).length > 50 ? "..." : ""}"
              </span>
            ) : null}
          </span>
        ) : null}
        {event.type === "chunk" && event.data.chunkType !== "text-delta" ? (
          <div className="ml-2 text-muted-foreground text-xs">
            <div className="flex items-center gap-1 flex-wrap">
              <span>{String(event.data.chunkType || "unknown")}</span>
              {event.data.toolName ? (
                <span className="text-amber-500">
                  tool:{String(event.data.toolName)}
                </span>
              ) : null}
              {event.data.toolCallId ? (
                <span className="text-muted-foreground/70">
                  id:{String(event.data.toolCallId).slice(0, 8)}
                </span>
              ) : null}
            </div>
            {event.data.content && String(event.data.content).trim() ? (
              <div className="mt-1 bg-muted/50 px-1.5 py-0.5 rounded text-[10px] max-w-[300px] truncate">
                {String(event.data.content).slice(0, 100)}
                {String(event.data.content).length > 100 ? "..." : ""}
              </div>
            ) : null}
            {!event.data.content && !event.data.toolName ? (
              <span className="text-muted-foreground/50 italic">
                (no content)
              </span>
            ) : null}
          </div>
        ) : null}
        {event.type === "orchestration" && (
          <div className="ml-2 text-xs">
            <div>
              needsPlan:{" "}
              <span
                className={
                  event.data.needsPlan ? "text-green-500" : "text-red-500"
                }
              >
                {String(event.data.needsPlan)}
              </span>
            </div>
            {event.data.reasoning ? (
              <div className="text-muted-foreground truncate">
                "{String(event.data.reasoning).slice(0, 60)}..."
              </div>
            ) : null}
            {event.data.availableAgents ? (
              <div>agents: {String(event.data.availableAgents)}</div>
            ) : null}
            {event.data.suggestedTasks ? (
              <div>tasks: {String(event.data.taskCount)}</div>
            ) : null}
          </div>
        )}
        {event.type === "delegation" && (
          <div className="ml-2 text-xs">
            <span className="text-amber-400">
              {String(event.data.taskTitle)}
            </span>
            <span className="ml-1">→ {String(event.data.agentName)}</span>
            <span
              className={cn(
                "ml-1",
                event.data.status === "completed"
                  ? "text-green-500"
                  : event.data.status === "failed"
                    ? "text-red-500"
                    : "text-muted-foreground"
              )}
            >
              ({String(event.data.status)})
            </span>
            {/* Show configured tools info */}
            {event.data.status === "completed" && event.data.configuredTools ? (
              <div className="mt-1 text-muted-foreground">
                Tools configured:{" "}
                {(event.data.configuredTools as string[]).join(", ")} | Used:{" "}
                {(event.data.loadedToolCount as number) || 0}
              </div>
            ) : null}
            {/* Show warnings */}
            {event.data.warnings &&
            (event.data.warnings as string[]).length > 0 ? (
              <div className="mt-1 p-1 bg-yellow-500/10 rounded text-yellow-400">
                ⚠️{" "}
                {(event.data.warnings as string[]).map(
                  (w: string, i: number) => (
                    <div key={i}>{w}</div>
                  )
                )}
              </div>
            ) : null}
            {/* Show result preview for completed events */}
            {event.data.status === "completed" && event.data.result ? (
              <div className="mt-1 p-1 bg-green-500/10 rounded text-green-400 max-h-20 overflow-y-auto">
                Result: "{String(event.data.result).slice(0, 200)}
                {String(event.data.result).length > 200 ? "..." : ""}"
              </div>
            ) : null}
            {/* Show error for failed events */}
            {event.data.status === "failed" && event.data.error ? (
              <div className="mt-1 p-1 bg-red-500/10 rounded text-red-400">
                Error: {String(event.data.error)}
              </div>
            ) : null}
          </div>
        )}
        {event.type === "error" && (
          <span className="ml-2">{String(event.data.message)}</span>
        )}
        {event.type === "stream-end" && (
          <span className="ml-2 text-muted-foreground">
            {event.data.totalChunks ? String(event.data.totalChunks) : "?"}{" "}
            chunks
          </span>
        )}
        {/* Fallback: show raw data for unrecognized event types or missing data */}
        {![
          "request",
          "stream-start",
          "chunk",
          "orchestration",
          "delegation",
          "error",
          "stream-end",
          "llm-call",
        ].includes(event.type) && (
          <div className="ml-2 text-xs text-muted-foreground">
            <pre className="whitespace-pre-wrap break-words max-w-md">
              {JSON.stringify(event.data, null, 2).slice(0, 200)}
              {JSON.stringify(event.data, null, 2).length > 200 ? "..." : ""}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function ArtifactCard({ item }: { item: TimelineItem }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
        <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium truncate">
          {item.artifactTitle || item.artifactId}
        </h4>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span>{item.agentName}</span>
          <span>•</span>
          <span>{formatTime(item.timestamp)}</span>
        </div>
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
