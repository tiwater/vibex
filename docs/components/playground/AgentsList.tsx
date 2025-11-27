"use client";

import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Agent } from "./types";

interface AgentsListProps {
  agents: Agent[];
  selectedAgent: string;
  onSelectAgent: (agentId: string) => void;
}

export function AgentsList({ agents, selectedAgent, onSelectAgent }: AgentsListProps) {
  return (
    <Card className="flex-1 max-h-[45vh]">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="w-4 h-4 shrink-0" />
          Available Agents
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[180px] px-4 pb-4">
          <div className="space-y-2">
            {agents.map((agent) => (
              <motion.div
                key={agent.id}
                whileHover={{ scale: 1.02 }}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedAgent === agent.id
                    ? "bg-violet-100 dark:bg-violet-900/30 border border-violet-300 dark:border-violet-700"
                    : "bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                onClick={() => onSelectAgent(agent.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm">
                    <agent.icon className={`w-4 h-4 shrink-0 ${agent.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm">{agent.name}</h4>
                    <p className="text-xs text-muted-foreground truncate">
                      {agent.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

