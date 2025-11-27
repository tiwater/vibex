"use client";

import { Plus, FileText, Code, Database, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Artifact } from "./types";

interface ArtifactsListProps {
  artifacts: Artifact[];
}

export function ArtifactsList({ artifacts }: ArtifactsListProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Artifacts</h3>
        <Button variant="outline" size="sm">
          <Plus className="w-4 h-4 shrink-0 mr-1" />
          New
        </Button>
      </div>
      <div className="grid gap-2">
        {artifacts.map((artifact) => (
          <Card
            key={artifact.id}
            className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  artifact.type === "document"
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
                    : artifact.type === "code"
                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"
                      : artifact.type === "data"
                        ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600"
                        : "bg-purple-100 dark:bg-purple-900/30 text-purple-600"
                }`}
              >
                {artifact.type === "document" ? (
                  <FileText className="w-5 h-5 shrink-0" />
                ) : artifact.type === "code" ? (
                  <Code className="w-5 h-5 shrink-0" />
                ) : artifact.type === "data" ? (
                  <Database className="w-5 h-5 shrink-0" />
                ) : (
                  <FileText className="w-5 h-5 shrink-0" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{artifact.name}</p>
                <p className="text-xs text-muted-foreground">{artifact.size}</p>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

