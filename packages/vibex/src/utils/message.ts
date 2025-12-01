import { XMessage, Message } from "../types/message";

/**
 * Get text content from a message
 */
export function getTextContent(message: Message): string {
  if (!message || !message.content) {
    return "";
  }

  if (typeof message.content === "string") {
    return message.content;
  }

  if (Array.isArray(message.content)) {
    return message.content
      .filter((part: any) => part && part.type === "text")
      .map((part: any) => part.text || "")
      .join(" ");
  }

  return "";
}

/**
 * Get text content from an XChatMessage (client-side message format)
 * This is used in API routes to extract text from client messages
 */
export function getTextFromXChatMessage(msg: {
  content?: string;
  parts?: Array<{
    type: string;
    text?: string;
  }>;
}): string {
  if (!msg) {
    return "";
  }
  if (msg.parts && Array.isArray(msg.parts) && msg.parts.length > 0) {
    const textParts = msg.parts
      .filter(
        (p): p is { type: "text"; text: string } =>
          p.type === "text" && p.text != null && typeof p.text === "string"
      )
      .map((p) => p.text || "")
      .filter((text) => text && text.length > 0);
    if (textParts.length > 0) {
      return textParts.join("");
    }
  }
  return msg.content && typeof msg.content === "string" ? msg.content : "";
}

/**
 * Convert XChatMessage (from @vibex/react) to XMessage (server-side)
 * This is used in API routes to convert client messages to server format
 */
export function fromXChatMessage(msg: {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  parts?: Array<{
    type: string;
    text?: string;
    toolCallId?: string;
    toolName?: string;
    args?: Record<string, unknown>;
    result?: unknown;
    artifactId?: string;
    title?: string;
    version?: number;
  }>;
  createdAt?: Date;
  agentName?: string;
  metadata?: Record<string, unknown>;
}): XMessage {
  // Convert XChatMessage (client-side) to XMessage (server-side)
  // If parts exist, convert them to content array format
  let content: any = msg.content || "";

  // If parts exist, convert to content array format for vibex compatibility
  if (msg.parts && msg.parts.length > 0) {
    content = msg.parts.map((part) => {
      if (part.type === "text") {
        return { type: "text", text: part.text };
      } else if (part.type === "tool-call") {
        return {
          type: "tool-call",
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          args: part.args || {},
        };
      } else if (part.type === "tool-result") {
        return {
          type: "tool-result",
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          result: part.result,
        };
      } else if (part.type === "artifact") {
        return {
          type: "artifact",
          artifactId: part.artifactId,
          title: part.title,
          version: part.version,
        };
      } else if (part.type === "reasoning") {
        return {
          type: "reasoning",
          text: part.text,
        };
      }
      return { type: "text", text: "" };
    });
  }

  return {
    id: msg.id,
    role: msg.role as any,
    content, // Always present
    metadata: {
      ...msg.metadata,
      // Add timestamp if createdAt is available
      ...(msg.createdAt && { timestamp: msg.createdAt.getTime() }),
      // Add agentName if available
      ...(msg.agentName && { agentName: msg.agentName }),
    },
  };
}
