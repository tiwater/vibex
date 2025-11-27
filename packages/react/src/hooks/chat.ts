import { useChat } from '@ai-sdk/react';
import type { UseChatOptions, UseChatHelpers } from '@ai-sdk/react';
import { useMemo } from 'react';

export interface UseVibexChatOptions extends Omit<UseChatOptions, 'body'> {
  spaceId: string;
  agentId?: string;
  metadata?: Record<string, any>;
}

export function useVibexChat({
  spaceId,
  agentId,
  metadata,
  ...options
}: UseVibexChatOptions): UseChatHelpers & {
  // Add any Vibex-specific extensions here if needed
} {
  // Memoize the body to prevent unnecessary re-renders
  const body = useMemo(() => ({
    spaceId,
    agentId,
    metadata: {
      ...metadata,
      mode: agentId ? 'agent' : 'chat',
      requestedAgent: agentId,
    },
  }), [spaceId, agentId, JSON.stringify(metadata)]);

  const chat = useChat({
    ...options,
    body,
    // Default to the standard Vibex API endpoint
    api: options.api ?? '/api/chat',
  });

  return {
    ...chat,
    // Add any Vibex-specific helpers here if needed
  };
}
