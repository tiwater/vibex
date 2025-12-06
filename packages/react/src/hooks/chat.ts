import { useChat, type UIMessage } from "@ai-sdk/react";
import { useState, useMemo, useCallback } from "react";
import type {
  XChatMessage,
  XChatState,
  CreateXMessage,
  XChatStatus,
} from "../types";
import { DefaultChatTransport, type ChatTransport } from "ai";

export interface UseXChatOptions {
  /** The space ID to associate messages with */
  spaceId: string;
  /** Optional agent ID to route messages to */
  agentId?: string;
  /** Optional metadata to include with each request */
  metadata?: Record<string, unknown>;
  /** API endpoint (defaults to /api/chat) */
  api?: string;
  /** Optional custom transport (defaults to DefaultChatTransport) */
  transport?: ChatTransport<UIMessage>;
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
    } else if (part.type === "tool-call") {
      // Handle tool call parts (AI SDK v6)
      const toolPart = part as {
        type: string;
        toolCallId?: string;
        toolName?: string;
        args?: unknown;
        state?: string;
      };

      console.log("[uiMessageToX] Processing tool-call part:", {
        toolName: toolPart.toolName,
        toolCallId: toolPart.toolCallId,
        state: toolPart.state,
      });

      if (toolPart.toolName) {
        // Map AI SDK states to our status
        let status:
          | "pending"
          | "running"
          | "completed"
          | "failed"
          | "pending-approval"
          | undefined = "running";
        if (toolPart.state === "result") status = "completed";
        else if (toolPart.state === "call") status = "running";
        else if (toolPart.state === "error") status = "failed";

        xParts.push({
          type: "tool-call",
          toolCallId:
            toolPart.toolCallId || `tool-${Date.now()}-${Math.random()}`,
          toolName: toolPart.toolName,
          args: (toolPart.args as Record<string, unknown>) || {},
          status,
        });
      }
    } else if (part.type === "tool-result") {
      // Handle tool result parts (AI SDK v6)
      const toolResultPart = part as {
        type: string;
        toolCallId?: string;
        toolName?: string;
        result?: unknown;
        isError?: boolean;
      };
      if (toolResultPart.toolCallId) {
        xParts.push({
          type: "tool-result",
          toolCallId: toolResultPart.toolCallId,
          toolName: toolResultPart.toolName || "unknown",
          result:
            typeof toolResultPart.result === "string"
              ? toolResultPart.result
              : JSON.stringify(toolResultPart.result, null, 2),
        });
      }
    } else if (part.type === "reasoning") {
      // Handle reasoning parts (AI SDK v6)
      const reasoningPart = part as {
        type: "reasoning";
        text: string;
        details?: unknown;
      };
      xParts.push({
        type: "reasoning",
        text: reasoningPart.text,
      });
    } else if (part.type.startsWith("data-")) {
      // Handle custom data parts (e.g., delegation events, tool calls)
      // AI SDK v6 uses "data-${string}" format, e.g., "data-delegation", "data-tool-call"
      const dataPart = part as { type: string; data?: unknown };
      if (dataPart.data && typeof dataPart.data === "object") {
        const data = dataPart.data as Record<string, unknown>;
        if (data.type === "delegation") {
          // Format delegation event as text for visibility
          const status = data.status as string;
          const taskTitle = data.taskTitle as string;
          const agentName = data.agentName as string;
          const artifactId = data.artifactId as string | undefined;
          const error = data.error as string | undefined;
          const result = data.result as string | undefined;

          let delegationText = "";
          if (status === "started") {
            delegationText = `🔄 **Delegated** "${taskTitle}" to **${agentName}**\n\n`;
          } else if (status === "completed") {
            delegationText = `✅ **${agentName}** completed "${taskTitle}"\n`;
            if (artifactId) {
              delegationText += `   📄 Created artifact: ${artifactId}\n`;
            }
            if (result) {
              // Show the FULL result - no truncation
              delegationText += `\n${result}\n`;
            }
            delegationText += "\n";
          } else if (status === "failed") {
            delegationText = `❌ **${agentName}** failed on "${taskTitle}": ${error || "Unknown error"}\n\n`;
          }

          if (delegationText) {
            xParts.push({ type: "text", text: delegationText });
          }
        } else if (data.type === "tool-call") {
          // Convert data-tool-call to tool-call part (result comes separately as data-tool-result)
          const toolName = data.toolName as string;
          const args = data.args as Record<string, unknown> | undefined;
          const toolCallId =
            (data.toolCallId as string) ||
            `tool-${Date.now()}-${Math.random()}`;

          console.log(
            `[Chat] Parsed tool-call: ${toolName} (id: ${toolCallId})`
          );

          // Add tool-call part (without result - result comes as separate data-tool-result)
          xParts.push({
            type: "tool-call",
            toolCallId,
            toolName,
            args: args || {},
            status: "running", // Will be updated when tool-result arrives
          });
        } else if (data.type === "artifact") {
          // Handle artifact parts from data-artifact
          const artifactId = data.artifactId as string;
          const title = data.title as string | undefined;
          const version = data.version as number | undefined;

          if (artifactId) {
            xParts.push({
              type: "artifact",
              artifactId,
              title: title || artifactId,
              version: version || 1,
            });
          }
        } else if (
          data.type === "text-delta" ||
          data.type === "data-text-delta"
        ) {
          // Handle standard text delta from our API
          const textDelta = data.delta as string;
          if (textDelta) {
            // Check if the last part is also an agent-text part for the default agent
            const lastPart = xParts[xParts.length - 1];
            const defaultAgentId = "assistant"; // Or derive from metadata if available

            if (
              lastPart &&
              lastPart.type === "agent-text" &&
              lastPart.agentId === defaultAgentId
            ) {
              lastPart.text += textDelta;
            } else {
              xParts.push({
                type: "agent-text",
                agentId: defaultAgentId,
                text: textDelta,
              });
            }
          }
        } else if (
          data.type === "agent-text-delta" ||
          data.type === "data-agent-text-delta"
        ) {
          // Handle agent text delta
          const agentId = data.agentId as string;
          const textDelta = data.textDelta as string;
          const taskId = data.taskId as string | undefined;

          if (agentId && textDelta) {
            // Check if the last part is also an agent-text part for the same agent
            const lastPart = xParts[xParts.length - 1];
            if (
              lastPart &&
              lastPart.type === "agent-text" &&
              lastPart.agentId === agentId &&
              lastPart.taskId === taskId
            ) {
              // Merge with previous part
              lastPart.text += textDelta;
            } else {
              // Create new part
              xParts.push({
                type: "agent-text",
                agentId,
                text: textDelta,
                taskId,
              });
            }
          }
        } else if (data.type === "tool-result") {
          // Handle data-tool-result separately (in case it comes without tool-call)
          const toolResultPart = data as {
            toolCallId?: string;
            toolName?: string;
            result?: unknown;
          };
          if (toolResultPart.toolCallId) {
            xParts.push({
              type: "tool-result",
              toolCallId: toolResultPart.toolCallId,
              toolName: toolResultPart.toolName || "unknown",
              result:
                typeof toolResultPart.result === "string"
                  ? toolResultPart.result
                  : JSON.stringify(toolResultPart.result, null, 2),
            });
            console.log(
              `[Chat] Parsed tool-result: ${toolResultPart.toolName} (id: ${toolResultPart.toolCallId})`
            );
          }
        }
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
          } else if (part.type === "tool-call") {
            return {
              type: "tool-call",
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              args: part.args,
            } as any;
          } else if (part.type === "tool-result") {
            return {
              type: "tool-result",
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              result: part.result,
            } as any;
          }
          // Fallback for unknown parts
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
  api = "/api/chat/",
  transport: customTransport,
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
  }, [initialMessages]);

  // Use the AI SDK's useChat hook
  const chat = useChat({
    // Custom transport if provided, otherwise create default with API
    transport:
      customTransport ||
      new DefaultChatTransport({
        api,
      }),
    // Initial messages
    messages: uiInitialMessages,
    // Error handler
    onError,
    // Finish handler
    onFinish: onFinish
      ? ({ message }: { message: UIMessage }) => {
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

  // Wrap sendMessage to use X types and include latest metadata
  const append = useCallback(
    async (message: CreateXMessage) => {
      // Create metadata with the LATEST chatMode (not the one from transport creation)
      const currentMetadata = {
        ...metadata,
        chatMode: metadata?.chatMode, // Use current chatMode from state
      };

      console.log("[useXChat] Sending message with metadata:", {
        chatMode: currentMetadata.chatMode,
        spaceId,
        agentId,
      });

      // v6 uses sendMessage with parts and optional request options
      await chat.sendMessage(
        {
          role: message.role,
          parts: [{ type: "text" as const, text: message.content }],
        },
        {
          // Pass current metadata in request body
          body: {
            spaceId,
            agentId,
            metadata: currentMetadata,
          },
        }
      );
      setInput(""); // Clear input after sending
    },
    [chat, metadata, spaceId, agentId] // Include metadata in dependencies
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
