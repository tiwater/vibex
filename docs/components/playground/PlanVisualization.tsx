"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  ListTree,
  CheckCircle2,
  Circle,
  Loader2,
  ChevronRight,
  Target,
  GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export type TaskStatus = "pending" | "in_progress" | "completed" | "failed";

export interface PlanTask {
  id: string;
  title: string;
  status: TaskStatus;
  assignedAgent?: string;
  subtasks?: PlanTask[];
  output?: string;
}

export interface Plan {
  id: string;
  goal: string;
  tasks: PlanTask[];
  progress: number;
}

interface PlanVisualizationProps {
  plan?: Plan;
  onTaskClick?: (taskId: string) => void;
}

const STATUS_ICONS: Record<TaskStatus, typeof Circle> = {
  pending: Circle,
  in_progress: Loader2,
  completed: CheckCircle2,
  failed: Circle,
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: "text-muted-foreground",
  in_progress: "text-violet-500",
  completed: "text-emerald-500",
  failed: "text-rose-500",
};

function TaskNode({
  task,
  depth = 0,
  onTaskClick,
}: {
  task: PlanTask;
  depth?: number;
  onTaskClick?: (taskId: string) => void;
}) {
  const StatusIcon = STATUS_ICONS[task.status];
  const statusColor = STATUS_COLORS[task.status];
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative"
    >
      {/* Vertical line for tree structure */}
      {depth > 0 && (
        <div
          className="absolute left-0 top-0 bottom-0 w-px bg-border"
          style={{ left: `${(depth - 1) * 20 + 8}px` }}
        />
      )}

      <div
        className={cn(
          "flex items-start gap-2 py-1.5 px-2 rounded-lg cursor-pointer transition-colors",
          task.status === "in_progress"
            ? "bg-violet-500/10"
            : "hover:bg-muted/50"
        )}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={() => onTaskClick?.(task.id)}
      >
        <motion.div
          className={cn("shrink-0 mt-0.5", statusColor)}
          animate={task.status === "in_progress" ? { rotate: 360 } : {}}
          transition={
            task.status === "in_progress"
              ? { duration: 1, repeat: Infinity, ease: "linear" }
              : {}
          }
        >
          <StatusIcon className="w-4 h-4 shrink-0" />
        </motion.div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-sm",
                task.status === "completed" && "line-through opacity-70"
              )}
            >
              {task.title}
            </span>
            {hasSubtasks && (
              <ChevronRight className="w-3 h-3 shrink-0 text-muted-foreground" />
            )}
          </div>

          {task.assignedAgent && task.status === "in_progress" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1 mt-0.5"
            >
              <span className="text-xs text-violet-500 font-medium">
                {task.assignedAgent}
              </span>
              <span className="text-xs text-muted-foreground">working...</span>
            </motion.div>
          )}

          {task.output && task.status === "completed" && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {task.output}
            </p>
          )}
        </div>
      </div>

      {/* Subtasks */}
      {hasSubtasks && (
        <div className="mt-1">
          {task.subtasks!.map((subtask) => (
            <TaskNode
              key={subtask.id}
              task={subtask}
              depth={depth + 1}
              onTaskClick={onTaskClick}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

export function PlanVisualization({ plan, onTaskClick }: PlanVisualizationProps) {
  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <GitBranch className="w-8 h-8 shrink-0 mb-2 opacity-50" />
        <p className="text-sm">No active plan</p>
        <p className="text-xs opacity-70">Start a task to see the plan</p>
      </div>
    );
  }

  const completedTasks = plan.tasks.filter(
    (t) => t.status === "completed"
  ).length;
  const totalTasks = plan.tasks.length;

  return (
    <div className="space-y-4">
      {/* Plan Header */}
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <Target className="w-4 h-4 shrink-0 text-violet-500 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium">Goal</h4>
            <p className="text-xs text-muted-foreground">{plan.goal}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {completedTasks}/{totalTasks} tasks
            </span>
          </div>
          <Progress value={plan.progress} className="h-1.5" />
        </div>
      </div>

      {/* Task Tree */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 mb-2">
          <ListTree className="w-4 h-4 shrink-0 text-muted-foreground" />
          <span className="text-sm font-medium">Task Breakdown</span>
        </div>

        <AnimatePresence>
          {plan.tasks.map((task) => (
            <TaskNode key={task.id} task={task} onTaskClick={onTaskClick} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

