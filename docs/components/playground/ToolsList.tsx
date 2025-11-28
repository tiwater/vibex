"use client";

import { Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { Tool } from "./types";
import { TOOL_CATEGORIES } from "./constants";

interface ToolsListProps {
  tools: Tool[];
}

export function ToolsList({ tools }: ToolsListProps) {
  return (
    <Card className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle className="text-sm flex items-center gap-2">
          <Wrench className="w-4 h-4 shrink-0" />
          Tools
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-0 overflow-auto px-4 pb-4">
        <Accordion type="single" collapsible>
          {TOOL_CATEGORIES.map((category) => (
            <AccordionItem key={category} value={category} className="border-b-0">
              <AccordionTrigger className="text-sm py-2 hover:no-underline">
                {category}
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1">
                  {tools
                    .filter((t) => t.category === category)
                    .map((tool) => (
                      <div
                        key={tool.name}
                        className="p-2 rounded-md bg-muted/50 text-xs"
                      >
                        <code className="text-violet-600 dark:text-violet-400">
                          {tool.name}
                        </code>
                        <p className="text-muted-foreground mt-0.5">
                          {tool.description}
                        </p>
                      </div>
                    ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}

