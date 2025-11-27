"use client";

import { motion } from "framer-motion";
import { FolderOpen, Plus, MessageSquare, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Space } from "./types";
import { formatDate } from "./utils";

interface SpacesListProps {
  spaces: Space[];
  currentSpace: Space | null;
  onSelectSpace: (space: Space) => void;
  onCreateSpace: () => void;
}

export function SpacesList({
  spaces,
  currentSpace,
  onSelectSpace,
  onCreateSpace,
}: SpacesListProps) {
  return (
    <Card className="flex-1 max-h-[45vh]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <FolderOpen className="w-4 h-4 shrink-0" />
            Spaces
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onCreateSpace}
          >
            <Plus className="w-4 h-4 shrink-0" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[180px] px-4 pb-4">
          <div className="space-y-2">
            {spaces.map((space) => (
              <motion.div
                key={space.id}
                whileHover={{ scale: 1.02 }}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  currentSpace?.id === space.id
                    ? "bg-violet-100 dark:bg-violet-900/30 border border-violet-300 dark:border-violet-700"
                    : "bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                onClick={() => onSelectSpace(space)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{space.name}</h4>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {space.goal}
                    </p>
                  </div>
                  <Badge
                    variant={space.status === "active" ? "default" : "secondary"}
                    className="text-[10px] px-1.5 py-0 ml-2"
                  >
                    {space.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <MessageSquare className="w-3 h-3 shrink-0" />
                  <span>{space.messageCount}</span>
                  <Clock className="w-3 h-3 shrink-0 ml-2" />
                  <span>{formatDate(space.updatedAt)}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

