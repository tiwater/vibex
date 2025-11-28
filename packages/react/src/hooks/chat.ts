import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useMemo, useCallback } from "react";
import type {
  XChatMessage,
  XChatState,
  CreateXMessage,
  XChatStatus,
} from "../types";

export interface UseXChatOptions {
  /** The space ID to associate messages with */
  spaceId: string;
  /** Optional agent ID to route messages to */
  agentId?: string;
  /** Optional metadata to include with each request */
  metadata?: Record<string, unknown>;
  /** API endpoint (defaults to /api/chat) */
  api?: string;
  /** Initial messages to populate the chat */
  initialMessages?: XChatMessage[];
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
  /** Callback when generation finishes */
  onFinish?: (message: XChatMessage) => void;
}

/**
 * Convert AI SDK UIMessage to XChatMessage
 * Extracts metadata including agent information from the message
 */
function uiMessageToX(msg: UIMessage): XChatMessage {
  // Extract text content from parts
  const textContent = msg.parts
    .filter(
      (part): part is { type: "text"; text: string } => part.type === "text"
    )
    .map((part) => part.text)
    .join("");

  // Extract metadata - it may contain agent information
  const metadata = msg.metadata as Record<string, unknown> | undefined;

  // Extract agentName from metadata (sent by our API via messageMetadata)
  const agentName =
    (metadata?.agentName as string | undefined) ||
    (msg.role === "assistant" ? "Assistant" : undefined);

  // Convert parts
  const xParts: XChatMessage["parts"] = [];

  for (const part of msg.parts) {
    if (part.type === "text" && part.text) {
      xParts.push({ type: "text", text: part.text });
    } else if (part.type.startsWith("tool-")) {
      // Handle tool invocations (AI SDK v6 uses tool-* types)
      const toolPart = part as {
        type: string;
        toolCallId?: string;
        toolName?: string;
        args?: unknown;
        state?: string;
      };
      if (toolPart.toolName) {
        // Map AI SDK states to our status
        let status:
          | "pending"
          | "running"
          | "completed"
          | "failed"
          | "pending-approval"
          | undefined = "pending";
        if (toolPart.state === "result") status = "completed";
        else if (toolPart.state === "call") status = "running";
        else if (toolPart.state === "error") status = "failed";

        xParts.push({
          type: "tool-call",
          toolCallId: toolPart.toolCallId || "unknown",
          toolName: toolPart.toolName,
          args: (toolPart.args as Record<string, unknown>) || {},
          status,
        });
      }
    }
  }

  return {
    id: msg.id,
    role: msg.role as "user" | "assistant" | "system",
    content: textContent,
    parts: xParts.length > 0 ? xParts : undefined,
    createdAt: metadata?.startedAt
      ? new Date(metadata.startedAt as number)
      : undefined,
    agentName,
    metadata,
  };
}

/**
 * Convert XChatMessage to AI SDK UIMessage format
 */
function xToUiMessage(msg: XChatMessage): UIMessage {
  return {
    id: msg.id,
    role: msg.role,
    parts: msg.parts
      ? msg.parts.map((part) => {
          if (part.type === "text") {
            return { type: "text" as const, text: part.text };
          }
          return { type: "text" as const, text: "" };
        })
      : [{ type: "text" as const, text: msg.content }],
    metadata: msg.metadata,
  };
}

/**
 * React hook for chat interactions with X agents
 *
 * @example
 * ```tsx
 * const {
 *   messages,
 *   input,
 *   setInput,
 *   append,
 *   status,
 *   isLoading
 * } = useXChat({
 *   spaceId: "my-space",
 *   agentId: "researcher",
 * });
 * ```
 */
export function useXChat({
  spaceId,
  agentId,
  metadata,
  api = "/api/chat",
  initialMessages,
  onError,
  onFinish,
}: UseXChatOptions): XChatState {
  // Manage input state locally (v6 style)
  const [input, setInput] = useState("");

  // Convert initial messages
  const uiInitialMessages = useMemo(() => {
    if (!initialMessages) return undefined;
    return initialMessages.map(xToUiMessage);
  }, []);

  // Create transport with custom body for spaceId, agentId, metadata
  const transport = useMemo(() => {
    return new DefaultChatTransport({
      api,
      body: {
        spaceId,
        agentId,
        metadata: {
          ...metadata,
          mode: agentId ? "agent" : "chat",
          requestedAgent: agentId,
        },
      },
    });
  }, [api, spaceId, agentId, metadata]);

  // Use the AI SDK's useChat hook
  const chat = useChat({
    // Pass initial messages
    messages: uiInitialMessages,
    // Transport for API communication
    transport,
    // Error handler
    onError,
    // Finish handler
    onFinish: onFinish
      ? ({ message }) => {
          onFinish(uiMessageToX(message));
        }
      : undefined,
  });

  // Convert messages to X format
  const messages: XChatMessage[] = useMemo(() => {
    return chat.messages.map(uiMessageToX);
  }, [chat.messages]);

  // Map status - v6 uses `status` property
  const status = useMemo((): XChatStatus => {
    if (chat.status === "streaming") return "streaming";
    if (chat.status === "submitted") return "submitted";
    if (chat.status === "error") return "error";
    return "idle";
  }, [chat.status]);

  // Wrap sendMessage to use X types
  const append = useCallback(
    async (message: CreateXMessage) => {
      // v6 uses sendMessage with parts
      await chat.sendMessage({
        role: message.role,
        parts: [{ type: "text" as const, text: message.content }],
      });
      setInput(""); // Clear input after sending
    },
    [chat]
  );

  // Wrap setMessages to use X types
  const setMessages = useCallback(
    (newMessages: XChatMessage[]) => {
      chat.setMessages(newMessages.map(xToUiMessage));
    },
    [chat]
  );

  // Check if loading
  const isLoading = status === "streaming" || status === "submitted";

  return {
    messages,
    input,
    setInput,
    status,
    isLoading,
    error: chat.error,
    append,
    reload: chat.regenerate,
    stop: chat.stop,
    setMessages,
  };
}
