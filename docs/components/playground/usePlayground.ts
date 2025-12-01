"use client";

import { useState, useCallback, useMemo } from "react";
import { useXChat, type XChatMessage } from "@vibex/react";

/**
 * Chat modes supported by X
 * - ask: Direct response, no multi-agent orchestration
 * - plan: Create a plan and show for approval before execution
 * - agent: Auto-execute with multi-agent orchestration (default)
 */
export type ChatMode = "ask" | "plan" | "agent";

/**
 * Real playground hook - no fake simulation
 *
 * This hook connects to the actual VibeX backend via /api/chat
 * and displays real agent responses.
 */
export function usePlayground() {
  const [error, setError] = useState<string | null>(null);
  // Default to "ask" mode - "agent" mode requires LLM orchestration which may fail
  const [chatMode, setChatMode] = useState<ChatMode>("ask");

  // Stable error handler
  const onError = useCallback((err: Error) => {
    console.error("[Playground] Chat error:", err);
    setError(err.message);
  }, []);

  // Callback when chat finishes
  const onFinish = useCallback((message: XChatMessage) => {
    console.log("[Playground] Response received:", message.id);
  }, []);

  // Memoize metadata to include chatMode
  const metadata = useMemo(
    () => ({
      source: "playground",
      chatMode,
    }),
    [chatMode]
  );

  // Use VibeX chat hook - connects to real /api/chat endpoint
  const chat = useXChat({
    spaceId: "playground",
    metadata,
    onError,
    onFinish,
  });

  // Send a message to the real backend
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) {
        console.log("[Playground] sendMessage: empty content, skipping");
        return;
      }

      console.log("[Playground] Sending message:", content.slice(0, 50));
      console.log("[Playground] chat object:", {
        hasAppend: typeof chat.append === "function",
        chatKeys: Object.keys(chat),
      });

      try {
        if (!chat.append) {
          throw new Error("chat.append is not a function");
        }
        await chat.append({
          role: "user",
          content,
        });
        console.log("[Playground] Message sent successfully");
      } catch (err) {
        console.error("[Playground] Failed to send message:", err);
        setError(err instanceof Error ? err.message : "Failed to send message");
      }
    },
    [chat]
  );

  // Reset space function
  const resetSpace = useCallback(
    async (spaceId: string) => {
      try {
        const response = await fetch(`/api/spaces/${spaceId}/reset`, {
          method: "POST",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to reset space");
        }

        // Clear local chat state regardless of server result
        chat.setMessages([]);
        chat.setInput("");

        // Show warning if partial reset
        if (data.partial) {
          console.warn("[Playground] Partial reset:", data.message, data.note);
          setError(`⚠️ ${data.message}${data.note ? `\n\n${data.note}` : ""}`);
        } else {
          console.log("[Playground] Space reset successfully");
        }
      } catch (err) {
        console.error("[Playground] Failed to reset space:", err);
        setError(err instanceof Error ? err.message : "Failed to reset space");
      }
    },
    [chat]
  );

  return {
    // Chat state from real backend
    messages: chat.messages,
    input: chat.input,
    setInput: chat.setInput,
    isLoading: chat.isLoading,
    status: chat.status,

    // Chat mode
    chatMode,
    setChatMode,

    // Actions
    sendMessage,
    stop: chat.stop,
    reload: chat.reload,
    resetSpace,

    // Error state
    error,
    clearError: () => setError(null),
  };
}

// Re-export types for convenience
export type { XChatMessage };
