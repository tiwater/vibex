"use client";

import { useRef, useEffect, useCallback } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  isLoading,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    console.log("[ChatInput] Calling onSend()");
    onSend();
  };

  return (
    <div className="p-4 border-t bg-background">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="What would you like to do? (Press Enter to send)"
          className="min-h-[60px] max-h-[200px] pr-14 resize-none"
          rows={2}
        />
        <Button
          size="icon"
          className="absolute bottom-2 right-2"
          onClick={handleSend}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
          ) : (
            <Send className="w-4 h-4 shrink-0" />
          )}
        </Button>
      </div>
    </div>
  );
}
