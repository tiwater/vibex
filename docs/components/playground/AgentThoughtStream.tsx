"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Search,
  Code,
  PenTool,
  Globe,
  Wrench,
  FileText,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useRef } from "react";

export interface ThoughtEvent {
  id: string;
  type: "thought" | "action" | "handoff" | "artifact" | "complete";
  agentId: string;
  agentName: string;
  content: string;
  metadata?: {
    targetAgent?: string;
    artifactName?: string;
    toolName?: string;
  };
  timestamp: number;
}

interface AgentThoughtStreamProps {
  events: ThoughtEvent[];
  className?: string;
}

const AGENT_ICONS: Record<string, typeof Sparkles> = {
  x: Sparkles,
  researcher: Search,
  developer: Code,
  writer: PenTool,
  "web-researcher": Globe,
  user: Sparkles,
};

const AGENT_COLORS: Record<string, string> = {
  x: "text-violet-400 bg-violet-500/10 border-violet-500/30",
  researcher: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  developer: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  writer: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  "web-researcher": "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  user: "text-muted-foreground bg-muted/50 border-border",
};

const EVENT_ICONS = {
  thought: "",
  action: "",
  handoff: "",
  artifact: "",
  complete: "",
};

function ThoughtEventCard({ event }: { event: ThoughtEvent }) {
  const Icon = AGENT_ICONS[event.agentId] || Sparkles;
  const colors = AGENT_COLORS[event.agentId] || AGENT_COLORS.user;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, height: 0 }}
      animate={{ opacity: 1, x: 0, height: "auto" }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="overflow-hidden"
    >
      <div className={cn("flex gap-3 p-3 rounded-lg border", colors)}>
        {/* Agent icon */}
        <div className="shrink-0 mt-0.5">
          <Icon className="w-4 h-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold">{event.agentName}</span>
            <span className="text-[10px] opacity-60">
              {EVENT_ICONS[event.type]}
            </span>
          </div>

          <p className="text-sm opacity-90 leading-relaxed">{event.content}</p>

          {/* Handoff indicator */}
          {event.type === "handoff" && event.metadata?.targetAgent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1.5 mt-2 text-xs opacity-70"
            >
              <ArrowRight className="w-3 h-3" />
              <span>Delegating to {event.metadata.targetAgent}</span>
            </motion.div>
          )}

          {/* Tool usage */}
          {event.metadata?.toolName && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1.5 mt-2"
            >
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/20 flex items-center gap-1">
                <Wrench className="w-3 h-3" />
                {event.metadata.toolName}
              </span>
            </motion.div>
          )}

          {/* Artifact */}
          {event.type === "artifact" && event.metadata?.artifactName && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 mt-2 px-2 py-1.5 rounded bg-black/20"
            >
              <FileText className="w-3 h-3" />
              <span className="text-xs font-medium">
                {event.metadata.artifactName}
              </span>
            </motion.div>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-[10px] opacity-40 shrink-0">
          {formatTime(event.timestamp)}
        </span>
      </div>
    </motion.div>
  );
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function AgentThoughtStream({ events, className }: AgentThoughtStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <motion.div
            className="w-2 h-2 rounded-full bg-emerald-500"
            animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span className="text-sm font-medium">Live Activity</span>
        </div>
        <span className="text-xs text-muted-foreground">{events.length} events</span>
      </div>

      {/* Events stream */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-3 space-y-2">
          {events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Agent activity will appear here...</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {events.map((event) => (
                <ThoughtEventCard key={event.id} event={event} />
              ))}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

