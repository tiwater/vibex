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
  const [chatMode, setChatMode] = useState<ChatMode>("agent");

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
      if (!content.trim()) return;

      console.log("[Playground] Sending message:", content.slice(0, 50));

      try {
        await chat.append({
          role: "user",
          content,
        });
      } catch (err) {
        console.error("[Playground] Failed to send message:", err);
        setError(err instanceof Error ? err.message : "Failed to send message");
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

    // Error state
    error,
    clearError: () => setError(null),
  };
}

// Re-export types for convenience
export type { XChatMessage, ChatMode };
