import { useChat } from "@ai-sdk/react";
import type { UseChatOptions, UseChatHelpers } from "@ai-sdk/react";
import { useMemo } from "react";

export interface UseVibexChatOptions extends Omit<UseChatOptions, "body"> {
  spaceId: string;
  agentId?: string;
  metadata?: Record<string, unknown>;
}

export function useVibexChat({
  spaceId,
  agentId,
  metadata,
  ...options
}: UseVibexChatOptions): UseChatHelpers {
  // Memoize the body to prevent unnecessary re-renders
  const body = useMemo(
    () => ({
      spaceId,
      agentId,
      metadata: {
        ...metadata,
        mode: agentId ? "agent" : "chat",
        requestedAgent: agentId,
      },
    }),
    [spaceId, agentId, JSON.stringify(metadata)]
  );

  const chat = useChat({
    ...options,
    body,
    api: options.api ?? "/api/chat",
  });

  return chat;
}
