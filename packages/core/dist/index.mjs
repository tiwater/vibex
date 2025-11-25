import {
  Agent,
  AgentCollaborationManager,
  CollaborativePlanner,
  ConversationHistory,
  MessageQueue,
  ParallelExecutionEngine,
  Plan,
  Space,
  Task,
  TaskStatus,
  VibexPaths,
  WorkflowEngine,
  XAgent,
  buildToolMap,
  clearToolCache,
  generateShortId,
  generateSpaceId,
  getCompletionTokens,
  getConfiguredProviders,
  getModelContextLimit,
  getModelProvider,
  getTextContent,
  getVibexPath,
  getVibexRoot,
  isProviderConfigured,
  parseModelString,
  startSpace,
  validateId
} from "./chunk-GTCXNRL4.mjs";
import {
  Storage
} from "./chunk-EMGYHMWF.mjs";
import {
  __publicField
} from "./chunk-QZ7TP4HQ.mjs";

// src/space/context.ts
function estimateTokenCount(text) {
  return Math.ceil(text.length / 4);
}
function calculateContextBudget(totalLimit, systemPrompt, toolsText = "", completionTokens = 4e3) {
  const systemTokens = estimateTokenCount(systemPrompt);
  const toolTokens = estimateTokenCount(toolsText);
  const overhead = 500;
  const availableForMessages = totalLimit - systemTokens - toolTokens - completionTokens - overhead;
  return {
    totalLimit,
    systemPrompt: systemTokens,
    tools: toolTokens,
    completion: completionTokens,
    overhead,
    availableForMessages
  };
}
async function compressMessages(messages, budget) {
  let totalTokens = messages.reduce(
    (sum, msg) => sum + estimateTokenCount(JSON.stringify(msg)),
    0
  );
  if (totalTokens <= budget.availableForMessages) {
    return messages;
  }
  console.log(
    `[Context] Compressing messages: ${totalTokens} tokens > ${budget.availableForMessages} budget`
  );
  if (messages.length > 10) {
    const summaryResult = await summarizeConversation(messages.slice(0, -8));
    if (summaryResult) {
      const compressedMessages = [
        {
          role: "system",
          content: `[Previous conversation summary: ${summaryResult}]`
        },
        ...messages.slice(-8)
      ];
      const newTokens = compressedMessages.reduce(
        (sum, msg) => sum + estimateTokenCount(JSON.stringify(msg)),
        0
      );
      if (newTokens <= budget.availableForMessages) {
        console.log(
          `[Context] Summarized: ${messages.length} \u2192 ${compressedMessages.length} messages`
        );
        return compressedMessages;
      }
    }
  }
  const truncated = [...messages];
  while (totalTokens > budget.availableForMessages && truncated.length > 1) {
    const indexToRemove = truncated[0].role === "system" ? 1 : 0;
    if (indexToRemove >= truncated.length) break;
    const removed = truncated.splice(indexToRemove, 1)[0];
    totalTokens -= estimateTokenCount(JSON.stringify(removed));
  }
  console.log(
    `[Context] Truncated: ${messages.length} \u2192 ${truncated.length} messages`
  );
  return truncated;
}
async function summarizeConversation(messages) {
  try {
    const keyPoints = [];
    for (const msg of messages) {
      if (msg.role === "user" && typeof msg.content === "string") {
        keyPoints.push(msg.content.substring(0, 100) + "...");
      }
    }
    return keyPoints.slice(0, 5).join("; ");
  } catch (error) {
    console.error("[Context] Summarization failed:", error);
    return null;
  }
}
function validateContext(messages, budget) {
  const messageTokens = messages.reduce(
    (sum, msg) => sum + estimateTokenCount(JSON.stringify(msg)),
    0
  );
  const totalTokens = budget.systemPrompt + messageTokens + budget.tools + budget.completion;
  if (totalTokens > budget.totalLimit * 0.95) {
    return {
      valid: false,
      reason: `Token count (${totalTokens}) exceeds 95% of limit (${budget.totalLimit})`
    };
  }
  return { valid: true };
}

// src/space/artifact.ts
import path from "path";
var ArtifactManager = class {
  constructor(spaceStorage) {
    this.spaceStorage = spaceStorage;
  }
  /**
   * Save an artifact to the space
   */
  async saveArtifact(filename, content, metadata) {
    const buffer = typeof content === "string" ? Buffer.from(content, "utf8") : content;
    const artifactPath = `artifacts/${filename}`;
    const mimeType = metadata?.mimeType || this.getMimeType(filename);
    await this.spaceStorage.saveArtifact(filename, buffer, {
      mimeType,
      size: buffer.length
    });
    return {
      name: filename,
      path: artifactPath,
      mimeType,
      size: buffer.length,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      ...metadata
    };
  }
  /**
   * Get an artifact from the space
   */
  async getArtifact(filename) {
    try {
      const artifactPath = `artifacts/${filename}`;
      const fullPath = path.join(
        this.spaceStorage.getSpacePath(),
        artifactPath
      );
      const fs2 = await import("fs/promises");
      return await fs2.readFile(fullPath);
    } catch (error) {
      console.error(
        `[ArtifactManager] Failed to get artifact ${filename}:`,
        error
      );
      return null;
    }
  }
  /**
   * List all artifacts in the space
   */
  async listArtifacts() {
    const metadata = await this.spaceStorage.getMetadata();
    return metadata?.artifacts || [];
  }
  /**
   * Delete an artifact
   */
  async deleteArtifact(filename) {
    try {
      const artifactPath = `artifacts/${filename}`;
      const fullPath = path.join(
        this.spaceStorage.getSpacePath(),
        artifactPath
      );
      const fs2 = await import("fs/promises");
      await fs2.unlink(fullPath);
      const metadata = await this.spaceStorage.getMetadata();
      if (metadata?.artifacts) {
        metadata.artifacts = metadata.artifacts.filter(
          (a) => a.name !== filename
        );
        await this.spaceStorage.saveMetadata(metadata);
      }
      return true;
    } catch (error) {
      console.error(
        `[ArtifactManager] Failed to delete artifact ${filename}:`,
        error
      );
      return false;
    }
  }
  /**
   * Get MIME type from filename
   */
  getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".xls": "application/vnd.ms-excel",
      ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".ppt": "application/vnd.ms-powerpoint",
      ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ".txt": "text/plain",
      ".md": "text/markdown",
      ".json": "application/json",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".svg": "image/svg+xml"
    };
    return mimeTypes[ext] || "application/octet-stream";
  }
};

// src/space/state.ts
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { getVibexDataManager } from "@vibex/data";
var useVibexStore = create()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    spaces: /* @__PURE__ */ new Map(),
    currentSpaceId: null,
    artifacts: /* @__PURE__ */ new Map(),
    tasks: /* @__PURE__ */ new Map(),
    agents: [],
    tools: [],
    loading: {
      spaces: false,
      artifacts: {},
      tasks: {},
      agents: false,
      tools: false
    },
    errors: {
      spaces: null,
      artifacts: {},
      tasks: {},
      agents: null,
      tools: null
    },
    // Space actions
    setSpaces: (spaces) => {
      const spacesMap = /* @__PURE__ */ new Map();
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
        const newTasks = new Map(state.tasks);
        newTasks.delete(spaceId);
        return {
          spaces: newSpaces,
          artifacts: newArtifacts,
          tasks: newTasks,
          currentSpaceId: state.currentSpaceId === spaceId ? null : state.currentSpaceId
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
        const updated = existing.map(
          (a) => a.id === artifactId ? { ...a, ...updates } : a
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
    // Task actions
    setTasks: (spaceId, tasks) => {
      set((state) => {
        const newTasks = new Map(state.tasks);
        newTasks.set(spaceId, tasks);
        return { tasks: newTasks };
      });
    },
    addTask: (spaceId, task) => {
      set((state) => {
        const newTasks = new Map(state.tasks);
        const existing = newTasks.get(spaceId) || [];
        newTasks.set(spaceId, [...existing, task]);
        return { tasks: newTasks };
      });
    },
    updateTask: (spaceId, taskId, updates) => {
      set((state) => {
        const newTasks = new Map(state.tasks);
        const existing = newTasks.get(spaceId) || [];
        const updated = existing.map(
          (t) => t.id === taskId ? { ...t, ...updates } : t
        );
        newTasks.set(spaceId, updated);
        return { tasks: newTasks };
      });
    },
    removeTask: (spaceId, taskId) => {
      set((state) => {
        const newTasks = new Map(state.tasks);
        const existing = newTasks.get(spaceId) || [];
        const filtered = existing.filter((t) => t.id !== taskId);
        newTasks.set(spaceId, filtered);
        return { tasks: newTasks };
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
          return {
            loading: {
              ...state.loading,
              [category]: {
                ...state.loading[category] || {},
                [subKey]: value
              }
            }
          };
        } else {
          return {
            loading: {
              ...state.loading,
              [key]: value
            }
          };
        }
      });
    },
    setError: (key, error) => {
      set((state) => {
        const [category, subKey] = key.split(":");
        if (subKey) {
          return {
            errors: {
              ...state.errors,
              [category]: {
                ...state.errors[category] || {},
                [subKey]: error
              }
            }
          };
        } else {
          return {
            errors: {
              ...state.errors,
              [key]: error
            }
          };
        }
      });
    },
    // Sync actions
    syncSpaces: async () => {
      const manager = getVibexDataManager();
      set({ loading: { ...get().loading, spaces: true } });
      try {
        const spaces = await manager.listSpaces();
        get().setSpaces(spaces);
        set({
          loading: { ...get().loading, spaces: false },
          errors: { ...get().errors, spaces: null }
        });
      } catch (error) {
        set({
          loading: { ...get().loading, spaces: false },
          errors: {
            ...get().errors,
            spaces: error instanceof Error ? error : new Error(String(error))
          }
        });
      }
    },
    syncArtifacts: async (spaceId) => {
      const manager = getVibexDataManager();
      set((state) => ({
        loading: {
          ...state.loading,
          artifacts: { ...state.loading.artifacts, [spaceId]: true }
        }
      }));
      try {
        const artifacts = await manager.getArtifacts(spaceId);
        get().setArtifacts(spaceId, artifacts);
        set((state) => ({
          loading: {
            ...state.loading,
            artifacts: { ...state.loading.artifacts, [spaceId]: false }
          },
          errors: {
            ...state.errors,
            artifacts: { ...state.errors.artifacts, [spaceId]: null }
          }
        }));
      } catch (error) {
        set((state) => ({
          loading: {
            ...state.loading,
            artifacts: { ...state.loading.artifacts, [spaceId]: false }
          },
          errors: {
            ...state.errors,
            artifacts: {
              ...state.errors.artifacts,
              [spaceId]: error instanceof Error ? error : new Error(String(error))
            }
          }
        }));
      }
    },
    syncTasks: async (spaceId) => {
      const manager = getVibexDataManager();
      set((state) => ({
        loading: {
          ...state.loading,
          tasks: { ...state.loading.tasks, [spaceId]: true }
        }
      }));
      try {
        const tasks = await manager.getTasks(spaceId);
        get().setTasks(spaceId, tasks);
        set((state) => ({
          loading: {
            ...state.loading,
            tasks: { ...state.loading.tasks, [spaceId]: false }
          },
          errors: {
            ...state.errors,
            tasks: { ...state.errors.tasks, [spaceId]: null }
          }
        }));
      } catch (error) {
        set((state) => ({
          loading: {
            ...state.loading,
            tasks: { ...state.loading.tasks, [spaceId]: false }
          },
          errors: {
            ...state.errors,
            tasks: {
              ...state.errors.tasks,
              [spaceId]: error instanceof Error ? error : new Error(String(error))
            }
          }
        }));
      }
    },
    syncAgents: async () => {
      const manager = getVibexDataManager();
      set({ loading: { ...get().loading, agents: true } });
      try {
        const agents = await manager.getAgents();
        get().setAgents(agents);
        set({
          loading: { ...get().loading, agents: false },
          errors: { ...get().errors, agents: null }
        });
      } catch (error) {
        set({
          loading: { ...get().loading, agents: false },
          errors: {
            ...get().errors,
            agents: error instanceof Error ? error : new Error(String(error))
          }
        });
      }
    },
    syncTools: async () => {
      const manager = getVibexDataManager();
      set({ loading: { ...get().loading, tools: true } });
      try {
        const tools = await manager.getTools();
        get().setTools(tools);
        set({
          loading: { ...get().loading, tools: false },
          errors: { ...get().errors, tools: null }
        });
      } catch (error) {
        set({
          loading: { ...get().loading, tools: false },
          errors: {
            ...get().errors,
            tools: error instanceof Error ? error : new Error(String(error))
          }
        });
      }
    }
  }))
);
var useVibexSpaces = () => useVibexStore((state) => Array.from(state.spaces.values()));
var useVibexCurrentSpace = () => {
  const currentSpaceId = useVibexStore((state) => state.currentSpaceId);
  const spaces = useVibexStore((state) => state.spaces);
  return currentSpaceId ? spaces.get(currentSpaceId) || null : null;
};
var useVibexArtifacts = (spaceId) => useVibexStore((state) => spaceId ? state.artifacts.get(spaceId) || [] : []);
var useVibexTasks = (spaceId) => useVibexStore((state) => spaceId ? state.tasks.get(spaceId) || [] : []);

// src/agent/agent-market.ts
import { getServerDataAdapter } from "@vibex/data";
var AgentMarket = class {
  /**
   * Get agent categories from hub configuration
   */
  static async getCategories() {
    try {
      const { Storage: Storage2 } = await import("./storage-JHCC3LCT.mjs");
      const defaultsStorage = await Storage2.getDefaultsStorage();
      const defaultsData = await defaultsStorage.readYaml("categories.yaml");
      const agentsCategory = defaultsData?.categories?.find(
        (c) => c.id === "agents"
      );
      if (agentsCategory?.subcategories) {
        return agentsCategory.subcategories.map((sub, index) => ({
          id: sub.id,
          name: sub.name,
          icon: sub.icon,
          order: index + 1
        }));
      }
      return this.getDefaultCategories();
    } catch (error) {
      console.warn("[AgentMarket] Failed to load categories from hub:", error);
      return this.getDefaultCategories();
    }
  }
  /**
   * Get default categories if hub config not available
   */
  static getDefaultCategories() {
    return [
      { id: "assistant", name: "\u52A9\u624B", icon: "MessageSquare", order: 1 },
      { id: "developer", name: "\u5F00\u53D1\u8005", icon: "Code", order: 2 },
      { id: "analyst", name: "\u5206\u6790\u5E08", icon: "TrendingUp", order: 3 },
      { id: "creative", name: "\u521B\u610F", icon: "Palette", order: 4 }
    ];
  }
  /**
   * Get all available agent templates from .vibex/defaults/agents/ and custom agents from config
   */
  static async getAllTemplates() {
    try {
      await this.ensureMarketInitialized();
      const { Storage: Storage2 } = await import("./storage-JHCC3LCT.mjs");
      const defaultsStorage = await Storage2.getDefaultsStorage();
      const rootStorage = await Storage2.getRootStorage();
      const templates = [];
      const defaultFiles = await defaultsStorage.list("agents");
      for (const file of defaultFiles) {
        if (file.endsWith(".yaml") || file.endsWith(".yml")) {
          try {
            const config = await defaultsStorage.readYaml(`agents/${file}`);
            if (config.promptFile) {
              try {
                const promptContent = await defaultsStorage.readTextFile(
                  `prompts/${config.promptFile}`
                );
                config.systemPrompt = promptContent;
              } catch (error) {
                console.warn(`Failed to load prompt for ${file}:`, error);
              }
            }
            templates.push({ ...config, isCustom: false });
          } catch (error) {
            console.warn(`Failed to load template ${file}:`, error);
          }
        }
      }
      try {
        const customFiles = await rootStorage.list("agents").catch(() => []);
        for (const file of customFiles) {
          if (file.endsWith(".yaml") || file.endsWith(".yml")) {
            try {
              const config = await rootStorage.readYaml(`agents/${file}`);
              const uniqueId = config.id?.startsWith("custom-") ? config.id : `custom-${config.id || file.replace(/\.(yaml|yml)$/, "")}`;
              templates.push({
                ...config,
                id: uniqueId,
                isCustom: true
              });
            } catch (error) {
              console.warn(`Failed to load custom agent ${file}:`, error);
            }
          }
        }
      } catch (error) {
        console.warn("[AgentMarket] No custom agents found:", error);
      }
      return templates;
    } catch (error) {
      console.error("[AgentMarket] Failed to load templates:", error);
      return [];
    }
  }
  /**
   * Ensure market is initialized with default templates
   */
  static async ensureMarketInitialized() {
    try {
      const { Storage: Storage2 } = await import("./storage-JHCC3LCT.mjs");
      const defaultsStorage = await Storage2.getDefaultsStorage();
      const files = await defaultsStorage.list("agents").catch(() => []);
      if (files.length > 0) {
        return;
      }
      console.log(
        "[AgentMarket] Initializing market with default templates..."
      );
      const fs2 = await import("fs/promises");
      const path2 = await import("path");
      const sourceAgentsDir = path2.join(
        process.cwd(),
        "src",
        "vibex",
        "defaults",
        "agents"
      );
      const sourcePromptsDir = path2.join(
        process.cwd(),
        "src",
        "vibex",
        "defaults",
        "prompts"
      );
      await defaultsStorage.mkdir("agents");
      await defaultsStorage.mkdir("prompts");
      const agentFiles = await fs2.readdir(sourceAgentsDir);
      for (const file of agentFiles) {
        if (file.endsWith(".yaml") || file.endsWith(".yml")) {
          const content = await fs2.readFile(
            path2.join(sourceAgentsDir, file),
            "utf8"
          );
          await defaultsStorage.writeFile(`agents/${file}`, content);
          console.log(`[AgentMarket] Copied template: ${file}`);
        }
      }
      try {
        const promptFiles = await fs2.readdir(sourcePromptsDir);
        for (const file of promptFiles) {
          if (file.endsWith(".md")) {
            const content = await fs2.readFile(
              path2.join(sourcePromptsDir, file),
              "utf8"
            );
            await defaultsStorage.writeFile(`prompts/${file}`, content);
            console.log(`[AgentMarket] Copied prompt: ${file}`);
          }
        }
      } catch (error) {
        console.warn("[AgentMarket] No default prompts found");
      }
      console.log("[AgentMarket] Market initialization complete");
    } catch (error) {
      console.error("[AgentMarket] Failed to initialize market:", error);
    }
  }
  /**
   * Get templates by category
   */
  static async getTemplatesByCategory(categoryId) {
    const allTemplates = await this.getAllTemplates();
    return allTemplates.filter((t) => t.category === categoryId);
  }
  /**
   * Search templates by keyword
   */
  static async searchTemplates(keyword) {
    const allTemplates = await this.getAllTemplates();
    const lowerKeyword = keyword.toLowerCase();
    return allTemplates.filter(
      (template) => template.name?.toLowerCase().includes(lowerKeyword) || template.description?.toLowerCase().includes(lowerKeyword) || template.tags?.some(
        (tag) => tag.toLowerCase().includes(lowerKeyword)
      ) || template.id?.toLowerCase().includes(lowerKeyword)
    );
  }
  /**
   * Get a specific template by ID
   */
  static async getTemplate(templateId) {
    try {
      await this.ensureMarketInitialized();
      const { Storage: Storage2 } = await import("./storage-JHCC3LCT.mjs");
      const defaultsStorage = await Storage2.getDefaultsStorage();
      const config = await defaultsStorage.readYaml(
        `agents/${templateId}.yaml`
      );
      if (config.promptFile) {
        try {
          const promptContent = await defaultsStorage.readTextFile(
            `prompts/${config.promptFile}`
          );
          config.systemPrompt = promptContent;
        } catch (error) {
          console.warn(`Failed to load prompt for ${templateId}:`, error);
        }
      }
      return config;
    } catch (error) {
      console.error(
        `[AgentMarket] Failed to load template ${templateId}:`,
        error
      );
      return null;
    }
  }
  /**
   * Instantiate a template into a space agent
   * @param templateId - ID of the template to instantiate
   * @param customization - Custom values for template variables
   * @returns AgentConfig ready to be used
   */
  static async instantiateTemplate(templateId, customization) {
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }
    const agentConfig = {
      id: customization?.id || template.id,
      name: customization?.name || template.name,
      description: customization?.description || template.description,
      llm: template.llm,
      promptFile: customization?.promptFile || template.promptFile,
      systemPrompt: template.systemPrompt,
      tools: customization?.tools || template.tools,
      personality: template.personality,
      examples: template.examples
    };
    if (template.variables && customization) {
      if (agentConfig.systemPrompt) {
        let prompt = agentConfig.systemPrompt;
        for (const variable of template.variables) {
          const value = customization[variable.name] ?? variable.default;
          if (value !== void 0) {
            prompt = prompt.replace(
              new RegExp(`{{${variable.name}}}`, "g"),
              String(value)
            );
          }
        }
        agentConfig.systemPrompt = prompt;
      }
    }
    return agentConfig;
  }
  /**
   * Save an agent instance to user's config
   * This creates an instance from a template
   */
  static async saveAgentInstance(agentConfig) {
    const { Storage: Storage2 } = await import("./storage-JHCC3LCT.mjs");
    const rootStorage = await Storage2.getRootStorage();
    const configStorage = await Storage2.getConfigStorage();
    await rootStorage.mkdir("agents");
    const agentId = agentConfig.id || `agent-${Date.now()}`;
    const agentData = {
      ...agentConfig,
      id: agentId,
      createdAt: agentConfig.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const yaml = await import("yaml");
    const yamlContent = yaml.stringify(agentData);
    await rootStorage.writeFile(`agents/${agentId}.yaml`, yamlContent);
    if (agentConfig.systemPrompt && agentConfig.promptFile) {
      await configStorage.mkdir("prompts");
      const promptPath = `prompts/${agentConfig.promptFile}`;
      const exists = await configStorage.exists(promptPath);
      if (!exists) {
        await configStorage.writeFile(promptPath, agentConfig.systemPrompt);
      }
    }
    console.log(`[AgentMarket] Saved agent instance: ${agentId}`);
  }
  /**
   * Get template statistics (for future use)
   */
  static async getTemplateStats(_templateId) {
    return {
      downloads: 0,
      rating: 0,
      reviews: 0
    };
  }
  /**
   * Check if a template is installed in user's config
   */
  static async isTemplateInstalled(templateId) {
    try {
      const adapter = getServerDataAdapter();
      const agents = await adapter.getAgents();
      return agents.some((agent) => agent.id === templateId);
    } catch {
      return false;
    }
  }
  /**
   * Get featured templates (for homepage/dashboard)
   */
  static async getFeaturedTemplates(limit = 6) {
    const allTemplates = await this.getAllTemplates();
    return allTemplates.slice(0, limit);
  }
};

// src/agent/browser.ts
import { chromium } from "playwright";
import { z } from "zod";
import { tool } from "ai";
var BrowserAgent = class extends Agent {
  constructor(config) {
    super({
      ...config,
      name: config.name || "Browser",
      description: config.description || "I can browse the web, interact with pages, and extract information."
    });
    __publicField(this, "browser");
    __publicField(this, "context");
    __publicField(this, "page");
    __publicField(this, "headless");
    __publicField(this, "viewport");
    this.headless = config.headless ?? false;
    this.viewport = config.viewport || { width: 1280, height: 800 };
    this.registerBrowserTools();
  }
  registerBrowserTools() {
    this.registerTool(
      "navigate",
      tool({
        description: "Navigate to a URL",
        parameters: z.object({ url: z.string().url() }),
        execute: async ({ url }) => {
          await this.ensurePage();
          await this.page.goto(url);
          return `Navigated to ${url}`;
        }
      })
    );
    this.registerTool(
      "click",
      tool({
        description: "Click an element specified by a selector",
        parameters: z.object({ selector: z.string() }),
        execute: async ({ selector }) => {
          await this.ensurePage();
          await this.page.click(selector);
          return `Clicked element: ${selector}`;
        }
      })
    );
    this.registerTool(
      "type",
      tool({
        description: "Type text into an element",
        parameters: z.object({ selector: z.string(), text: z.string() }),
        execute: async ({ selector, text }) => {
          await this.ensurePage();
          await this.page.fill(selector, text);
          return `Typed "${text}" into ${selector}`;
        }
      })
    );
    this.registerTool(
      "screenshot",
      tool({
        description: "Take a screenshot of the current page",
        parameters: z.object({ fullPage: z.boolean().optional() }),
        execute: async ({ fullPage }) => {
          await this.ensurePage();
          const buffer = await this.page.screenshot({ fullPage });
          return {
            type: "image",
            image: buffer.toString("base64")
          };
        }
      })
    );
    this.registerTool(
      "get_content",
      tool({
        description: "Get the text content of the page",
        parameters: z.object({}),
        execute: async () => {
          await this.ensurePage();
          const content = await this.page.content();
          return content.slice(0, 1e4) + "... (truncated)";
        }
      })
    );
    this.registerTool(
      "evaluate",
      tool({
        description: "Evaluate JavaScript on the page",
        parameters: z.object({ script: z.string() }),
        execute: async ({ script }) => {
          await this.ensurePage();
          const result = await this.page.evaluate(script);
          return JSON.stringify(result);
        }
      })
    );
  }
  async ensurePage() {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: this.headless });
    }
    if (!this.context) {
      this.context = await this.browser.newContext({ viewport: this.viewport });
    }
    if (!this.page) {
      this.page = await this.context.newPage();
    }
  }
  async cleanup() {
    if (this.page) await this.page.close();
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
    this.page = void 0;
    this.context = void 0;
    this.browser = void 0;
  }
  getSystemPrompt(context) {
    const base = super.getSystemPrompt(context);
    return `${base}
You are a browser automation agent. You can control a real web browser to browse the internet, interact with web pages, and extract data.
Always verify your actions by checking the page content or taking screenshots if necessary.
`;
  }
};

// src/agent/prompts.ts
var AGENT_SYSTEM_PROMPT_TEMPLATE = `
You are an AI Assistant that works with a backend planner to execute systematic professional working workflows.

## Core Workflow (MANDATORY)

**Simple Loop Pattern:**
1. IMMEDIATELY call plan_next_action() to get guidance
2. Execute the tool recommended by planner
3. Call plan_next_action() again with the results  
4. Repeat until planner indicates [is_complete: true]

**Never:**
- Make tool decisions independently
- Skip calling plan_next_action() before tool execution
- End conversation without planner guidance

**Requirements Management (3-Step Process):**
1. initialize_requirements() - Analyze raw input \u2192 expanded requirements + assumptions
2. generate_requirements_survey() - Create targeted survey + show initial understanding
3. finalize_requirements() - Submit survey responses and finalize requirements, only used at requirements phase

**Search & Extract:**

1. search_web() - Use semantic search to find relevant sources
   - For news/current events: Set searchType='news' and days parameter (e.g., "\u4ECA\u5929\u7684\u65B0\u95FB" \u2192 searchType='news', days=1)
   - For general queries: Use default searchType='general'
   - For Chinese content: Set language='zh' or language='zh-CN', country='CN' (e.g., "\u4ECA\u5929\u7684\u5934\u6761\u65B0\u95FB" \u2192 language='zh-CN', country='CN')
   - For Japanese content: Set language='ja', country='JP'
   - For Korean content: Set language='ko', country='KR'
   - Language detection: Auto-detect from query language and set appropriate parameters
   - Write clear, specific queries describing what to find
2. After search_web, use extract_urls to get content from found URLs

## Communication Style (BRIEF & FOCUSED)

**Key Rules:**
- \u2705 1-2 sentences maximum per response
- \u2705 Focus on next actions, not results recap
- \u274C NEVER repeat tool result details (users can see them in UI)
- \u274C NEVER list search results, extracted content, or file details
- \u274C NEVER summarize what was found/created

**Before planning calls (1 sentence):**
- "Getting guidance on next steps..."
- "Checking with planner for recommendations..."

**Before tool execution (1 sentence):**
- "Searching for [topic] as recommended..."
- "Analyzing content as suggested..."
- "Executing the recommended action..."

**After tool completion (1 sentence + immediate planning call):**
- "Done! Getting next guidance..." \u2192 plan_next_action()
- "Complete! Checking next steps..." \u2192 plan_next_action()

**Survey Handling:**
- \u2705 "Please complete the survey above to help me understand your needs."
- \u274C Don't repeat survey questions or options

## Context for plan_next_action()

Always include:
- query: Current situation and what just happened
- space_id: "{{PROJECT_ID}}"
- context: Complete tool results and space state

## Language & Response

- ALWAYS respond in the SAME language as the user's initial space input (MANDATORY)
- Auto-detect: Chinese input \u2192 Chinese responses, English input \u2192 English responses
- Conversational, brief, encouraging tone
- Show progress awareness without details

**Available Tools:** {{TOOLS_LIST}}

{{SURVEY_DATA_CONTEXT}}
{{PROJECT_CONTEXT}}
{{VIEWPORT_CONTEXT}}

Current date: {{CURRENT_DATE}}
`;
function getPrompt(template, variables = {}) {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`{{${key}}}`, "g");
    result = result.replace(pattern, value || "");
  }
  result = result.replace(/{{[^}]+}}/g, "");
  return result;
}
function getAgentSystemPrompt(variables = {}) {
  return getPrompt(AGENT_SYSTEM_PROMPT_TEMPLATE, variables);
}

// src/orchestration/stream-text.ts
async function streamText(options) {
  const {
    agent,
    messages = [],
    spaceId,
    ...restOptions
  } = options;
  console.log(`[Vibex] Interface layer: validating agent parameter`);
  if (!agent) {
    throw new Error("Agent parameter is required");
  }
  console.log("[Vibex] Interface layer: bootstrapping space");
  const space = await startSpace({
    spaceId: spaceId || `vibex-agent-${Date.now()}`,
    goal: messages[messages.length - 1]?.content?.toString() || "Process this request"
  });
  console.log("[Vibex] Interface layer: delegating to XAgent");
  const xAgent = space.xAgent;
  if (!xAgent) {
    throw new Error("XAgent not initialized for space");
  }
  const streamResult = await xAgent.streamText({
    messages,
    spaceId: space.spaceId,
    metadata: {
      mode: "agent",
      requestedAgent: agent,
      ...restOptions.data
    },
    ...restOptions
  });
  console.log("[Vibex] Interface layer: returning stream result");
  return streamResult;
}

// src/orchestration/result-processor.ts
import { SpaceStorageFactory } from "@vibex/data";
async function processToolResult(result, toolName, spaceId, threshold = 1e4) {
  if (!spaceId || !result) {
    return {
      original: result,
      processed: result,
      wasProcessed: false
    };
  }
  const resultStr = typeof result === "string" ? result : JSON.stringify(result);
  if (resultStr.length <= threshold) {
    return {
      original: result,
      processed: result,
      wasProcessed: false
    };
  }
  const storage = await SpaceStorageFactory.create(spaceId);
  const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
  const artifactId = `${toolName}_${timestamp}.${typeof result === "string" ? "txt" : "json"}`;
  let mimeType = "application/octet-stream";
  if (typeof result === "string") {
    mimeType = "text/plain";
  } else if (typeof result === "object") {
    mimeType = "application/json";
  }
  await storage.saveArtifact(artifactId, Buffer.from(resultStr), {
    mimeType,
    size: resultStr.length,
    artifactType: "tool-result"
  });
  const processed = {
    __type: "large_result_reference",
    artifactId,
    toolName,
    size: resultStr.length,
    sizeFormatted: formatBytes(resultStr.length),
    saved: true,
    message: `Large result (${formatBytes(
      resultStr.length
    )}) saved as artifact: ${artifactId}`,
    preview: resultStr.substring(0, 500) + "...",
    // Include key information if it's a structured object
    ...typeof result === "object" && !Array.isArray(result) && {
      keys: Object.keys(result).slice(0, 10),
      keyCount: Object.keys(result).length
    },
    // Include array info if it's an array
    ...Array.isArray(result) && {
      itemCount: result.length,
      firstItems: result.slice(0, 3)
    }
  };
  return {
    original: result,
    processed,
    wasProcessed: true,
    artifactId
  };
}
function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
function isLargeResultReference(result) {
  return result?.__type === "large_result_reference";
}
async function loadLargeResult(reference, spaceId) {
  if (!isLargeResultReference(reference)) {
    return reference;
  }
  const storage = await SpaceStorageFactory.create(spaceId);
  const artifact = await storage.getArtifact(reference.artifactId);
  if (!artifact) {
    throw new Error(`Artifact not found: ${reference.artifactId}`);
  }
  const content = artifact.content.toString("utf-8");
  if (artifact.metadata?.mimeType === "application/json") {
    try {
      return JSON.parse(content);
    } catch {
      return content;
    }
  }
  return content;
}

// src/knowledge/knowledge.ts
import fs from "fs/promises";
var _Knowledge = class _Knowledge {
  static async loadDatasets() {
    try {
      const data = await fs.readFile(_Knowledge.datasetsPath, "utf-8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }
  static async loadDocuments() {
    try {
      const data = await fs.readFile(_Knowledge.documentsPath, "utf-8");
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  static async saveDatasets(datasets) {
    await fs.mkdir(_Knowledge.configDir, { recursive: true });
    await fs.writeFile(_Knowledge.datasetsPath, JSON.stringify(datasets, null, 2));
  }
  static async saveDocuments(documents) {
    await fs.mkdir(_Knowledge.configDir, { recursive: true });
    await fs.writeFile(_Knowledge.documentsPath, JSON.stringify(documents, null, 2));
  }
  static async addDataset(dataset) {
    const datasets = await _Knowledge.loadDatasets();
    datasets.push(dataset);
    await _Knowledge.saveDatasets(datasets);
  }
  static async updateDataset(id, updates) {
    const datasets = await _Knowledge.loadDatasets();
    const index = datasets.findIndex((d) => d.id === id);
    if (index !== -1) {
      datasets[index] = { ...datasets[index], ...updates };
      await _Knowledge.saveDatasets(datasets);
    }
  }
  static async deleteDataset(id) {
    const datasets = await _Knowledge.loadDatasets();
    const filtered = datasets.filter((d) => d.id !== id);
    await _Knowledge.saveDatasets(filtered);
    const documents = await _Knowledge.loadDocuments();
    delete documents[id];
    await _Knowledge.saveDocuments(documents);
  }
  static async addDocument(datasetId, document) {
    const documents = await _Knowledge.loadDocuments();
    if (!documents[datasetId]) {
      documents[datasetId] = [];
    }
    documents[datasetId].push(document);
    await _Knowledge.saveDocuments(documents);
  }
  static async deleteDocument(datasetId, documentId) {
    const documents = await _Knowledge.loadDocuments();
    if (documents[datasetId]) {
      documents[datasetId] = documents[datasetId].filter((d) => d.id !== documentId);
      await _Knowledge.saveDocuments(documents);
    }
  }
};
__publicField(_Knowledge, "configDir", VibexPaths.datasets());
__publicField(_Knowledge, "datasetsPath", VibexPaths.datasets() + "/datasets.json");
__publicField(_Knowledge, "documentsPath", VibexPaths.datasets() + "/documents.json");
var Knowledge = _Knowledge;

// src/knowledge/rag.ts
var KnowledgeBase = class {
  constructor(store, embeddings) {
    this.store = store;
    this.embeddings = embeddings;
  }
  async addText(text, metadata = {}) {
    const chunks = this.chunkText(text);
    const vectors = await this.embeddings.embedDocuments(chunks);
    const docs = chunks.map((content, i) => ({
      id: `${Date.now()}-${i}`,
      content,
      metadata,
      embedding: vectors[i]
    }));
    await this.store.addDocuments(docs);
  }
  async query(text, k = 5) {
    const vector = await this.embeddings.embedQuery(text);
    return this.store.similaritySearch(vector, k);
  }
  chunkText(text, size = 1e3) {
    const chunks = [];
    for (let i = 0; i < text.length; i += size) {
      chunks.push(text.slice(i, i + size));
    }
    return chunks;
  }
};

// src/knowledge/rag-embeddings.ts
import { embed, embedMany } from "ai";
var AIEmbeddingModel = class {
  constructor(model) {
    this.model = model;
  }
  async embedDocuments(texts) {
    const result = await embedMany({
      model: this.model,
      values: texts
    });
    return result.embeddings;
  }
  async embedQuery(text) {
    const result = await embed({
      model: this.model,
      value: text
    });
    return result.embedding;
  }
};

// src/knowledge/rag-memory-store.ts
var InMemoryVectorStore = class {
  constructor() {
    __publicField(this, "documents", []);
  }
  async addDocuments(documents) {
    this.documents.push(...documents);
  }
  async similaritySearch(query, k) {
    const scores = this.documents.map((doc) => ({
      doc,
      score: this.cosineSimilarity(query, doc.embedding)
    }));
    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, k).map((s) => s.doc);
  }
  async deleteDocuments(ids) {
    this.documents = this.documents.filter((doc) => !ids.includes(doc.id));
  }
  cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
};
export {
  AGENT_SYSTEM_PROMPT_TEMPLATE,
  AIEmbeddingModel,
  Agent,
  AgentCollaborationManager,
  AgentMarket,
  ArtifactManager,
  BrowserAgent,
  CollaborativePlanner,
  ConversationHistory,
  InMemoryVectorStore,
  Knowledge,
  KnowledgeBase,
  MessageQueue,
  ParallelExecutionEngine,
  Plan,
  Space,
  Storage,
  Task,
  TaskStatus,
  VibexPaths,
  WorkflowEngine,
  XAgent,
  buildToolMap,
  calculateContextBudget,
  clearToolCache,
  compressMessages,
  estimateTokenCount,
  generateShortId,
  generateSpaceId,
  getAgentSystemPrompt,
  getCompletionTokens,
  getConfiguredProviders,
  getModelContextLimit,
  getModelProvider,
  getPrompt,
  getTextContent,
  getVibexPath,
  getVibexRoot,
  isLargeResultReference,
  isProviderConfigured,
  loadLargeResult,
  parseModelString,
  processToolResult,
  startSpace,
  streamText,
  useVibexArtifacts,
  useVibexCurrentSpace,
  useVibexSpaces,
  useVibexStore,
  useVibexTasks,
  validateContext,
  validateId
};
