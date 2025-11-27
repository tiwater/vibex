"use client";

import { Send, Cpu, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Agent } from "./types";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isTyping: boolean;
  selectedAgent: Agent | undefined;
  streamingEnabled: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  isTyping,
  selectedAgent,
  streamingEnabled,
}: ChatInputProps) {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="p-4 border-t bg-white dark:bg-slate-900">
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Ask anything... (Press Enter to send)"
          className="min-h-[60px] max-h-[200px] pr-14 resize-none"
          rows={2}
        />
        <Button
          size="icon"
          className="absolute bottom-2 right-2 bg-violet-600 hover:bg-violet-700"
          onClick={onSend}
          disabled={!value.trim() || isTyping}
        >
          <Send className="w-4 h-4 shrink-0" />
        </Button>
      </div>
      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Cpu className="w-3 h-3 shrink-0" />
          {selectedAgent?.name || "X (Orchestrator)"}
        </span>
        <span className="flex items-center gap-1">
          <Zap className="w-3 h-3 shrink-0" />
          {streamingEnabled ? "Streaming" : "Batch"}
        </span>
      </div>
    </div>
  );
}

