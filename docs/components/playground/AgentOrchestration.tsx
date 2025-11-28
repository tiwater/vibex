"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Search,
  Code,
  PenTool,
  Globe,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Clock,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type AgentStatus = "idle" | "thinking" | "working" | "handoff" | "done";

export interface ActiveAgent {
  id: string;
  name: string;
  status: AgentStatus;
  task?: string;
  progress?: number;
}

export interface AgentHandoff {
  from: string;
  to: string;
  reason: string;
  timestamp: number;
}

interface AgentOrchestrationProps {
  activeAgents: ActiveAgent[];
  handoffs: AgentHandoff[];
  currentOrchestrator?: string;
}

const AGENT_ICONS: Record<string, typeof Sparkles> = {
  x: Sparkles,
  researcher: Search,
  developer: Code,
  writer: PenTool,
  "web-researcher": Globe,
};

const AGENT_COLORS: Record<string, string> = {
  x: "from-violet-500 to-purple-600",
  researcher: "from-blue-500 to-cyan-600",
  developer: "from-emerald-500 to-green-600",
  writer: "from-amber-500 to-orange-600",
  "web-researcher": "from-cyan-500 to-teal-600",
};

const STATUS_COLORS: Record<AgentStatus, string> = {
  idle: "bg-slate-400",
  thinking: "bg-amber-500",
  working: "bg-emerald-500",
  handoff: "bg-blue-500",
  done: "bg-violet-500",
};

function AgentAvatar({
  agentId,
  status,
  size = "md",
}: {
  agentId: string;
  status: AgentStatus;
  size?: "sm" | "md" | "lg";
}) {
  const Icon = AGENT_ICONS[agentId] || Sparkles;
  const gradient = AGENT_COLORS[agentId] || "from-slate-500 to-slate-600";

  const sizes = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  return (
    <div className="relative">
      <motion.div
        className={cn(
          "rounded-xl bg-linear-to-br flex items-center justify-center text-white shadow-lg",
          sizes[size],
          gradient
        )}
        animate={
          status === "working" || status === "thinking"
            ? { scale: [1, 1.05, 1] }
            : {}
        }
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <Icon className={cn("shrink-0", iconSizes[size])} />
      </motion.div>

      {/* Status indicator */}
      <motion.div
        className={cn(
          "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
          STATUS_COLORS[status]
        )}
        animate={status === "working" ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 0.8, repeat: Infinity }}
      />
    </div>
  );
}

function HandoffArrow({ active }: { active: boolean }) {
  return (
    <motion.div
      className="flex items-center gap-1 px-2"
      initial={{ opacity: 0.3 }}
      animate={{ opacity: active ? 1 : 0.3 }}
    >
      <motion.div
        className="flex items-center"
        animate={active ? { x: [0, 4, 0] } : {}}
        transition={{ duration: 0.6, repeat: Infinity }}
      >
        <ArrowRight className="w-4 h-4 shrink-0 text-violet-500" />
      </motion.div>
    </motion.div>
  );
}

export function AgentOrchestration({
  activeAgents,
  handoffs,
  currentOrchestrator = "x",
}: AgentOrchestrationProps) {
  const sortedAgents = [...activeAgents].sort((a, b) => {
    // X always first
    if (a.id === "x") return -1;
    if (b.id === "x") return 1;
    // Working agents next
    if (a.status === "working" && b.status !== "working") return -1;
    if (b.status === "working" && a.status !== "working") return 1;
    return 0;
  });

  const workingAgents = activeAgents.filter(
    (a) => a.status === "working" || a.status === "thinking"
  );
  const lastHandoff = handoffs[handoffs.length - 1];

  return (
    <div className="space-y-4">
      {/* Orchestra Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 shrink-0 text-violet-500" />
          <span className="text-sm font-medium">Agent Orchestra</span>
        </div>
        <Badge variant="outline" className="text-xs">
          {workingAgents.length} active
        </Badge>
      </div>

      {/* Agent Flow Visualization */}
      <div className="relative bg-muted/50 rounded-xl p-4">
        {/* Orchestration Flow */}
        <div className="flex items-center justify-center gap-1 mb-4">
          <AnimatePresence mode="popLayout">
            {sortedAgents.slice(0, 4).map((agent, idx) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center"
              >
                {idx > 0 && <HandoffArrow active={agent.status === "working"} />}
                <AgentAvatar agentId={agent.id} status={agent.status} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Current Activity */}
        <AnimatePresence mode="wait">
          {workingAgents.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-card rounded-lg p-3 shadow-sm"
            >
              {workingAgents.map((agent) => (
                <div key={agent.id} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {agent.status === "thinking" ? (
                      <Loader2 className="w-4 h-4 shrink-0 text-amber-500 animate-spin" />
                    ) : (
                      <motion.div
                        className="w-2 h-2 rounded-full bg-emerald-500"
                        animate={{ scale: [1, 1.5, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    )}
                    <span className="text-sm font-medium truncate">
                      {agent.name}
                    </span>
                  </div>
                  {agent.task && (
                    <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                      {agent.task}
                    </span>
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Last Handoff */}
        {lastHandoff && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 text-xs text-muted-foreground text-center"
          >
            <span className="text-violet-500 font-medium">
              {lastHandoff.from}
            </span>
            {" → "}
            <span className="text-emerald-500 font-medium">
              {lastHandoff.to}
            </span>
            <span className="ml-1 opacity-70">"{lastHandoff.reason}"</span>
          </motion.div>
        )}
      </div>

      {/* Agent List */}
      <div className="space-y-2">
        {sortedAgents.map((agent) => (
          <motion.div
            key={agent.id}
            layout
            className={cn(
              "flex items-center gap-3 p-2 rounded-lg transition-colors",
              agent.status === "working" || agent.status === "thinking"
                ? "bg-violet-500/10"
                : "hover:bg-muted/50"
            )}
          >
            <AgentAvatar agentId={agent.id} status={agent.status} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">{agent.name}</span>
                {agent.id === currentOrchestrator && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    Lead
                  </Badge>
                )}
              </div>
              {agent.task && (
                <p className="text-xs text-muted-foreground truncate">
                  {agent.task}
                </p>
              )}
            </div>
            <div className="shrink-0">
              {agent.status === "done" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              ) : agent.status === "working" ? (
                <Loader2 className="w-4 h-4 shrink-0 text-violet-500 animate-spin" />
              ) : agent.status === "thinking" ? (
                <Clock className="w-4 h-4 shrink-0 text-amber-500" />
              ) : null}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

