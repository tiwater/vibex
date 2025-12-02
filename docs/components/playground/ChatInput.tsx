"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import {
  Send,
  Loader2,
  ChevronUp,
  Sparkles,
  Search,
  Code,
  PenTool,
  MessageSquare,
  Map,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ChatMode } from "./usePlayground";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (value: string) => void; // Pass the value to ensure it's not stale
  isLoading: boolean;
  agentId?: string;
  onAgentChange?: (agentId?: string) => void;
  chatMode: ChatMode;
  onChatModeChange?: (mode: ChatMode) => void;
}

const AGENT_ICONS: Record<string, React.ElementType> = {
  auto: Sparkles,
  Researcher: Search,
  Developer: Code,
  "Content Writer": PenTool,
};

const MODE_ICONS: Record<string, React.ElementType> = {
  ask: MessageSquare,
  plan: Map,
  agent: Bot,
};

export function ChatInput({
  value,
  onChange,
  onSend,
  isLoading,
  agentId,
  onAgentChange,
  chatMode,
  onChatModeChange,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showAgentMenu, setShowAgentMenu] = useState(false);

  // Sync DOM value with React state for browser automation compatibility
  // Browser automation types directly into DOM without triggering React onChange
  const syncDOMValue = useCallback(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      if (domValue !== value) {
        console.log("[ChatInput] Syncing DOM value to React state:", domValue);
        onChange(domValue);
        return domValue;
      }
    }
    return value;
  }, [value, onChange]);

  // Use native input event to catch browser automation typing
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleInput = () => {
      syncDOMValue();
    };

    textarea.addEventListener("input", handleInput);
    return () => textarea.removeEventListener("input", handleInput);
  }, [syncDOMValue]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    // Always sync DOM value first (for browser automation compatibility)
    const currentValue = syncDOMValue();
    console.log(
      "[ChatInput] handleSend called, value:",
      JSON.stringify(currentValue),
      "isLoading:",
      isLoading
    );

    // Validate before sending - don't rely on disabled state
    if (!currentValue.trim() || isLoading) {
      console.log("[ChatInput] handleSend aborted - empty or loading");
      return;
    }
    console.log("[ChatInput] Calling onSend() with value:", currentValue);
    // Pass the value directly - don't rely on React state which may be stale
    onSend(currentValue);
  };

  const ActiveAgentIcon = AGENT_ICONS[agentId || "auto"] || Sparkles;

  return (
    <div className="relative flex flex-col w-full bg-background border border-border rounded-xl shadow-sm focus-within:border-primary transition-all duration-200">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder="Ask for follow-up changes..."
        className="min-h-[60px] max-h-[200px] w-full resize-none bg-transparent border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 p-4 text-base"
        rows={1}
      />

      <div className="flex items-center justify-between px-2 pb-2">
        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            value={chatMode}
            onValueChange={(value) => {
              if (value) onChatModeChange?.(value as ChatMode);
            }}
            className="bg-muted/30 p-0.5 rounded-lg border border-border/40 gap-0"
          >
            {(["ask", "plan", "agent"] as ChatMode[]).map((mode) => {
              const ModeIcon = MODE_ICONS[mode];
              return (
                <ToggleGroupItem
                  key={mode}
                  value={mode}
                  size="sm"
                  className="h-6 px-2 text-xs gap-1 rounded-md data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm hover:bg-muted/50 transition-all"
                >
                  <ModeIcon className="w-2.5 h-2.5" />
                  <span className="capitalize">{mode}</span>
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>

          <DropdownMenu open={showAgentMenu} onOpenChange={setShowAgentMenu}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50"
              >
                <div className="flex items-center justify-center w-4 h-4 rounded-sm text-foreground">
                  <ActiveAgentIcon className="w-3 h-3" />
                </div>
                {agentId ? agentId : "Agent (auto)"}
                <ChevronUp
                  className={cn(
                    "w-2 h-2 opacity-50 transition-transform duration-200",
                    showAgentMenu && "rotate-180"
                  )}
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {[
                { label: "Auto (X)", value: "auto", icon: Sparkles },
                { label: "Researcher", value: "Researcher", icon: Search },
                { label: "Developer", value: "Developer", icon: Code },
                { label: "Content Writer", value: "Content Writer", icon: PenTool },
              ].map((opt) => (
                <DropdownMenuItem
                  key={opt.label}
                  onClick={() =>
                    onAgentChange?.(opt.value === "auto" ? undefined : opt.value)
                  }
                  className="text-xs gap-2"
                >
                  <opt.icon className="w-3 h-3" />
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button
          size="sm"
          onClick={handleSend}
          disabled={isLoading || !value.trim()}
          className="h-8 rounded-lg bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span className="text-xs font-medium">Send</span>
              <Send className="w-3 h-3" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
