"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  ArrowRight,
  Wrench,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Search,
  Code,
  PenTool,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export type ActivityType =
  | "message"
  | "handoff"
  | "tool_call"
  | "artifact"
  | "plan_update"
  | "error";

export interface Activity {
  id: string;
  type: ActivityType;
  agent: string;
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface ActivityTimelineProps {
  activities: Activity[];
  maxItems?: number;
}

const AGENT_ICONS: Record<string, typeof Sparkles> = {
  x: Sparkles,
  researcher: Search,
  developer: Code,
  writer: PenTool,
  "web-researcher": Globe,
};

const AGENT_COLORS: Record<string, string> = {
  x: "bg-violet-500",
  researcher: "bg-blue-500",
  developer: "bg-emerald-500",
  writer: "bg-amber-500",
  "web-researcher": "bg-cyan-500",
};

const TYPE_ICONS: Record<ActivityType, typeof MessageSquare> = {
  message: MessageSquare,
  handoff: ArrowRight,
  tool_call: Wrench,
  artifact: FileText,
  plan_update: CheckCircle2,
  error: AlertCircle,
};

const TYPE_COLORS: Record<ActivityType, string> = {
  message: "text-blue-500",
  handoff: "text-violet-500",
  tool_call: "text-amber-500",
  artifact: "text-emerald-500",
  plan_update: "text-cyan-500",
  error: "text-rose-500",
};

function ActivityItem({ activity }: { activity: Activity }) {
  const AgentIcon = AGENT_ICONS[activity.agent] || Sparkles;
  const agentColor = AGENT_COLORS[activity.agent] || "bg-slate-500";
  const TypeIcon = TYPE_ICONS[activity.type];
  const typeColor = TYPE_COLORS[activity.type];

  const timeAgo = formatDistanceToNow(activity.timestamp, { addSuffix: true });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex gap-3 py-2"
    >
      {/* Agent Avatar */}
      <div className="relative shrink-0">
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center text-white",
            agentColor
          )}
        >
          <AgentIcon className="w-4 h-4 shrink-0" />
        </div>
        {/* Type indicator */}
        <div
          className={cn(
            "absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-background flex items-center justify-center shadow-sm",
            typeColor
          )}
        >
          <TypeIcon className="w-2.5 h-2.5 shrink-0" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium capitalize">{activity.agent}</span>
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">{activity.content}</p>

        {/* Metadata */}
        {activity.type === "tool_call" && !!activity.metadata?.toolName && (
          <div className="mt-1 flex items-center gap-1">
            <Wrench className="w-3 h-3 shrink-0 text-amber-500" />
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
              {String(activity.metadata.toolName)}
            </code>
          </div>
        )}

        {activity.type === "artifact" && !!activity.metadata?.artifactName && (
          <div className="mt-1 flex items-center gap-1">
            <FileText className="w-3 h-3 shrink-0 text-emerald-500" />
            <span className="text-xs font-medium">
              {String(activity.metadata.artifactName)}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function ActivityTimeline({
  activities,
  maxItems = 20,
}: ActivityTimelineProps) {
  const recentActivities = activities.slice(-maxItems).reverse();

  if (recentActivities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <MessageSquare className="w-8 h-8 shrink-0 mb-2 opacity-50" />
        <p className="text-sm">No activity yet</p>
        <p className="text-xs opacity-70">Agent actions will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <AnimatePresence mode="popLayout">
        {recentActivities.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </AnimatePresence>
    </div>
  );
}

