"use client";

import React, { useState, useMemo } from "react";
import {
  Activity,
  Database,
  FileText,
  X,
  ChevronRight,
  ChevronDown,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Maximize2,
  Minimize2,
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

interface DiagnosisPanelProps {
  messages: XChatMessage[];
  status: string;
  isLoading: boolean;
  onClose?: () => void;
  className?: string;
}

export function DiagnosisPanel({
  messages,
  status,
  isLoading,
  onClose,
  className,
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
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="timeline" className="text-xs">
              Timeline
            </TabsTrigger>
            <TabsTrigger value="artifacts" className="text-xs">
              Artifacts
              {artifacts.length > 0 && (
                <span className="ml-1.5 bg-muted-foreground/20 px-1.5 rounded-full text-[10px]">
                  {artifacts.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="raw" className="text-xs">
              Raw Data
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="flex-1 min-h-0 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {timelineItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No events recorded yet.
                </div>
              ) : (
                <div className="relative border-l border-border ml-3 space-y-6 pb-4">
                  {timelineItems.map((item, index) => (
                    <TimelineEvent key={index} item={item} />
                  ))}
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

        {/* Raw Data Tab */}
        <TabsContent value="raw" className="flex-1 min-h-0 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              <div className="text-xs font-mono bg-muted/50 p-3 rounded-lg overflow-auto">
                <pre>{JSON.stringify(messages, null, 2)}</pre>
              </div>
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
          item.type === "tool-call" || item.type === "tool-result"
            ? "bg-blue-500"
            : item.type === "artifact"
            ? "bg-amber-500"
            : colors.bg
        )}
      />

      {/* Content */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground">
            {item.agentName}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatTime(item.timestamp)}
          </span>
          <Badge variant="secondary" className="text-[10px] h-4 px-1">
            {item.type}
          </Badge>
        </div>

        {item.type === "agent-message" && (
          <div className="text-xs text-muted-foreground line-clamp-3">
            {item.content}
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
