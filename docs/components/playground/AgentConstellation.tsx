"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Search,
  Code,
  PenTool,
  Globe,
  Database,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export type AgentStatus = "idle" | "thinking" | "working" | "handoff" | "done";

export interface ConstellationAgent {
  id: string;
  name: string;
  status: AgentStatus;
  thought?: string;
  task?: string;
}

export interface AgentConnection {
  from: string;
  to: string;
  active: boolean;
  label?: string;
}

interface AgentConstellationProps {
  agents: ConstellationAgent[];
  connections: AgentConnection[];
  className?: string;
}

const AGENT_ICONS: Record<string, typeof Sparkles> = {
  x: Sparkles,
  researcher: Search,
  developer: Code,
  writer: PenTool,
  "web-researcher": Globe,
  dba: Database,
};

const AGENT_COLORS: Record<string, { bg: string; glow: string; text: string }> =
  {
    x: {
      bg: "from-violet-500 to-purple-600",
      glow: "shadow-violet-500/50",
      text: "text-violet-400",
    },
    researcher: {
      bg: "from-blue-500 to-cyan-600",
      glow: "shadow-blue-500/50",
      text: "text-blue-400",
    },
    developer: {
      bg: "from-emerald-500 to-green-600",
      glow: "shadow-emerald-500/50",
      text: "text-emerald-400",
    },
    writer: {
      bg: "from-amber-500 to-orange-600",
      glow: "shadow-amber-500/50",
      text: "text-amber-400",
    },
    "web-researcher": {
      bg: "from-cyan-500 to-teal-600",
      glow: "shadow-cyan-500/50",
      text: "text-cyan-400",
    },
    dba: {
      bg: "from-rose-500 to-pink-600",
      glow: "shadow-rose-500/50",
      text: "text-rose-400",
    },
  };

// Agent positions in constellation (centered around X)
const AGENT_POSITIONS: Record<string, { x: number; y: number }> = {
  x: { x: 50, y: 45 }, // Center
  researcher: { x: 20, y: 25 }, // Top left
  developer: { x: 80, y: 25 }, // Top right
  writer: { x: 20, y: 70 }, // Bottom left
  "web-researcher": { x: 80, y: 70 }, // Bottom right
  dba: { x: 50, y: 85 }, // Bottom center
};

function AgentNode({ agent }: { agent: ConstellationAgent }) {
  const Icon = AGENT_ICONS[agent.id] || Sparkles;
  const colors = AGENT_COLORS[agent.id] || AGENT_COLORS.x;
  const position = AGENT_POSITIONS[agent.id] || { x: 50, y: 50 };

  const isActive = agent.status === "working" || agent.status === "thinking";
  const isOrchestrator = agent.id === "x";

  return (
    <motion.div
      className="absolute transform -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", duration: 0.5 }}
    >
      {/* Thought bubble */}
      <AnimatePresence>
        {agent.thought && isActive && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            className={cn(
              "absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap",
              "px-3 py-1.5 rounded-lg text-xs font-medium",
              "bg-popover/95 backdrop-blur-xs text-popover-foreground border",
              "max-w-[180px] truncate"
            )}
          >
            <span className={cn("mr-1", colors.text)}>💭</span>
            {agent.thought}
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-popover/95" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Glow effect */}
      {isActive && (
        <motion.div
          className={cn(
            "absolute inset-0 rounded-full blur-xl opacity-50",
            `bg-linear-to-br ${colors.bg}`
          )}
          animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            width: isOrchestrator ? 80 : 60,
            height: isOrchestrator ? 80 : 60,
            margin: "-10px",
          }}
        />
      )}

      {/* Agent avatar */}
      <motion.div
        className={cn(
          "relative rounded-full bg-linear-to-br flex items-center justify-center text-white shadow-lg",
          colors.bg,
          isActive && colors.glow,
          isOrchestrator ? "w-16 h-16" : "w-12 h-12"
        )}
        animate={isActive ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {agent.status === "thinking" ? (
          <Loader2
            className={cn(
              "shrink-0 animate-spin",
              isOrchestrator ? "w-7 h-7" : "w-5 h-5"
            )}
          />
        ) : (
          <Icon
            className={cn("shrink-0", isOrchestrator ? "w-7 h-7" : "w-5 h-5")}
          />
        )}

        {/* Status ring */}
        {isActive && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-white/30"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </motion.div>

      {/* Agent name */}
      <motion.p
        className={cn(
          "text-xs font-medium mt-2 text-center whitespace-nowrap",
          isActive ? "text-foreground" : "text-muted-foreground"
        )}
        animate={isActive ? { opacity: [0.8, 1, 0.8] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {agent.name.split(" ")[0]}
      </motion.p>

      {/* Task badge */}
      {agent.task && isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-full mt-6 left-1/2 -translate-x-1/2"
        >
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted/80 text-muted-foreground whitespace-nowrap max-w-[120px] truncate block">
            {agent.task}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}

function ConnectionLine({ from, to, active, label }: AgentConnection) {
  const fromPos = AGENT_POSITIONS[from] || { x: 50, y: 50 };
  const toPos = AGENT_POSITIONS[to] || { x: 50, y: 50 };

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
      {/* Line - using Tailwind stroke classes */}
      <motion.line
        x1={`${fromPos.x}%`}
        y1={`${fromPos.y}%`}
        x2={`${toPos.x}%`}
        y2={`${toPos.y}%`}
        className={cn(
          "transition-colors",
          active ? "stroke-violet-500/80" : "stroke-muted-foreground/30"
        )}
        strokeWidth={active ? 2 : 1}
        strokeDasharray={active ? "none" : "4 4"}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5 }}
      />

      {/* Animated pulse on active connection */}
      {active && (
        <motion.circle
          r="4"
          className="fill-violet-500"
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 1, 0],
            cx: [`${fromPos.x}%`, `${toPos.x}%`],
            cy: [`${fromPos.y}%`, `${toPos.y}%`],
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      {/* Label */}
      {label && active && (
        <foreignObject
          x={`${(fromPos.x + toPos.x) / 2 - 10}%`}
          y={`${(fromPos.y + toPos.y) / 2 - 2}%`}
          width="20%"
          height="20"
        >
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[10px] bg-popover/95 px-1.5 py-0.5 rounded text-violet-600 dark:text-violet-300 whitespace-nowrap"
          >
            {label}
          </motion.span>
        </foreignObject>
      )}
    </svg>
  );
}

export function AgentConstellation({
  agents,
  connections,
  className,
}: AgentConstellationProps) {
  // Filter to only show relevant agents
  const visibleAgents = agents.filter(
    (a) => AGENT_POSITIONS[a.id] !== undefined
  );

  return (
    <div className={cn("relative w-full h-full min-h-[300px]", className)}>
      {/* Background glow */}
      <div className="absolute inset-0 bg-linear-to-br from-violet-950/20 via-transparent to-cyan-950/20 rounded-2xl" />

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,var(--color-violet-500)_1px,transparent_0)] bg-size-[24px_24px]" />

      {/* Connections */}
      {connections.map((conn, idx) => (
        <ConnectionLine key={`${conn.from}-${conn.to}-${idx}`} {...conn} />
      ))}

      {/* Agents */}
      {visibleAgents.map((agent) => (
        <AgentNode key={agent.id} agent={agent} />
      ))}

      {/* Center label */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          Agent Orchestra
        </p>
      </div>
    </div>
  );
}
