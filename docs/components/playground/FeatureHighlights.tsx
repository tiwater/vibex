"use client";

import { Brain, GitBranch, Zap, Layers } from "lucide-react";
import { Card } from "@/components/ui/card";

const FEATURES = [
  {
    icon: Brain,
    title: "Persistent Spaces",
    description: "Your work survives across sessions with full context",
    color: "text-violet-500",
  },
  {
    icon: GitBranch,
    title: "Multi-Agent",
    description: "Specialist agents collaborate seamlessly",
    color: "text-blue-500",
  },
  {
    icon: Zap,
    title: "Streaming",
    description: "Real-time responses with tool call visibility",
    color: "text-amber-500",
  },
  {
    icon: Layers,
    title: "Artifact Evolution",
    description: "Documents improve with automatic versioning",
    color: "text-emerald-500",
  },
];

export function FeatureHighlights() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
      {FEATURES.map((feature) => (
        <Card
          key={feature.title}
          className="p-4 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
              <feature.icon className={`w-5 h-5 shrink-0 ${feature.color}`} />
            </div>
            <div>
              <h4 className="font-semibold text-sm">{feature.title}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {feature.description}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

