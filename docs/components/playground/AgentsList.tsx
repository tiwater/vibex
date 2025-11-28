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
    <Card className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="w-4 h-4 shrink-0" />
          Available Agents
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-0">
        <ScrollArea className="h-full px-4 pb-4">
          <div className="space-y-2">
            {agents.map((agent) => (
              <motion.div
                key={agent.id}
                whileHover={{ scale: 1.02 }}
                className={`p-3 rounded-lg cursor-pointer transition-colors overflow-hidden ${
                  selectedAgent === agent.id
                    ? "bg-violet-500/10 border border-violet-500/30"
                    : "bg-muted/50 hover:bg-muted"
                }`}
                onClick={() => onSelectAgent(agent.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center shadow-sm shrink-0">
                    <agent.icon className={`w-4 h-4 shrink-0 ${agent.color}`} />
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <h4 className="font-medium text-sm truncate">{agent.name}</h4>
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

