"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { useXChat, XChatTransport, type XChatMessage } from "@vibex/react";

/**
 * Chat modes supported by X
 * - ask: Direct response, no multi-agent orchestration
 * - plan: Create a plan and show for approval before execution
 * - agent: Auto-execute with multi-agent orchestration (default)
 */
export type ChatMode = "ask" | "plan" | "agent";

/**
 * Diagnostic event - represents one step in the backend data flow
 */
export interface DiagnosticEvent {
  id: string;
  timestamp: number;
  type:
    | "request"
    | "stream-start"
    | "chunk"
    | "error"
    | "stream-end"
    | "orchestration"
    | "delegation"
    | "llm-call"
    | "agent-boundary";
  data: Record<string, unknown>;
}

/**
 * Diagnostic info for debugging - shows the complete backend data flow
 */
export interface DiagnosticInfo {
  events: DiagnosticEvent[];
  model?: string;
  spaceId?: string;
  totalChunks: number;
  errors: string[];
}

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
  const [agentId, setAgentId] = useState<string | undefined>(undefined);

  // Diagnostic state for debugging - captures all backend data flow
  const [diagnostics, setDiagnostics] = useState<DiagnosticInfo>({
    events: [],
    totalChunks: 0,
    errors: [],
  });

  // Helper to add diagnostic event
  const addDiagnosticEvent = useCallback(
    (type: DiagnosticEvent["type"], data: Record<string, unknown>) => {
      const event: DiagnosticEvent = {
        id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
        type,
        data,
      };
      setDiagnostics((prev) => ({
        ...prev,
        events: [...prev.events, event],
        totalChunks: type === "chunk" ? prev.totalChunks + 1 : prev.totalChunks,
        model: (data.model as string) || prev.model,
        spaceId: (data.spaceId as string) || prev.spaceId,
        errors:
          type === "error"
            ? [...prev.errors, data.message as string]
            : prev.errors,
      }));
    },
    []
  );

  // Clear diagnostics when starting new message
  const clearDiagnostics = useCallback(() => {
    setDiagnostics({ events: [], totalChunks: 0, errors: [] });
  }, []);

  // Stable error handler
  const onError = useCallback((err: Error) => {
    console.error("[Playground] Chat error:", err);
    setError(err.message);
  }, []);

  // Track agent sequence for message splitting
  const agentSequenceRef = useRef<string[]>([]);

  // Callback when chat finishes
  const onFinish = useCallback((message: XChatMessage) => {
    console.log("[Playground] Response received:", message.id);
    // Reset agent sequence for next message
    agentSequenceRef.current = [];
  }, []);

  // Memoize metadata to include chatMode
  const metadata = useMemo(
    () => ({
      source: "playground",
      chatMode,
    }),
    [chatMode]
  );

  // Create diagnostic transport that wraps XChatTransport and logs events
  const transport = useMemo(() => {
    const baseTransport = new XChatTransport({ api: "/api/xchat/" });

    // Wrap the transport to intercept streaming data
    const originalProcess =
      baseTransport.processResponseStream.bind(baseTransport);
    baseTransport.processResponseStream = (
      stream: ReadableStream<Uint8Array>
    ) => {
      // Create a tee to read the stream for diagnostics while passing it through
      const [diagnosticStream, passThrough] = stream.tee();

      // Read diagnostic stream in background
      (async () => {
        const reader = diagnosticStream.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Parse SSE events
            let idx: number;
            while ((idx = buffer.indexOf("\n\n")) !== -1) {
              const chunk = buffer.slice(0, idx).trim();
              buffer = buffer.slice(idx + 2);

              if (chunk.startsWith("data:")) {
                try {
                  const json = JSON.parse(chunk.slice(5).trim());
                  // Extract model info from text-start
                  if (json.type === "text-start" && json.metadata?.model) {
                    addDiagnosticEvent("stream-start", {
                      model: json.metadata.model,
                      chatMode: json.metadata.chatMode,
                      spaceId: json.metadata.spaceId,
                      agentName: json.metadata.agentName,
                    });
                  }

                  // Capture orchestration decisions
                  if (
                    json.type === "message-metadata" &&
                    json.metadata?.orchestration
                  ) {
                    addDiagnosticEvent("orchestration", {
                      needsPlan: json.metadata.orchestration.needsPlan,
                      reasoning: json.metadata.orchestration.reasoning,
                      availableAgents:
                        json.metadata.orchestration.availableAgents?.join(", "),
                      taskCount:
                        json.metadata.orchestration.suggestedTasks?.length || 0,
                      suggestedTasks:
                        json.metadata.orchestration.suggestedTasks,
                    });
                  }

                  // Capture delegation events
                  if (
                    json.type === "message-metadata" &&
                    json.metadata?.delegation
                  ) {
                    addDiagnosticEvent("delegation", {
                      taskId: json.metadata.delegation.taskId,
                      taskTitle: json.metadata.delegation.taskTitle,
                      agentId: json.metadata.delegation.agentId,
                      agentName: json.metadata.delegation.agentName,
                      status: json.metadata.delegation.status,
                      result: json.metadata.delegation.result,
                      error: json.metadata.delegation.error,
                      warnings: json.metadata.delegation.warnings,
                      configuredTools: json.metadata.delegation.configuredTools,
                      loadedToolCount: json.metadata.delegation.loadedToolCount,
                    });
                  }

                  // Capture LLM call events for observability
                  if (
                    json.type === "message-metadata" &&
                    json.metadata?.llmCall
                  ) {
                    addDiagnosticEvent("llm-call", {
                      id: json.metadata.llmCall.id,
                      status: json.metadata.llmCall.status,
                      model: json.metadata.llmCall.model,
                      agentId: json.metadata.llmCall.agentId,
                      agentName: json.metadata.llmCall.agentName,
                      purpose: json.metadata.llmCall.purpose,
                      userMessagePreview:
                        json.metadata.llmCall.userMessagePreview,
                      responsePreview: json.metadata.llmCall.responsePreview,
                      durationMs: json.metadata.llmCall.durationMs,
                      error: json.metadata.llmCall.error,
                    });
                  }

                  // Capture agent boundaries for message splitting
                  if (json.type === "data-agent" && json.data) {
                    const agentId = json.data.agentId;
                    console.log("[Playground] Agent detected:", agentId);
                    agentSequenceRef.current.push(agentId);
                    addDiagnosticEvent("agent-boundary", {
                      agentId,
                      messageId: json.data.messageId,
                      sequence: agentSequenceRef.current.length,
                    });
                  }

                  // Log regular chunks (but not text-start since we handle it above)
                  if (json.type !== "text-start") {
                    addDiagnosticEvent("chunk", {
                      chunkType: json.type,
                      content: json.delta || json.text || json.textDelta,
                      metadata: json.metadata,
                      toolName: json.toolName,
                      toolCallId: json.toolCallId,
                    });
                  }
                } catch {
                  // Ignore parse errors
                }
              }
            }
          }
          addDiagnosticEvent("stream-end", {
            totalChunks: diagnostics.totalChunks,
          });
        } catch (err) {
          addDiagnosticEvent("error", { message: String(err) });
        }
      })();

      return originalProcess(passThrough);
    };

    return baseTransport;
  }, [addDiagnosticEvent, diagnostics.totalChunks]);

  // Use VibeX chat hook - connects to real /api/chat endpoint
  const chat = useXChat({
    spaceId: "playground",
    agentId,
    metadata,
    transport,
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

      // Clear previous diagnostics and log request
      clearDiagnostics();
      addDiagnosticEvent("request", {
        message: content.slice(0, 100),
        chatMode,
        agentId,
        timestamp: Date.now(),
      });

      console.log("[Playground] Sending message:", content.slice(0, 50));

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
        const errorMsg =
          err instanceof Error ? err.message : "Failed to send message";
        setError(errorMsg);
        addDiagnosticEvent("error", { message: errorMsg });
      }
    },
    [chat, chatMode, agentId, clearDiagnostics, addDiagnosticEvent]
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
    [chat, setError]
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
    agentId,
    setAgentId,

    // Actions
    sendMessage,
    stop: chat.stop,
    reload: chat.reload,
    resetSpace,

    // Error state
    error,
    clearError: () => setError(null),

    // Diagnostics - shows complete backend data flow
    diagnostics,
    clearDiagnostics,
  };
}

// Re-export types for convenience
export type { XChatMessage };
