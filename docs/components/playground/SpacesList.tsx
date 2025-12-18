"use client";

import { motion } from "framer-motion";
import { FolderOpen, Plus, MessageSquare, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Space } from "./types";
import { formatTime } from "./utils";

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
    <Card className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <CardHeader className="pb-3 shrink-0">
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
      <CardContent className="flex-1 min-h-0 p-0">
        <ScrollArea className="h-full px-4 pb-4">
          <div className="space-y-2">
            {spaces.map((space) => (
              <motion.div
                key={space.id}
                whileHover={{ scale: 1.02 }}
                className={`p-3 rounded-lg cursor-pointer transition-colors overflow-hidden ${
                  currentSpace?.id === space.id
                    ? "bg-violet-500/10 border border-violet-500/30"
                    : "bg-muted/50 hover:bg-muted"
                }`}
                onClick={() => onSelectSpace(space)}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <h4 className="font-medium text-sm truncate">{space.name}</h4>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {space.goal}
                    </p>
                  </div>
                  <Badge
                    variant={space.status === "active" ? "default" : "secondary"}
                    className="text-[10px] px-1.5 py-0 shrink-0"
                  >
                    {space.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <MessageSquare className="w-3 h-3 shrink-0" />
                  <span>{space.messageCount}</span>
                  <Clock className="w-3 h-3 shrink-0 ml-2" />
                  <span>{formatTime(new Date(space.updatedAt))}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

