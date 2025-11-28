/**
 * VibeX Unified State Store
 *
 * Single source of truth for all VibeX state using Zustand.
 * Provides reactive state management with automatic synchronization.
 */

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type {
  SpaceType,
  ArtifactType,
  ConversationType,
  AgentType,
  ToolType,
} from "@vibex/core";
import { getSpaceManager } from "./manager";

interface XState {
  // Spaces
  spaces: Map<string, SpaceType>;
  currentSpaceId: string | null;

  // Artifacts (indexed by spaceId)
  artifacts: Map<string, ArtifactType[]>;

  // Conversations (indexed by spaceId)
  conversations: Map<string, ConversationType[]>;

  // Agents and Tools (global)
  agents: AgentType[];
  tools: ToolType[];

  // Loading states
  loading: {
    spaces: boolean;
    artifacts: Record<string, boolean>;
    conversations: Record<string, boolean>;
    agents: boolean;
    tools: boolean;
  };

  // Error states
  errors: {
    spaces: Error | null;
    artifacts: Record<string, Error | null>;
    conversations: Record<string, Error | null>;
    agents: Error | null;
    tools: Error | null;
  };

  // Actions
  setSpaces: (spaces: SpaceType[]) => void;
  setSpace: (space: SpaceType) => void;
  removeSpace: (spaceId: string) => void;
  setCurrentSpaceId: (spaceId: string | null) => void;

  setArtifacts: (spaceId: string, artifacts: ArtifactType[]) => void;
  addArtifact: (spaceId: string, artifact: ArtifactType) => void;
  updateArtifact: (
    spaceId: string,
    artifactId: string,
    updates: Partial<ArtifactType>
  ) => void;
  removeArtifact: (spaceId: string, artifactId: string) => void;

  setConversations: (
    spaceId: string,
    conversations: ConversationType[]
  ) => void;
  addConversation: (spaceId: string, conversation: ConversationType) => void;
  updateConversation: (
    spaceId: string,
    conversationId: string,
    updates: Partial<ConversationType>
  ) => void;
  removeConversation: (spaceId: string, conversationId: string) => void;

  setAgents: (agents: AgentType[]) => void;
  setTools: (tools: ToolType[]) => void;

  setLoading: (key: string, value: boolean) => void;
  setError: (key: string, error: Error | null) => void;

  // Sync actions (sync with SpaceManager)
  syncSpaces: () => Promise<void>;
  syncArtifacts: (spaceId: string) => Promise<void>;
  syncConversations: (spaceId: string) => Promise<void>;
  syncAgents: () => Promise<void>;
  syncTools: () => Promise<void>;
}

export const useXStore = create<XState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    spaces: new Map(),
    currentSpaceId: null,
    artifacts: new Map(),
    conversations: new Map(),
    agents: [],
    tools: [],

    loading: {
      spaces: false,
      artifacts: {},
      conversations: {},
      agents: false,
      tools: false,
    },

    errors: {
      spaces: null,
      artifacts: {},
      conversations: {},
      agents: null,
      tools: null,
    },

    // Space actions
    setSpaces: (spaces) => {
      const spacesMap = new Map<string, SpaceType>();
      spaces.forEach((space) => {
        spacesMap.set(space.id, space);
      });
      set({ spaces: spacesMap });
    },

    setSpace: (space) => {
      set((state) => {
        const newSpaces = new Map(state.spaces);
        newSpaces.set(space.id, space);
        return { spaces: newSpaces };
      });
    },

    removeSpace: (spaceId) => {
      set((state) => {
        const newSpaces = new Map(state.spaces);
        newSpaces.delete(spaceId);
        const newArtifacts = new Map(state.artifacts);
        newArtifacts.delete(spaceId);
        const newConversations = new Map(state.conversations);
        newConversations.delete(spaceId);
        return {
          spaces: newSpaces,
          artifacts: newArtifacts,
          conversations: newConversations,
          currentSpaceId:
            state.currentSpaceId === spaceId ? null : state.currentSpaceId,
        };
      });
    },

    setCurrentSpaceId: (spaceId) => {
      set({ currentSpaceId: spaceId });
    },

    // Artifact actions
    setArtifacts: (spaceId, artifacts) => {
      set((state) => {
        const newArtifacts = new Map(state.artifacts);
        newArtifacts.set(spaceId, artifacts);
        return { artifacts: newArtifacts };
      });
    },

    addArtifact: (spaceId, artifact) => {
      set((state) => {
        const newArtifacts = new Map(state.artifacts);
        const existing = newArtifacts.get(spaceId) || [];
        newArtifacts.set(spaceId, [...existing, artifact]);
        return { artifacts: newArtifacts };
      });
    },

    updateArtifact: (spaceId, artifactId, updates) => {
      set((state) => {
        const newArtifacts = new Map(state.artifacts);
        const existing = newArtifacts.get(spaceId) || [];
        const updated = existing.map((a) =>
          a.id === artifactId ? { ...a, ...updates } : a
        );
        newArtifacts.set(spaceId, updated);
        return { artifacts: newArtifacts };
      });
    },

    removeArtifact: (spaceId, artifactId) => {
      set((state) => {
        const newArtifacts = new Map(state.artifacts);
        const existing = newArtifacts.get(spaceId) || [];
        const filtered = existing.filter((a) => a.id !== artifactId);
        newArtifacts.set(spaceId, filtered);
        return { artifacts: newArtifacts };
      });
    },

    // Conversation actions
    setConversations: (spaceId, conversations) => {
      set((state) => {
        const newConversations = new Map(state.conversations);
        newConversations.set(spaceId, conversations);
        return { conversations: newConversations };
      });
    },

    addConversation: (spaceId, conversation) => {
      set((state) => {
        const newConversations = new Map(state.conversations);
        const existing = newConversations.get(spaceId) || [];
        newConversations.set(spaceId, [...existing, conversation]);
        return { conversations: newConversations };
      });
    },

    updateConversation: (spaceId, conversationId, updates) => {
      set((state) => {
        const newConversations = new Map(state.conversations);
        const existing = newConversations.get(spaceId) || [];
        const updated = existing.map((c) =>
          c.id === conversationId ? { ...c, ...updates } : c
        );
        newConversations.set(spaceId, updated);
        return { conversations: newConversations };
      });
    },

    removeConversation: (spaceId, conversationId) => {
      set((state) => {
        const newConversations = new Map(state.conversations);
        const existing = newConversations.get(spaceId) || [];
        const filtered = existing.filter((c) => c.id !== conversationId);
        newConversations.set(spaceId, filtered);
        return { conversations: newConversations };
      });
    },

    // Agent and Tool actions
    setAgents: (agents) => {
      set({ agents });
    },

    setTools: (tools) => {
      set({ tools });
    },

    // Loading and error actions
    setLoading: (key, value) => {
      set((state) => {
        const [category, subKey] = key.split(":");
        if (subKey) {
          // Nested key like "artifacts:spaceId"
          return {
            loading: {
              ...state.loading,
              [category]: {
                ...((state.loading[
                  category as keyof typeof state.loading
                ] as Record<string, boolean>) || {}),
                [subKey]: value,
              },
            },
          };
        } else {
          // Top-level key
          return {
            loading: {
              ...state.loading,
              [key]: value,
            },
          };
        }
      });
    },

    setError: (key, error) => {
      set((state) => {
        const [category, subKey] = key.split(":");
        if (subKey) {
          // Nested key like "artifacts:spaceId"
          return {
            errors: {
              ...state.errors,
              [category]: {
                ...((state.errors[
                  category as keyof typeof state.errors
                ] as Record<string, Error | null>) || {}),
                [subKey]: error,
              },
            },
          };
        } else {
          // Top-level key
          return {
            errors: {
              ...state.errors,
              [key]: error,
            },
          };
        }
      });
    },

    // Sync actions
    syncSpaces: async () => {
      const manager = getSpaceManager();
      set({ loading: { ...get().loading, spaces: true } });
      try {
        const spaces = await manager.listSpaces();
        get().setSpaces(spaces);
        set({
          loading: { ...get().loading, spaces: false },
          errors: { ...get().errors, spaces: null },
        });
      } catch (error) {
        set({
          loading: { ...get().loading, spaces: false },
          errors: {
            ...get().errors,
            spaces: error instanceof Error ? error : new Error(String(error)),
          },
        });
      }
    },

    syncArtifacts: async (spaceId) => {
      const manager = getSpaceManager();
      set((state) => ({
        loading: {
          ...state.loading,
          artifacts: { ...state.loading.artifacts, [spaceId]: true },
        },
      }));
      try {
        const artifacts = await manager.getArtifacts(spaceId);
        get().setArtifacts(spaceId, artifacts);
        set((state) => ({
          loading: {
            ...state.loading,
            artifacts: { ...state.loading.artifacts, [spaceId]: false },
          },
          errors: {
            ...state.errors,
            artifacts: { ...state.errors.artifacts, [spaceId]: null },
          },
        }));
      } catch (error) {
        set((state) => ({
          loading: {
            ...state.loading,
            artifacts: { ...state.loading.artifacts, [spaceId]: false },
          },
          errors: {
            ...state.errors,
            artifacts: {
              ...state.errors.artifacts,
              [spaceId]:
                error instanceof Error ? error : new Error(String(error)),
            },
          },
        }));
      }
    },

    syncConversations: async (spaceId) => {
      const manager = getSpaceManager();
      set((state) => ({
        loading: {
          ...state.loading,
          conversations: { ...state.loading.conversations, [spaceId]: true },
        },
      }));
      try {
        const conversations = await manager.getConversations(spaceId);
        get().setConversations(spaceId, conversations);
        set((state) => ({
          loading: {
            ...state.loading,
            conversations: { ...state.loading.conversations, [spaceId]: false },
          },
          errors: {
            ...state.errors,
            conversations: { ...state.errors.conversations, [spaceId]: null },
          },
        }));
      } catch (error) {
        set((state) => ({
          loading: {
            ...state.loading,
            conversations: { ...state.loading.conversations, [spaceId]: false },
          },
          errors: {
            ...state.errors,
            conversations: {
              ...state.errors.conversations,
              [spaceId]:
                error instanceof Error ? error : new Error(String(error)),
            },
          },
        }));
      }
    },

    syncAgents: async () => {
      const manager = getSpaceManager();
      set({ loading: { ...get().loading, agents: true } });
      try {
        const agents = await manager.getAgents();
        get().setAgents(agents);
        set({
          loading: { ...get().loading, agents: false },
          errors: { ...get().errors, agents: null },
        });
      } catch (error) {
        set({
          loading: { ...get().loading, agents: false },
          errors: {
            ...get().errors,
            agents: error instanceof Error ? error : new Error(String(error)),
          },
        });
      }
    },

    syncTools: async () => {
      const manager = getSpaceManager();
      set({ loading: { ...get().loading, tools: true } });
      try {
        const tools = await manager.getTools();
        get().setTools(tools);
        set({
          loading: { ...get().loading, tools: false },
          errors: { ...get().errors, tools: null },
        });
      } catch (error) {
        set({
          loading: { ...get().loading, tools: false },
          errors: {
            ...get().errors,
            tools: error instanceof Error ? error : new Error(String(error)),
          },
        });
      }
    },
  }))
);

// Selector hooks for optimized re-renders
export const useXSpaces = () =>
  useXStore((state) => Array.from(state.spaces.values()));
export const useXCurrentSpace = () => {
  const currentSpaceId = useXStore((state) => state.currentSpaceId);
  const spaces = useXStore((state) => state.spaces);
  return currentSpaceId ? spaces.get(currentSpaceId) || null : null;
};
export const useXArtifacts = (spaceId: string | null | undefined) =>
  useXStore((state) => (spaceId ? state.artifacts.get(spaceId) || [] : []));
export const useXConversations = (spaceId: string | null | undefined) =>
  useXStore((state) =>
    spaceId ? state.conversations.get(spaceId) || [] : []
  );
