"use client";

import { motion } from "framer-motion";
import { Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Task } from "./types";

interface TasksListProps {
  tasks: Task[];
}

export function TasksList({ tasks }: TasksListProps) {
  return (
    <Card className="flex-1 max-h-[45vh]">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Layers className="w-4 h-4 shrink-0" />
          Active Tasks
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[180px] px-4 pb-4">
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{task.title}</span>
                  <Badge
                    variant={
                      task.status === "completed"
                        ? "default"
                        : task.status === "running"
                          ? "secondary"
                          : "outline"
                    }
                    className={`text-[10px] ${
                      task.status === "completed"
                        ? "bg-emerald-500"
                        : task.status === "running"
                          ? "bg-amber-500"
                          : ""
                    }`}
                  >
                    {task.status}
                  </Badge>
                </div>
                {task.assignedTo && (
                  <p className="text-xs text-muted-foreground mt-1">
                    → {task.assignedTo}
                  </p>
                )}
                {task.progress !== undefined && (
                  <div className="mt-2 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${task.progress}%` }}
                      className="h-full bg-violet-500"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

