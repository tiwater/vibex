import {
  __publicField,
  getVibexPath
} from "./chunk-IZQTIHBR.mjs";

// src/space/task.ts
var TaskStatus = /* @__PURE__ */ ((TaskStatus2) => {
  TaskStatus2["PENDING"] = "pending";
  TaskStatus2["RUNNING"] = "running";
  TaskStatus2["COMPLETED"] = "completed";
  TaskStatus2["FAILED"] = "failed";
  TaskStatus2["BLOCKED"] = "blocked";
  TaskStatus2["CANCELLED"] = "cancelled";
  return TaskStatus2;
})(TaskStatus || {});
var Task = class _Task {
  constructor({
    id,
    title,
    description,
    status = "pending" /* PENDING */,
    assignedTo,
    priority = "medium",
    estimatedTime,
    dependencies = [],
    steps = [],
    tags = [],
    metadata = {}
  }) {
    __publicField(this, "id");
    __publicField(this, "title");
    __publicField(this, "description");
    __publicField(this, "status");
    __publicField(this, "assignedTo");
    __publicField(this, "priority");
    __publicField(this, "estimatedTime");
    __publicField(this, "actualTime");
    __publicField(this, "dependencies");
    __publicField(this, "steps");
    __publicField(this, "tags");
    __publicField(this, "metadata");
    __publicField(this, "createdAt");
    __publicField(this, "updatedAt");
    __publicField(this, "startedAt");
    __publicField(this, "completedAt");
    __publicField(this, "error");
    this.id = id;
    this.title = title;
    this.description = description;
    this.status = status;
    this.assignedTo = assignedTo;
    this.priority = priority;
    this.estimatedTime = estimatedTime;
    this.dependencies = dependencies;
    this.steps = steps;
    this.tags = tags;
    this.metadata = metadata;
    this.createdAt = /* @__PURE__ */ new Date();
    this.updatedAt = /* @__PURE__ */ new Date();
  }
  start() {
    if (this.status !== "pending" /* PENDING */) {
      throw new Error(`Cannot start task in ${this.status} status`);
    }
    this.status = "running" /* RUNNING */;
    this.startedAt = /* @__PURE__ */ new Date();
    this.updatedAt = /* @__PURE__ */ new Date();
  }
  complete() {
    if (this.status !== "running" /* RUNNING */) {
      throw new Error(`Cannot complete task in ${this.status} status`);
    }
    this.status = "completed" /* COMPLETED */;
    this.completedAt = /* @__PURE__ */ new Date();
    this.updatedAt = /* @__PURE__ */ new Date();
    if (this.startedAt) {
      this.actualTime = this.calculateDuration(
        this.startedAt,
        this.completedAt
      );
    }
  }
  fail(error) {
    this.status = "failed" /* FAILED */;
    this.error = error;
    this.completedAt = /* @__PURE__ */ new Date();
    this.updatedAt = /* @__PURE__ */ new Date();
  }
  block(reason) {
    this.status = "blocked" /* BLOCKED */;
    this.error = reason;
    this.updatedAt = /* @__PURE__ */ new Date();
  }
  cancel() {
    this.status = "cancelled" /* CANCELLED */;
    this.completedAt = /* @__PURE__ */ new Date();
    this.updatedAt = /* @__PURE__ */ new Date();
  }
  isActionable() {
    return this.status === "pending" /* PENDING */ && !this.hasBlockingDependencies();
  }
  hasBlockingDependencies() {
    return false;
  }
  calculateDuration(start, end) {
    const ms = end.getTime() - start.getTime();
    const seconds = Math.floor(ms / 1e3);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      status: this.status,
      assignedTo: this.assignedTo,
      priority: this.priority,
      estimatedTime: this.estimatedTime,
      actualTime: this.actualTime,
      dependencies: this.dependencies,
      steps: this.steps,
      tags: this.tags,
      metadata: this.metadata,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      startedAt: this.startedAt?.toISOString(),
      completedAt: this.completedAt?.toISOString(),
      error: this.error
    };
  }
  static fromJSON(data) {
    const task = new _Task({
      id: data.id,
      title: data.title,
      description: data.description,
      status: data.status,
      assignedTo: data.assignedTo,
      priority: data.priority,
      estimatedTime: data.estimatedTime,
      dependencies: data.dependencies,
      steps: data.steps,
      tags: data.tags,
      metadata: data.metadata
    });
    task.createdAt = new Date(data.createdAt);
    task.updatedAt = new Date(data.updatedAt);
    task.actualTime = data.actualTime;
    task.error = data.error;
    if (data.startedAt) {
      task.startedAt = new Date(data.startedAt);
    }
    if (data.completedAt) {
      task.completedAt = new Date(data.completedAt);
    }
    return task;
  }
};

// src/agent/agent.ts
import { generateText, streamText } from "ai";

// src/space/message.ts
function getTextContent(message) {
  if (!message || !message.content) {
    return "";
  }
  if (typeof message.content === "string") {
    return message.content;
  }
  if (Array.isArray(message.content)) {
    return message.content.filter((part) => part && part.type === "text").map((part) => part.text || "").join(" ");
  }
  return "";
}
var MessageQueue = class {
  constructor() {
    __publicField(this, "queue", []);
    __publicField(this, "current");
    __publicField(this, "processing", false);
    __publicField(this, "listeners", /* @__PURE__ */ new Set());
    __publicField(this, "nextId", 1);
  }
  /**
   * Add message to queue
   */
  add(content, metadata) {
    const message = {
      id: `msg-${this.nextId++}`,
      content,
      status: "queued",
      timestamp: Date.now(),
      metadata
    };
    this.queue.push(message);
    this.notify();
    return message.id;
  }
  /**
   * Get next message from queue
   */
  next() {
    const message = this.queue.shift();
    if (message) {
      message.status = "processing";
      this.current = message;
      this.processing = true;
      this.notify();
    }
    return message;
  }
  /**
   * Mark current message as complete
   */
  complete(messageId) {
    if (this.current?.id === messageId) {
      this.current.status = "completed";
      this.current = void 0;
      this.processing = false;
      this.notify();
    }
  }
  /**
   * Mark current message as error
   */
  error(messageId, error) {
    if (this.current?.id === messageId) {
      this.current.status = "error";
      this.current.error = error;
      this.current = void 0;
      this.processing = false;
      this.notify();
    }
  }
  /**
   * Remove message from queue
   */
  remove(messageId) {
    const index = this.queue.findIndex((m) => m.id === messageId);
    if (index > -1) {
      this.queue.splice(index, 1);
      this.notify();
      return true;
    }
    return false;
  }
  /**
   * Reorder queue
   */
  reorder(messageId, newIndex) {
    const currentIndex = this.queue.findIndex((m) => m.id === messageId);
    if (currentIndex > -1 && newIndex >= 0 && newIndex < this.queue.length) {
      const [message] = this.queue.splice(currentIndex, 1);
      this.queue.splice(newIndex, 0, message);
      this.notify();
    }
  }
  /**
   * Edit queued message
   */
  edit(messageId, content) {
    const message = this.queue.find((m) => m.id === messageId);
    if (message && message.status === "queued") {
      message.content = content;
      message.edited = true;
      this.notify();
    }
  }
  /**
   * Clear all queued messages
   */
  clear() {
    this.queue = [];
    this.notify();
  }
  /**
   * Get queue state
   */
  getState() {
    return {
      current: this.current,
      queue: [...this.queue],
      processing: this.processing
    };
  }
  /**
   * Subscribe to queue changes
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  /**
   * Check if queue is empty
   */
  isEmpty() {
    return this.queue.length === 0;
  }
  /**
   * Check if processing
   */
  isProcessing() {
    return this.processing;
  }
  /**
   * Notify listeners
   */
  notify() {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }
};
var ConversationHistory = class {
  constructor() {
    __publicField(this, "messages", []);
  }
  add(message) {
    if (!message.id) {
      const agentName = message.metadata?.agentName || "unknown";
      const prefix = agentName.toLowerCase().replace(/\s+/g, "-");
      const randomId = Math.random().toString(36).substring(2, 10);
      message.id = `${prefix}_${randomId}`;
    }
    this.messages.push(message);
  }
  getMessages() {
    return [...this.messages];
  }
  getLastN(n) {
    return this.messages.slice(-n);
  }
  clear() {
    this.messages = [];
  }
  toModelMessages() {
    return this.messages.map((msg) => {
      if (msg.role === "tool") {
        return null;
      }
      let cleanContent = msg.content;
      if (Array.isArray(msg.content)) {
        const textParts = msg.content.filter((part) => part.type === "text");
        if (textParts.length > 0) {
          cleanContent = textParts.map((part) => part.text || "").filter((text) => text).join("\n");
        } else {
          return null;
        }
      }
      if (!cleanContent) {
        return null;
      }
      return {
        role: msg.role,
        content: cleanContent
      };
    }).filter((msg) => msg !== null);
  }
};

// src/agent/provider.ts
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { deepseek } from "@ai-sdk/deepseek";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
function getModelProvider(config) {
  const {
    provider,
    apiKey,
    baseURL,
    spaceId,
    userId,
    storageRoot: _storageRoot,
    teamConfig: _teamConfig,
    defaultGoal: _defaultGoal
  } = config;
  switch (provider) {
    case "anthropic":
      return createAnthropic({
        apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
        baseURL: baseURL || process.env.ANTHROPIC_BASE_URL
      });
    case "openai":
      return createOpenAI({
        apiKey: apiKey || process.env.OPENAI_API_KEY,
        baseURL: baseURL || process.env.OPENAI_BASE_URL
      });
    case "deepseek":
      return deepseek;
    case "openrouter":
      const openrouterConfig = {
        apiKey: apiKey || process.env.OPENROUTER_API_KEY
      };
      if (process.env.HELICONE_API_KEY) {
        openrouterConfig.baseURL = baseURL || "https://openrouter.helicone.ai/api/v1";
        openrouterConfig.headers = {
          "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
          // Add user and space tracking for better analytics
          "Helicone-Property-User": userId || "anonymous",
          "Helicone-Property-Space": spaceId || "default"
        };
      }
      return createOpenRouter(openrouterConfig);
    default:
      throw new Error(
        `Provider '${provider}' is not configured. To use ${provider}, add the appropriate AI SDK provider import and configuration to core/provider.ts`
      );
  }
}
function isProviderConfigured(provider) {
  switch (provider) {
    case "anthropic":
      return !!process.env.ANTHROPIC_API_KEY;
    case "openai":
      return !!process.env.OPENAI_API_KEY;
    case "deepseek":
      return !!process.env.DEEPSEEK_API_KEY;
    case "openrouter":
      return !!process.env.OPENROUTER_API_KEY;
    case "google":
      return false;
    // Not yet implemented
    case "mistral":
      return false;
    // Not yet implemented
    case "cohere":
      return false;
    // Not yet implemented
    default:
      return false;
  }
}
function getConfiguredProviders() {
  const providers = [
    "anthropic",
    "openai",
    "deepseek",
    "openrouter",
    "google",
    "mistral",
    "cohere"
  ];
  return providers.filter(isProviderConfigured);
}
function parseModelString(model) {
  if (model.startsWith("claude-")) {
    return { provider: "anthropic", modelName: model };
  }
  if (model.startsWith("deepseek-")) {
    return { provider: "deepseek", modelName: model };
  }
  if (model.includes("/")) {
    return { provider: "openrouter", modelName: model };
  }
  return { provider: "openai", modelName: model };
}
function getModelContextLimit(modelName) {
  const contextLimits = {
    // Vibex (uses underlying model limits dynamically)
    vibex: 1e5,
    "vibex-default": 1e5,
    // Deepseek
    "deepseek-chat": 65536,
    "deepseek-reasoner": 65536,
    // OpenRouter models
    "anthropic/claude-3.5-sonnet": 15e4,
    "anthropic/claude-3.5-haiku": 15e4,
    "openai/gpt-4o": 1e5,
    "openai/o1-preview": 1e5,
    "google/gemini-2.0-flash-exp:free": 1e5,
    "meta-llama/llama-3.3-70b-instruct": 32e3,
    // Anthropic
    "claude-3-5-sonnet-20240620": 15e4,
    "claude-3-haiku-20240307": 15e4,
    "claude-3-opus-20240229": 15e4,
    // OpenAI
    "gpt-4o": 1e5,
    "gpt-4o-mini": 1e5,
    "gpt-4-turbo": 1e5,
    "gpt-3.5-turbo": 16e3
  };
  return contextLimits[modelName] || 5e4;
}
function getCompletionTokens(modelName) {
  if (modelName.startsWith("deepseek-reasoner")) {
    return 32e3;
  }
  if (modelName.startsWith("deepseek-")) {
    return 8e3;
  }
  return 4e3;
}

// src/agent/tool.ts
var mcpClients = /* @__PURE__ */ new Map();
async function buildToolMap(toolIds, context) {
  const tools = {};
  const { getServerDataAdapter: getServerDataAdapter2 } = await import("@vibex/data");
  const adapter = getServerDataAdapter2();
  const mcpServers = await adapter.getTools();
  const mcpServerIds = new Set(mcpServers.map((s) => s.id));
  const customToolIds = [];
  const mcpToolIds = [];
  for (const id of toolIds) {
    if (mcpServerIds.has(id)) {
      mcpToolIds.push(id);
    } else {
      customToolIds.push(id);
    }
  }
  if (customToolIds.length > 0) {
    const { buildToolMap: buildCustomToolMap } = await import("@vibex/tools");
    const customTools = buildCustomToolMap(customToolIds, context);
    Object.assign(tools, customTools);
  }
  if (mcpToolIds.length > 0) {
    const mcpTools = await loadMcpTools(mcpToolIds);
    Object.assign(tools, mcpTools);
  }
  return tools;
}
async function loadMcpTools(ids) {
  const tools = {};
  const serverGroups = /* @__PURE__ */ new Map();
  for (const id of ids) {
    let serverId = id;
    if (id.startsWith("mcp:")) {
      const parts = id.split(":");
      serverId = parts[1] || id;
    }
    if (!serverGroups.has(serverId)) {
      serverGroups.set(serverId, []);
    }
    serverGroups.get(serverId).push(id);
  }
  for (const [serverId, toolIds] of serverGroups) {
    try {
      let mcpClient = mcpClients.get(serverId);
      if (!mcpClient) {
        const { getServerDataAdapter: getServerDataAdapter2 } = await import("@vibex/data");
        const { createAISdkMcpClient } = await import("../../lib/mcp");
        const adapter = getServerDataAdapter2();
        const tools2 = await adapter.getTools();
        const server = tools2.find((t) => t.id === serverId);
        if (!server) {
          console.warn(`[Tools] MCP server not found: ${serverId}`);
          continue;
        }
        mcpClient = await createAISdkMcpClient({
          id: server.id,
          transport: server.transport || server.config?.transport || "stdio",
          url: server.url || server.endpoint || server.config?.url || server.config?.endpoint,
          command: server.command || server.config?.command,
          args: server.args || server.config?.args,
          description: server.description,
          config: server.config
          // Pass configuration (access tokens, etc.)
        });
        if (mcpClient) {
          mcpClients.set(serverId, mcpClient);
        }
      }
      if (mcpClient && typeof mcpClient === "object") {
        const mcpTools = await mcpClient.tools();
        for (const [toolName, tool] of Object.entries(mcpTools)) {
          if (isValidTool(tool)) {
            tools[toolName] = tool;
          }
        }
      }
    } catch (error) {
      console.error(`[Tools] Failed to load MCP server ${serverId}:`, error);
    }
  }
  return tools;
}
function isValidTool(obj) {
  return obj && typeof obj === "object" && typeof obj.execute === "function" && typeof obj.description === "string";
}
function clearToolCache() {
  mcpClients.clear();
}

// src/utils/id.ts
import { customAlphabet } from "nanoid";
var ALPHABET_SAFE = "abcdefghijklmnopqrstuvwxyz0123456789_ABCDEFGHIJKLMNOPQRSTUVWXYZ";
function generateShortId(length = 8) {
  const nanoid = customAlphabet(ALPHABET_SAFE, length);
  let id = nanoid();
  while (!/^[a-zA-Z]/.test(id)) {
    id = nanoid();
  }
  return id;
}
function generateSpaceId(topic) {
  return generateShortId(8);
}
function validateId(id) {
  if (!id || typeof id !== "string" || id.trim() === "") {
    return false;
  }
  const idPattern = /^[a-zA-Z][a-zA-Z0-9_]*$/;
  return idPattern.test(id);
}

// src/agent/agent.ts
var Agent = class {
  constructor(config) {
    __publicField(this, "id");
    // Agent ID (filename without extension)
    __publicField(this, "name");
    // Display name
    __publicField(this, "description");
    __publicField(this, "config");
    // Store the original config
    // LLM configuration
    __publicField(this, "provider");
    __publicField(this, "model");
    __publicField(this, "temperature");
    __publicField(this, "maxTokens");
    __publicField(this, "topP");
    __publicField(this, "frequencyPenalty");
    __publicField(this, "presencePenalty");
    __publicField(this, "systemPrompt");
    // Agent configuration
    __publicField(this, "tools");
    __publicField(this, "personality");
    // Custom tools map for dynamically registered tools
    __publicField(this, "customTools");
    this.config = config;
    this.id = config.id || config.name;
    this.name = config.name;
    this.description = config.description;
    if (config.llm) {
      this.provider = config.llm.provider;
      this.model = config.llm.model;
      this.temperature = config.llm.settings?.temperature;
      this.maxTokens = config.llm.settings?.maxTokens;
      this.topP = config.llm.settings?.topP;
      this.frequencyPenalty = config.llm.settings?.frequencyPenalty;
      this.presencePenalty = config.llm.settings?.presencePenalty;
      this.systemPrompt = config.systemPrompt;
    } else {
      this.provider = config.provider;
      this.model = config.model;
      this.temperature = config.temperature;
      this.maxTokens = config.maxTokens;
      this.topP = config.topP;
      this.frequencyPenalty = config.frequencyPenalty;
      this.presencePenalty = config.presencePenalty;
      this.systemPrompt = config.systemPrompt;
    }
    if (this.provider === "vibex" || this.provider?.startsWith("vibex-")) {
      throw new Error(
        `Invalid provider '${this.provider}' for agent '${this.name}'. 'vibex' is a team orchestration system, not an AI provider. Use 'openai', 'anthropic', 'deepseek', etc. as providers.`
      );
    }
    this.tools = config.tools || [];
    this.personality = config.personality;
    this.customTools = /* @__PURE__ */ new Map();
  }
  /**
   * Register a custom tool (for subclasses like BrowserAgent)
   */
  registerTool(name, tool) {
    this.customTools.set(name, tool);
  }
  /**
   * Get the system prompt for this agent
   */
  getSystemPrompt(context) {
    const segments = [];
    segments.push(`You are ${this.name}.`);
    segments.push(this.description);
    if (this.personality) {
      segments.push(`
Personality: ${this.personality}`);
    }
    if (this.tools && this.tools.length > 0) {
      segments.push("\nIMPORTANT - TOOL USAGE:");
      segments.push("You have tools available. To use a tool, you MUST:");
      segments.push("1. Use the tool calling mechanism provided by the system");
      segments.push(
        "2. NEVER output tool calls as JSON, code blocks, or plain text"
      );
      segments.push("3. The system will automatically handle tool execution");
      segments.push(
        "When you need to call a tool, simply invoke it directly without any formatting."
      );
    }
    if (this.systemPrompt) {
      segments.push(`
${this.systemPrompt}`);
    }
    if (context) {
      segments.push("\nCurrent Context:");
      segments.push(`- Space ID: ${context.spaceId}`);
      if (context.taskId) {
        segments.push(`- Task ID: ${context.taskId}`);
      }
      if (context.metadata) {
        if (context.metadata.artifactId) {
          let fullPath = context.metadata.artifactPath;
          if (!fullPath) {
            fullPath = getVibexPath(
              "spaces",
              context.spaceId,
              "artifacts",
              context.metadata.artifactId
            );
          }
          const displayName = context.metadata.artifactName || context.metadata.artifactId;
          const isOfficeDocument = fullPath.match(/\.(docx?|xlsx?|pptx?)$/i);
          const isPdf = fullPath.match(/\.pdf$/i);
          const isImage = fullPath.match(/\.(png|jpe?g|gif|bmp|svg)$/i);
          if (isOfficeDocument) {
            segments.push(`
CURRENT DOCUMENT:`);
            segments.push(
              `You have an active Office document that the user has already uploaded and selected.`
            );
            segments.push(`Document filepath: "${fullPath}"`);
            segments.push(
              `(This is the complete path you need to use when calling document tools)`
            );
            segments.push(
              `To read or process this document, use your available tools with filepath: ${fullPath}`
            );
            segments.push(
              `The user expects you to work directly with this document - do not ask them to upload it again.`
            );
          } else {
            segments.push(`
CURRENT FILE:`);
            segments.push(
              `You have an active file that the user has already uploaded and selected.`
            );
            segments.push(`File: "${displayName}" (${fullPath})`);
            if (isPdf) {
              segments.push(
                `This is a PDF file. Use appropriate PDF processing tools if available.`
              );
            } else if (isImage) {
              segments.push(
                `This is an image file. You can reference it in your responses or use image processing tools if available.`
              );
            } else {
              segments.push(
                `This is a ${fullPath.split(".").pop()?.toUpperCase() || "unknown"} file.`
              );
            }
            segments.push(
              `The user expects you to work with this file directly when relevant to their request.`
            );
          }
        }
        const artifactFields = ["artifactId", "artifactName", "artifactPath"];
        for (const [key, value] of Object.entries(context.metadata)) {
          if (!artifactFields.includes(key)) {
            segments.push(`- ${key}: ${value}`);
          }
        }
      }
    }
    const now = /* @__PURE__ */ new Date();
    segments.push("\nDate/Time Information:");
    segments.push(`- Current Date: ${now.toISOString().split("T")[0]}`);
    segments.push(`- Current Time: ${now.toTimeString().split(" ")[0]}`);
    segments.push(
      `- Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`
    );
    return segments.join("\n");
  }
  /**
   * Get the model provider for this agent
   */
  getModel(context) {
    const modelProvider = getModelProvider({
      provider: this.provider,
      modelName: this.model,
      spaceId: context?.spaceId,
      userId: context?.userId
    });
    return modelProvider(this.model);
  }
  /**
   * Get tools available to this agent
   */
  async getTools(context) {
    const toolsMap = {};
    for (const [name, tool] of this.customTools.entries()) {
      toolsMap[name] = tool;
    }
    if (this.tools && this.tools.length > 0) {
      try {
        const configuredTools = await buildToolMap(this.tools, context);
        if (configuredTools) {
          Object.assign(toolsMap, configuredTools);
        }
      } catch (error) {
        console.error(`Failed to load tools for agent ${this.name}:`, error);
      }
    }
    return Object.keys(toolsMap).length > 0 ? toolsMap : void 0;
  }
  /**
   * Prepare debug info without actually calling streamText
   * Returns all the parameters that would be sent to the LLM
   */
  async prepareDebugInfo(options) {
    const { messages: vibexMessages, system, spaceId, metadata } = options;
    let enrichedMetadata = metadata || {};
    const lastUserMsg = vibexMessages.filter((m) => m.role === "user").pop();
    if (lastUserMsg?.metadata) {
      enrichedMetadata = { ...lastUserMsg.metadata, ...metadata };
    }
    const context = {
      spaceId: spaceId || "default",
      conversationHistory: new ConversationHistory(),
      metadata: enrichedMetadata
    };
    const basePrompt = this.getSystemPrompt(context);
    const systemPrompt = system ? `${basePrompt}

${system}` : basePrompt;
    const tools = await this.getTools({ spaceId });
    const modelMessages = vibexMessages.filter((m) => m.role !== "tool").map((m) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : Array.isArray(m.content) ? m.content.filter((p) => p.type === "text" && p.text).map((p) => p.text).join("\n") : ""
    })).filter((m) => m.content);
    return {
      systemPrompt,
      tools: Object.entries(tools || {}).map(([id, tool]) => ({
        id,
        name: tool.name || id,
        description: tool.description,
        functions: Object.keys(tool.functions || {})
      })),
      model: {
        provider: this.config.llm?.provider || this.config.provider || "unknown",
        model: this.config.llm?.model || this.config.model || "unknown",
        settings: {
          temperature: this.temperature,
          maxTokens: this.maxTokens,
          topP: this.topP,
          frequencyPenalty: this.frequencyPenalty,
          presencePenalty: this.presencePenalty
        }
      },
      agentInfo: {
        id: this.id,
        name: this.name,
        description: this.description,
        personality: this.personality
      },
      messages: modelMessages
    };
  }
  /**
   * Stream text - works with VibexMessage[] internally
   * Converts to ModelMessage[] only when calling AI SDK
   */
  async streamText(options) {
    const {
      messages: vibexMessages,
      system,
      spaceId,
      metadata,
      ...aiSdkOptions
    } = options;
    let enrichedMetadata = metadata || {};
    const lastUserMsg = vibexMessages.filter((m) => m.role === "user").pop();
    if (lastUserMsg?.metadata) {
      enrichedMetadata = { ...lastUserMsg.metadata, ...metadata };
    }
    const context = {
      spaceId: spaceId || "default",
      conversationHistory: new ConversationHistory(),
      metadata: enrichedMetadata
    };
    const basePrompt = this.getSystemPrompt(context);
    const systemPrompt = system ? `${basePrompt}

${system}` : basePrompt;
    const model = this.getModel({ spaceId, userId: enrichedMetadata.userId });
    const tools = await this.getTools({ spaceId });
    const agentPrefix = this.name.toLowerCase().replace(/\s+/g, "-");
    const modelMessages = vibexMessages.filter((m) => m.role !== "tool").map((m) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : Array.isArray(m.content) ? m.content.filter((p) => p.type === "text" && p.text).map((p) => p.text).join("\n") : ""
    })).filter((m) => m.content);
    const result = streamText({
      model,
      system: systemPrompt,
      messages: modelMessages,
      tools,
      toolChoice: "auto",
      // Explicitly set tool choice mode
      // stopWhen removed - stepCountIs not available in this AI SDK version
      temperature: this.temperature,
      maxTokens: this.maxTokens,
      topP: this.topP,
      frequencyPenalty: this.frequencyPenalty,
      presencePenalty: this.presencePenalty,
      maxRetries: 3,
      // Add callback to monitor tool calls
      onStepFinish: ({ text, toolCalls, toolResults, finishReason }) => {
        console.log(`[${this.name}] Step finished:`, {
          finishReason,
          hasText: !!text,
          toolCallsCount: toolCalls?.length || 0,
          toolResultsCount: toolResults?.length || 0
        });
        if (toolCalls && toolCalls.length > 0) {
          toolCalls.forEach((toolCall) => {
            const toolCallAny = toolCall;
            console.log(`[${this.name}] Tool Call:`, {
              toolName: toolCall.toolName,
              input: toolCallAny.input,
              // Focus on filepath-related arguments
              hasFilePath: toolCallAny.input && typeof toolCallAny.input === "object" && ("filepath" in toolCallAny.input || "file_path" in toolCallAny.input || "path" in toolCallAny.input),
              pathValues: toolCall.input && typeof toolCall.input === "object" ? Object.entries(toolCall.input).filter(
                ([key]) => key.toLowerCase().includes("path") || key.toLowerCase().includes("file")
              ).reduce(
                (acc, [key, value]) => ({ ...acc, [key]: value }),
                {}
              ) : {}
            });
          });
        }
        if (toolResults && toolResults.length > 0) {
          toolResults.forEach((result2, index) => {
            const resultAny = result2;
            console.log(`[${this.name}] Tool Result [${index}]:`, {
              toolName: result2.toolName,
              hasOutput: resultAny.output !== void 0,
              output: resultAny.output,
              providerExecuted: resultAny.providerExecuted
            });
          });
        }
      },
      // Override with any provided options
      ...aiSdkOptions,
      // Use experimental_generateMessageId to include agent name in message ID
      // @ts-ignore - experimental feature may not be in types yet
      experimental_generateMessageId: () => {
        return `${agentPrefix}_${generateShortId()}`;
      }
    });
    result.agentMetadata = {
      name: this.name
    };
    return result;
  }
  /**
   * Generate text - works with VibexMessage[] internally
   * Converts to ModelMessage[] only when calling AI SDK
   */
  async generateText(options) {
    const {
      messages: vibexMessages,
      system,
      spaceId,
      metadata,
      ...aiSdkOptions
    } = options;
    let enrichedMetadata = metadata || {};
    const lastUserMsg = vibexMessages.filter((m) => m.role === "user").pop();
    if (lastUserMsg?.metadata) {
      enrichedMetadata = { ...lastUserMsg.metadata, ...metadata };
    }
    const context = {
      spaceId: spaceId || "default",
      conversationHistory: new ConversationHistory(),
      metadata: enrichedMetadata
    };
    const basePrompt = this.getSystemPrompt(context);
    const systemPrompt = system ? `${basePrompt}

${system}` : basePrompt;
    const model = this.getModel({ spaceId, userId: enrichedMetadata.userId });
    const tools = await this.getTools({ spaceId });
    const modelMessages = vibexMessages.filter((m) => m.role !== "tool").map((m) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : Array.isArray(m.content) ? m.content.filter((p) => p.type === "text" && p.text).map((p) => p.text).join("\n") : ""
    })).filter((m) => m.content);
    return generateText({
      model,
      system: systemPrompt,
      messages: modelMessages,
      tools,
      temperature: this.temperature,
      maxRetries: 3,
      ...aiSdkOptions,
      // Add model-specific options if they exist
      ...this.maxTokens && { maxSteps: 5 },
      // generateText uses maxSteps not maxTokens
      ...this.topP && { topP: this.topP },
      ...this.frequencyPenalty && { frequencyPenalty: this.frequencyPenalty },
      ...this.presencePenalty && { presencePenalty: this.presencePenalty }
    });
  }
  /**
   * Get agent summary
   */
  getSummary() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      tools: this.tools,
      llmModel: `${this.provider}/${this.model}`
    };
  }
};

// src/orchestration/xagent.ts
import { getServerDataAdapter } from "@vibex/data";

// src/space/plan.ts
var Plan = class _Plan {
  constructor({ tasks = [], goal }) {
    __publicField(this, "tasks");
    __publicField(this, "goal");
    __publicField(this, "createdAt");
    __publicField(this, "updatedAt");
    this.tasks = tasks;
    this.goal = goal;
    this.createdAt = /* @__PURE__ */ new Date();
    this.updatedAt = /* @__PURE__ */ new Date();
  }
  addTask(task) {
    this.tasks.push(task);
    this.updatedAt = /* @__PURE__ */ new Date();
  }
  removeTask(taskId) {
    const index = this.tasks.findIndex((t) => t.id === taskId);
    if (index >= 0) {
      this.tasks.splice(index, 1);
      this.updatedAt = /* @__PURE__ */ new Date();
      return true;
    }
    return false;
  }
  getTaskById(taskId) {
    return this.tasks.find((t) => t.id === taskId);
  }
  updateTaskStatus(taskId, status) {
    const task = this.getTaskById(taskId);
    if (task) {
      task.status = status;
      task.updatedAt = /* @__PURE__ */ new Date();
      this.updatedAt = /* @__PURE__ */ new Date();
      return true;
    }
    return false;
  }
  getNextActionableTask() {
    return this.tasks.find((task) => task.isActionable());
  }
  getAllActionableTasks(maxTasks) {
    const actionableTasks = this.tasks.filter((task) => task.isActionable());
    return maxTasks ? actionableTasks.slice(0, maxTasks) : actionableTasks;
  }
  getTasksByStatus(status) {
    return this.tasks.filter((task) => task.status === status);
  }
  getTasksByAssignee(assignee) {
    return this.tasks.filter((task) => task.assignedTo === assignee);
  }
  isComplete() {
    return this.tasks.every(
      (task) => task.status === "completed" /* COMPLETED */ || task.status === "cancelled" /* CANCELLED */
    );
  }
  hasFailedTasks() {
    return this.tasks.some((task) => task.status === "failed" /* FAILED */);
  }
  hasBlockedTasks() {
    return this.tasks.some((task) => task.status === "blocked" /* BLOCKED */);
  }
  getProgressSummary() {
    const summary = {
      totalTasks: this.tasks.length,
      completedTasks: 0,
      runningTasks: 0,
      pendingTasks: 0,
      failedTasks: 0,
      blockedTasks: 0,
      progressPercentage: 0
    };
    for (const task of this.tasks) {
      switch (task.status) {
        case "completed" /* COMPLETED */:
          summary.completedTasks++;
          break;
        case "running" /* RUNNING */:
          summary.runningTasks++;
          break;
        case "pending" /* PENDING */:
          summary.pendingTasks++;
          break;
        case "failed" /* FAILED */:
          summary.failedTasks++;
          break;
        case "blocked" /* BLOCKED */:
          summary.blockedTasks++;
          break;
      }
    }
    if (summary.totalTasks > 0) {
      summary.progressPercentage = summary.completedTasks / summary.totalTasks * 100;
    }
    return summary;
  }
  reorderTasks(fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= this.tasks.length || toIndex < 0 || toIndex >= this.tasks.length) {
      throw new Error("Invalid task indices");
    }
    const [task] = this.tasks.splice(fromIndex, 1);
    this.tasks.splice(toIndex, 0, task);
    this.updatedAt = /* @__PURE__ */ new Date();
  }
  toJSON() {
    return {
      tasks: this.tasks.map((task) => task.toJSON()),
      goal: this.goal,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }
  static fromJSON(data) {
    const plan = new _Plan({
      goal: data.goal,
      tasks: data.tasks.map((taskData) => Task.fromJSON(taskData))
    });
    plan.createdAt = new Date(data.createdAt);
    plan.updatedAt = new Date(data.updatedAt);
    return plan;
  }
};

// src/orchestration/xagent.ts
import { generateObject } from "ai";
import { z } from "zod";

// src/workflow/engine.ts
import { EventEmitter } from "events";
import { v4 as uuidv4 } from "uuid";
var WorkflowEngine = class extends EventEmitter {
  constructor() {
    super();
    __publicField(this, "workflows", /* @__PURE__ */ new Map());
    __publicField(this, "contexts", /* @__PURE__ */ new Map());
  }
  /**
   * Register a workflow definition
   */
  registerWorkflow(workflow) {
    this.workflows.set(workflow.id, workflow);
  }
  /**
   * Start a workflow instance
   */
  async startWorkflow(workflowId, input = {}) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) throw new Error(`Workflow ${workflowId} not found`);
    const contextId = uuidv4();
    const context = {
      id: contextId,
      workflowId,
      variables: { ...workflow.variables, ...input },
      history: [],
      status: "running",
      input
    };
    this.contexts.set(contextId, context);
    const startStep = workflow.steps[0];
    if (startStep) {
      this.executeStep(contextId, startStep.id);
    }
    return contextId;
  }
  /**
   * Execute a specific step
   */
  async executeStep(contextId, stepId) {
    const context = this.contexts.get(contextId);
    if (!context) return;
    const workflow = this.workflows.get(context.workflowId);
    if (!workflow) return;
    const step = workflow.steps.find((s) => s.id === stepId);
    if (!step) return;
    context.currentStepId = stepId;
    this.emit("stepStart", { contextId, step });
    try {
      let result;
      switch (step.type) {
        case "agent":
          result = await this.executeAgentStep(context, step);
          break;
        case "human_input":
          context.status = "paused";
          this.emit("workflowPaused", {
            contextId,
            reason: "human_input",
            step
          });
          return;
        // Stop execution loop
        case "condition":
          const nextStepId = this.evaluateCondition(context, step);
          if (nextStepId) {
            await this.executeStep(contextId, nextStepId);
          }
          return;
      }
      if (result) {
        context.variables = { ...context.variables, ...result };
      }
      this.emit("stepComplete", { contextId, step, result });
      if (step.next) {
        const nextId = Array.isArray(step.next) ? step.next[0] : step.next;
        await this.executeStep(contextId, nextId);
      } else {
        context.status = "completed";
        context.output = context.variables;
        this.emit("workflowComplete", { contextId, output: context.output });
      }
    } catch (error) {
      context.status = "failed";
      context.error = error;
      this.emit("workflowFailed", { contextId, error });
    }
  }
  /**
   * Resume a paused workflow (e.g. after human input)
   */
  async resumeWorkflow(contextId, input) {
    const context = this.contexts.get(contextId);
    if (!context || context.status !== "paused") {
      throw new Error(`Workflow context ${contextId} is not paused`);
    }
    context.variables = { ...context.variables, ...input };
    context.status = "running";
    const workflow = this.workflows.get(context.workflowId);
    const step = workflow?.steps.find((s) => s.id === context.currentStepId);
    if (step && step.next) {
      const nextId = Array.isArray(step.next) ? step.next[0] : step.next;
      await this.executeStep(contextId, nextId);
    }
  }
  // Implementation details...
  async executeAgentStep(context, step) {
    const prompt = this.replaceVariables(step.config.prompt, context.variables);
    return { [step.id]: `Executed agent with prompt: ${prompt}` };
  }
  evaluateCondition(context, step) {
    return step.config.yes;
  }
  replaceVariables(template, variables) {
    return template.replace(
      /\{\{([^}]+)\}\}/g,
      (_, key) => variables[key.trim()] || ""
    );
  }
};

// src/orchestration/xagent.ts
var XAgent = class extends Agent {
  constructor(config, space, options) {
    const xConfig = {
      ...config,
      name: "X",
      description: `I am X, the conversational representative for this space. I manage all aspects of the space and coordinate with other agents to achieve our goals.`
    };
    super(xConfig);
    __publicField(this, "space");
    __publicField(this, "spaceId");
    __publicField(this, "abortController");
    __publicField(this, "singleAgentId");
    // If set, bypass planning
    __publicField(this, "workflowEngine");
    this.space = space;
    this.spaceId = space.spaceId;
    this.singleAgentId = options?.singleAgentId;
    this.workflowEngine = new WorkflowEngine();
    this.initializeWorkflowEngine();
  }
  initializeWorkflowEngine() {
    this.workflowEngine.on("stepStart", (data) => {
      this.addMessage(`[Workflow] Starting step: ${data.step.name}`, {
        type: "system",
        stepId: data.step.id
      });
    });
    this.workflowEngine.on("workflowPaused", (data) => {
      this.addMessage(`[Workflow] Paused: ${data.reason}`, {
        type: "system",
        status: "paused"
      });
    });
    this.workflowEngine.on("workflowComplete", (data) => {
      this.addMessage(`[Workflow] Completed successfully.`, {
        type: "system",
        status: "completed",
        output: data.output
      });
    });
    this.workflowEngine.on("workflowFailed", (data) => {
      this.addMessage(`[Workflow] Failed: ${data.error}`, {
        type: "system",
        status: "failed",
        error: data.error
      });
    });
  }
  /**
   * Execute a complex task using the Workflow Engine
   */
  async executeWorkflow(goal) {
    const workflow = await this.planWorkflow(goal);
    this.workflowEngine.registerWorkflow(workflow);
    return await this.workflowEngine.startWorkflow(workflow.id, { goal });
  }
  async planWorkflow(goal) {
    const agentsList = Array.from(this.space.agents.keys()).join(", ");
    const workflowSchema = z.object({
      name: z.string(),
      description: z.string(),
      steps: z.array(
        z.object({
          id: z.string(),
          type: z.enum(["agent", "tool", "human_input", "condition"]),
          name: z.string(),
          next: z.string().optional(),
          config: z.record(z.any())
        })
      )
    });
    const result = await generateObject({
      model: this.getModel(),
      system: `You are an expert workflow planner.
Available Agents: ${agentsList}
Generate a workflow to achieve the user's goal: "${goal}"
Use "human_input" if you need clarification or approval.
Use "condition" for decision points.`,
      prompt: goal,
      schema: workflowSchema
    });
    return {
      id: `wf-${Date.now()}`,
      version: "1.0",
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date(),
      ...result.object
    };
  }
  /**
   * Getter for space (needed for external access)
   */
  getSpace() {
    return this.space;
  }
  /**
   * Override getSystemPrompt to include plan and artifacts context
   */
  getSystemPrompt(context) {
    const basePrompt = super.getSystemPrompt(context);
    return basePrompt + this.getPlanContext() + this.getArtifactsContext();
  }
  /**
   * Generate text - uses new AI SDK-style signature
   */
  async generateText(options) {
    return super.generateText({
      ...options,
      spaceId: this.space.spaceId,
      metadata: {
        spaceName: this.space.name,
        spaceGoal: this.space.goal,
        ...options.metadata
      }
    });
  }
  /**
   * XAgent streamText - Orchestration Layer
   * Responsibilities: History management, agent delegation, persistence
   */
  async streamText(options) {
    const {
      messages,
      system: systemMessage,
      spaceId,
      metadata = {},
      ...restOptions
    } = options;
    console.log("[XAgent] Orchestration layer: starting streamText");
    const mode = metadata?.mode;
    if (!mode || mode !== "agent") {
      throw new Error("XAgent only supports 'agent' mode");
    }
    await this.updateSpaceHistory(messages, metadata);
    const streamResult = await this.handleAgentMode(
      messages,
      systemMessage,
      spaceId,
      metadata,
      restOptions
    );
    if (spaceId) {
      this.handleMessagePersistence(streamResult, messages, spaceId, metadata);
    }
    return streamResult;
  }
  /**
   * Agent Mode Handler - Direct delegation with performance optimization
   * Supports both single agent and parallel execution
   */
  async handleAgentMode(messages, systemMessage, spaceId, metadata, restOptions) {
    const parallelAgents = metadata.parallelAgents;
    if (parallelAgents && parallelAgents.length > 1) {
      return this.handleParallelExecution(
        parallelAgents,
        messages,
        systemMessage,
        spaceId,
        metadata,
        restOptions
      );
    }
    const targetAgent = metadata.requestedAgent;
    if (!targetAgent) {
      throw new Error("Agent mode requires requestedAgent in metadata");
    }
    console.log(`[XAgent] Agent mode: direct delegation to '${targetAgent}'`);
    let agent = this.space.getAgent(targetAgent);
    if (!agent) {
      console.log(`[XAgent] Loading agent '${targetAgent}' on demand`);
      const dataAdapter = getServerDataAdapter();
      const agentConfig = await dataAdapter.getAgent(targetAgent);
      if (!agentConfig) {
        throw new Error(`Agent '${targetAgent}' not found`);
      }
      agent = new Agent(agentConfig);
      this.space.registerAgent(targetAgent, agent);
    }
    const optimizedMessages = this.optimizeContextForAgent(messages);
    console.log(
      `[XAgent] Agent mode: using ${optimizedMessages.length} optimized messages`
    );
    return await agent.streamText({
      messages: optimizedMessages,
      system: systemMessage,
      spaceId,
      metadata: {
        ...metadata,
        delegationType: "direct",
        userId: this.space.userId
        // Pass space owner ID for tracking
      },
      ...restOptions
    });
  }
  /**
   * Handle parallel execution of multiple agents
   */
  async handleParallelExecution(agentIds, messages, systemMessage, spaceId, metadata, restOptions) {
    console.log(`[XAgent] Parallel execution: ${agentIds.length} agents`);
    const dataAdapter = getServerDataAdapter();
    for (const agentId of agentIds) {
      if (!this.space.getAgent(agentId)) {
        const agentConfig = await dataAdapter.getAgent(agentId);
        if (!agentConfig) {
          throw new Error(`Agent '${agentId}' not found`);
        }
        const agent = new Agent(agentConfig);
        this.space.registerAgent(agentId, agent);
      }
    }
    if (!this.space.parallelEngine) {
      throw new Error("Parallel execution engine not initialized");
    }
    const tasks = agentIds.map((agentId, index) => ({
      id: `parallel-${agentId}-${Date.now()}-${index}`,
      agentId,
      messages: this.optimizeContextForAgent(messages),
      system: systemMessage,
      metadata: {
        ...metadata,
        delegationType: "parallel",
        userId: this.space.userId,
        parallelIndex: index
      },
      priority: agentIds.length - index
      // First agent gets highest priority
    }));
    const results = await this.space.parallelEngine.executeParallel(tasks);
    return {
      text: results.map((r) => `[${r.agentId}]: ${r.result.text}`).join("\n\n"),
      toolCalls: results.flatMap((r) => r.result.toolCalls || []),
      metadata: {
        ...metadata,
        parallelResults: results,
        agentCount: agentIds.length
      }
    };
  }
  /**
   * Update space history with new messages
   * Now supports per-task history
   */
  async updateSpaceHistory(messages, metadata) {
    const taskId = metadata?.taskId || metadata?.conversationId || "default";
    const task = this.space.getOrCreateTask(taskId);
    const existingMessages = task.history.getMessages();
    const newMessages = messages.slice(existingMessages.length);
    if (newMessages.length > 0) {
      for (const msg of newMessages) {
        const formattedMsg = {
          ...msg,
          content: typeof msg.content === "string" ? msg.content : Array.isArray(msg.content) ? msg.content : [{ type: "text", text: msg.content }]
        };
        task.history.add(formattedMsg);
      }
      console.log(
        `[XAgent] Updated task ${taskId} history with ${newMessages.length} new messages`
      );
    }
  }
  /**
   * Optimize message context for single-agent performance
   */
  optimizeContextForAgent(messages) {
    return messages.slice(-4);
  }
  /**
   * Extract user prompt from messages for orchestration
   */
  extractPromptFromMessages(messages) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "user") {
      const content = lastMessage.content;
      if (typeof content === "string") {
        return content;
      } else if (Array.isArray(content)) {
        return content.filter((part) => part.type === "text" && part.text).map((part) => part.text).join(" ");
      }
    }
    return "";
  }
  /**
   * Handle message persistence after streaming completes
   */
  handleMessagePersistence(streamResult, messages, spaceId, metadata) {
    (async () => {
      try {
        let finalText = "";
        const toolInvocations = [];
        for await (const part of streamResult.fullStream) {
          switch (part.type) {
            case "text-delta":
              if (part.text) {
                finalText += part.text;
              }
              break;
            case "tool-call":
              toolInvocations.push({
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                args: part.args
              });
              break;
            case "tool-result":
              const toolCall = toolInvocations.find(
                (t) => t.toolCallId === part.toolCallId
              );
              if (toolCall) {
                toolCall.result = part.result;
              }
              break;
            case "finish":
              break;
            case "error":
              console.error("[XAgent] Stream error:", part.error);
              return;
          }
        }
        const assistantMessage = {
          role: "assistant",
          content: [{ type: "text", text: finalText }],
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          metadata: {
            agentName: this.singleAgentId || "team",
            spaceId,
            timestamp: Date.now(),
            ...metadata
          },
          ...toolInvocations.length > 0 && { toolInvocations }
        };
        const updatedMessages = [...messages, assistantMessage];
      } catch (error) {
        console.error("[XAgent] Failed to persist messages:", error);
      }
    })();
  }
  /**
   * Save space to storage
   */
  async saveSpace() {
    try {
      console.log("[XAgent] Space persistence handled by database adapter");
    } catch (error) {
      console.error("[XAgent] Error saving space:", error);
    }
  }
  /**
   * Stop current operation
   */
  stop() {
    this.space.messageQueue.clear();
    if (this.abortController) {
      this.abortController.abort();
    }
  }
  /**
   * Add message to queue (soft interrupt)
   */
  addMessage(message, metadata) {
    return this.space.messageQueue.add(message, metadata);
  }
  /**
   * Enrich context with space information
   */
  enrichContext(context) {
    return {
      spaceId: this.space.spaceId,
      conversationHistory: this.space.history,
      metadata: {
        spaceName: this.space.name,
        spaceGoal: this.space.goal,
        ...context?.metadata
      },
      ...context
    };
  }
  /**
   * Create or update the space plan
   */
  async createPlan(goal) {
    const planGoal = goal || this.space.goal;
    const planSchema = z.object({
      tasks: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          description: z.string(),
          assignedTo: z.string().optional(),
          priority: z.enum(["low", "medium", "high"]).default("medium"),
          estimatedTime: z.string().optional(),
          dependencies: z.array(
            z.object({
              taskId: z.string(),
              type: z.enum(["required", "optional"])
            })
          ).default([]),
          tags: z.array(z.string()).default([])
        })
      )
    });
    const result = await generateObject({
      model: this.getModel(),
      system: this.getSystemPrompt() + "\n\nCreate a detailed plan to achieve the goal.",
      prompt: `Goal: ${planGoal}

Available agents: ${Array.from(
        this.space.agents.keys()
      ).join(", ")}`,
      schema: planSchema
    });
    const tasks = result.object.tasks.map(
      (taskData) => new Task({
        ...taskData,
        status: "pending" /* PENDING */
      })
    );
    const plan = new Plan({
      goal: planGoal,
      tasks
    });
    await this.space.createPlan(plan);
    return plan;
  }
  /**
   * Adapt the plan based on new information or user feedback
   */
  async adaptPlan(feedback) {
    if (!this.space.plan) {
      return this.createPlan(feedback);
    }
    const currentPlan = this.space.plan;
    const progress = currentPlan.getProgressSummary();
    const adaptSchema = z.object({
      preserveTasks: z.array(z.string()).describe("IDs of tasks to keep unchanged"),
      modifyTasks: z.array(
        z.object({
          id: z.string(),
          changes: z.object({
            title: z.string().optional(),
            description: z.string().optional(),
            priority: z.enum(["low", "medium", "high"]).optional(),
            assignedTo: z.string().optional()
          })
        })
      ).describe("Tasks to modify"),
      removeTasks: z.array(z.string()).describe("IDs of tasks to remove"),
      addTasks: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          description: z.string(),
          assignedTo: z.string().optional(),
          priority: z.enum(["low", "medium", "high"]).default("medium"),
          dependencies: z.array(
            z.object({
              taskId: z.string(),
              type: z.enum(["required", "optional"])
            })
          ).default([]),
          tags: z.array(z.string()).default([])
        })
      ).describe("New tasks to add"),
      reasoning: z.string().describe("Explanation of the plan changes")
    });
    const prompt = `
Current Plan Progress:
- Total tasks: ${progress.totalTasks}
- Completed: ${progress.completedTasks}
- In Progress: ${progress.runningTasks}
- Pending: ${progress.pendingTasks}

Current Tasks:
${currentPlan.tasks.map((t) => `- [${t.id}] ${t.title} (${t.status})`).join("\n")}

User Feedback: ${feedback}

Analyze the current plan and adapt it based on the user's feedback.
Keep completed tasks unless explicitly asked to redo them.
Preserve tasks that are still relevant.
Modify, remove, or add tasks as needed to better achieve the goal.
`;
    const result = await generateObject({
      model: this.getModel(),
      system: this.getSystemPrompt() + "\n\nAdapt the existing plan based on user feedback.",
      prompt,
      schema: adaptSchema
    });
    const adaptedTasks = [];
    for (const taskId of result.object.preserveTasks) {
      const task = currentPlan.tasks.find((t) => t.id === taskId);
      if (task) {
        adaptedTasks.push(task);
      }
    }
    for (const modification of result.object.modifyTasks) {
      const task = currentPlan.tasks.find((t) => t.id === modification.id);
      if (task) {
        if (modification.changes.title) task.title = modification.changes.title;
        if (modification.changes.description)
          task.description = modification.changes.description;
        if (modification.changes.priority)
          task.priority = modification.changes.priority;
        if (modification.changes.assignedTo)
          task.assignedTo = modification.changes.assignedTo;
        adaptedTasks.push(task);
      }
    }
    for (const newTaskData of result.object.addTasks) {
      const newTask = new Task({
        ...newTaskData,
        status: "pending" /* PENDING */
      });
      adaptedTasks.push(newTask);
    }
    const adaptedPlan = new Plan({
      goal: currentPlan.goal,
      tasks: adaptedTasks
    });
    await this.space.createPlan(adaptedPlan);
    console.log("[Plan Adaptation]", result.object.reasoning);
    return adaptedPlan;
  }
  /**
   * Get plan context for system prompt
   */
  getPlanContext() {
    if (!this.space.plan) {
      return "\n\nNo active plan for this space yet.";
    }
    const summary = this.space.plan.getProgressSummary();
    return `
Current Plan Status:
- Total tasks: ${summary.totalTasks}
- Completed: ${summary.completedTasks}
- Running: ${summary.runningTasks}
- Pending: ${summary.pendingTasks}
- Failed: ${summary.failedTasks}
- Progress: ${summary.progressPercentage.toFixed(1)}%
`;
  }
  /**
   * Get artifacts context for system prompt
   */
  getArtifactsContext() {
    if (!this.space.artifacts || this.space.artifacts.length === 0) {
      return "";
    }
    const artifactsList = this.space.artifacts.map((a) => `- ${a.title || a.path} (${a.artifactType || "document"})`).join("\n");
    return `
Available Artifacts:
${artifactsList}

These artifacts are pre-loaded in the space and can be referenced in your responses.
`;
  }
  /**
   * Get XAgent summary
   */
  getSummary() {
    const base = super.getSummary();
    return {
      ...base,
      spaceId: this.space.spaceId,
      spaceName: this.space.name,
      spaceGoal: this.space.goal,
      planStatus: this.space.plan?.getProgressSummary()
    };
  }
  /**
   * Static factory to start a new space
   */
  static async start(goal, options = {}) {
    const { spaceId, model, singleAgentId } = options;
    const id = spaceId || `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const { startSpace: startSpace2 } = await import("./space-7PJVXZYP.mjs");
    const space = await startSpace2({
      spaceId: id,
      goal,
      name: goal.slice(0, 50),
      model
    });
    if (!space.xAgent) {
      throw new Error("Failed to initialize XAgent");
    }
    if (singleAgentId) {
      space.xAgent.singleAgentId = singleAgentId;
    }
    return space.xAgent;
  }
  /**
   * Static factory to resume an existing space
   */
  static async resume(spaceId, options = {}) {
    const { model } = options;
    const { SpaceStorageFactory: SpaceStorageFactory2 } = await import("@vibex/data");
    const { startSpace: startSpace2 } = await import("./space-7PJVXZYP.mjs");
    const exists = await SpaceStorageFactory2.exists(spaceId);
    if (!exists) {
      throw new Error(`Space ${spaceId} not found`);
    }
    const storage = await SpaceStorageFactory2.create(spaceId);
    const spaceData = await storage.readJSON("space.json");
    if (!spaceData) {
      throw new Error(`Failed to load space ${spaceId}`);
    }
    const space = await startSpace2({
      spaceId,
      goal: spaceData.goal,
      name: spaceData.name,
      model: model || spaceData.model
    });
    if (!space.xAgent) {
      throw new Error("Failed to initialize XAgent");
    }
    const agentId = options.singleAgentId || spaceData.singleAgentId;
    if (agentId) {
      space.xAgent.singleAgentId = agentId;
    }
    const messages = await storage.readJSON("messages.json");
    if (messages && Array.isArray(messages)) {
      space.history.clear();
      for (const msg of messages) {
        const normalizedMsg = { ...msg };
        if (typeof msg.content === "string") {
          normalizedMsg.content = [{ type: "text", text: msg.content }];
        }
        space.history.add(normalizedMsg);
      }
    }
    return space.xAgent;
  }
};

// src/space/space.ts
import { SpaceStorageFactory } from "@vibex/data";

// src/orchestration/collaboration.ts
var AgentCollaborationManager = class {
  constructor(space) {
    __publicField(this, "space");
    __publicField(this, "messageQueue");
    // Agent ID -> messages
    __publicField(this, "sharedContext");
    __publicField(this, "listeners");
    this.space = space;
    this.messageQueue = /* @__PURE__ */ new Map();
    this.sharedContext = {
      spaceId: space.spaceId,
      data: {},
      updatedAt: /* @__PURE__ */ new Date(),
      updatedBy: "system"
    };
    this.listeners = /* @__PURE__ */ new Map();
  }
  /**
   * Send a message from one agent to another
   */
  sendMessage(from, to, content, metadata) {
    const message = {
      from,
      to,
      content,
      metadata,
      timestamp: /* @__PURE__ */ new Date()
    };
    if (to === "broadcast") {
      for (const agentId of this.space.agents.keys()) {
        if (agentId !== from) {
          this.queueMessage(agentId, message);
        }
      }
    } else {
      this.queueMessage(to, message);
    }
    this.notifyListeners(to, message);
    if (to !== "broadcast") {
      this.notifyListeners("broadcast", message);
    }
  }
  /**
   * Queue a message for an agent
   */
  queueMessage(agentId, message) {
    if (!this.messageQueue.has(agentId)) {
      this.messageQueue.set(agentId, []);
    }
    this.messageQueue.get(agentId).push(message);
  }
  /**
   * Get pending messages for an agent
   */
  getMessages(agentId) {
    const messages = this.messageQueue.get(agentId) || [];
    this.messageQueue.set(agentId, []);
    return messages;
  }
  /**
   * Subscribe to messages for an agent
   */
  subscribe(agentId, callback) {
    if (!this.listeners.has(agentId)) {
      this.listeners.set(agentId, /* @__PURE__ */ new Set());
    }
    this.listeners.get(agentId).add(callback);
    return () => {
      const callbacks = this.listeners.get(agentId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(agentId);
        }
      }
    };
  }
  /**
   * Notify listeners of a new message
   */
  notifyListeners(agentId, message) {
    const callbacks = this.listeners.get(agentId);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(message);
        } catch (error) {
          console.error(`[AgentCollaborationManager] Listener error:`, error);
        }
      });
    }
  }
  /**
   * Update shared context
   */
  updateContext(agentId, updates) {
    this.sharedContext.data = {
      ...this.sharedContext.data,
      ...updates
    };
    this.sharedContext.updatedAt = /* @__PURE__ */ new Date();
    this.sharedContext.updatedBy = agentId;
  }
  /**
   * Get shared context
   */
  getContext() {
    return { ...this.sharedContext };
  }
  /**
   * Get a specific value from shared context
   */
  getContextValue(key) {
    return this.sharedContext.data[key];
  }
};
var ParallelExecutionEngine = class {
  constructor(space, maxConcurrency = 3) {
    __publicField(this, "space");
    __publicField(this, "maxConcurrency");
    __publicField(this, "activeTasks");
    this.space = space;
    this.maxConcurrency = maxConcurrency;
    this.activeTasks = /* @__PURE__ */ new Map();
  }
  /**
   * Execute multiple tasks in parallel
   */
  async executeParallel(tasks) {
    const sortedTasks = [...tasks].sort(
      (a, b) => (b.priority || 0) - (a.priority || 0)
    );
    const results = [];
    const executing = [];
    for (const task of sortedTasks) {
      if (executing.length >= this.maxConcurrency) {
        const completed = await Promise.race(executing);
        const index = executing.findIndex(
          (p) => p === Promise.resolve(completed)
        );
        if (index >= 0) {
          executing.splice(index, 1);
        }
        results.push(completed);
      }
      const promise = this.executeTask(task);
      executing.push(promise);
      this.activeTasks.set(task.id, promise);
    }
    const remaining = await Promise.allSettled(executing);
    for (const result of remaining) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        console.error("[ParallelExecutionEngine] Task failed:", result.reason);
      }
    }
    this.activeTasks.clear();
    return results;
  }
  /**
   * Execute a single task
   */
  async executeTask(task) {
    const startTime = Date.now();
    try {
      const agent = this.space.getAgent(task.agentId);
      if (!agent) {
        throw new Error(`Agent ${task.agentId} not found`);
      }
      const result = await agent.generateText({
        messages: task.messages,
        system: task.system,
        spaceId: this.space.spaceId,
        metadata: {
          ...task.metadata,
          parallelTaskId: task.id
        }
      });
      const duration = Date.now() - startTime;
      return {
        taskId: task.id,
        agentId: task.agentId,
        result: {
          text: result.text || "",
          toolCalls: result.toolCalls,
          reasoning: result.reasoning,
          metadata: result.metadata
        },
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        taskId: task.id,
        agentId: task.agentId,
        result: {
          text: "",
          metadata: { error: String(error) }
        },
        error: error instanceof Error ? error : new Error(String(error)),
        duration
      };
    }
  }
  /**
   * Cancel a running task
   */
  cancelTask(taskId) {
    const task = this.activeTasks.get(taskId);
    if (task) {
      this.activeTasks.delete(taskId);
    }
  }
  /**
   * Get active task count
   */
  getActiveTaskCount() {
    return this.activeTasks.size;
  }
};
var CollaborativePlanner = class {
  constructor(space, collaborationManager) {
    __publicField(this, "space");
    __publicField(this, "collaborationManager");
    this.space = space;
    this.collaborationManager = collaborationManager;
  }
  /**
   * Create a collaborative plan with multiple agents
   */
  async createCollaborativePlan(goal, agentIds) {
    const context = this.collaborationManager.getContext();
    const planningTasks = agentIds.map((agentId, index) => ({
      id: `plan-${agentId}-${Date.now()}`,
      agentId,
      messages: [
        {
          role: "user",
          content: `We need to create a collaborative plan for: ${goal}

Shared context: ${JSON.stringify(context.data, null, 2)}

You are one of ${agentIds.length} agents working together. Propose your part of the plan and identify dependencies on other agents.`
        }
      ],
      priority: agentIds.length - index,
      // First agent gets highest priority
      metadata: {
        planningSession: true,
        goal,
        otherAgents: agentIds.filter((id) => id !== agentId)
      }
    }));
    const executionEngine = new ParallelExecutionEngine(this.space);
    const results = await executionEngine.executeParallel(planningTasks);
    const agentPlans = /* @__PURE__ */ new Map();
    for (const result of results) {
      if (!result.error) {
        agentPlans.set(result.agentId, result.result);
      }
    }
    const plan = this.mergePlans(agentPlans, goal);
    const agentAssignments = this.assignTasks(plan, agentIds);
    return { plan, agentAssignments };
  }
  /**
   * Merge multiple agent plans into one
   */
  mergePlans(agentPlans, goal) {
    const tasks = [];
    let taskId = 1;
    for (const [agentId, plan] of agentPlans.entries()) {
      if (plan.text) {
        const lines = plan.text.split("\n").filter(
          (line) => line.trim().startsWith("-") || line.trim().match(/^\d+\./)
        );
        for (const line of lines) {
          tasks.push({
            id: `task-${taskId++}`,
            description: line.replace(/^[-•\d.]+\s*/, "").trim(),
            assignedAgent: agentId,
            status: "pending"
          });
        }
      }
    }
    return {
      goal,
      tasks,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  /**
   * Assign tasks to agents
   */
  assignTasks(plan, agentIds) {
    const assignments = /* @__PURE__ */ new Map();
    for (const agentId of agentIds) {
      assignments.set(agentId, []);
    }
    for (const task of plan.tasks) {
      const agentId = task.assignedAgent || agentIds[0];
      const tasks = assignments.get(agentId) || [];
      tasks.push(task.id);
      assignments.set(agentId, tasks);
    }
    return assignments;
  }
};

// src/space/space.ts
var Space = class {
  constructor({
    spaceId,
    userId,
    config,
    history,
    messageQueue,
    agents,
    storage,
    goal,
    name,
    xAgent
  }) {
    __publicField(this, "spaceId");
    __publicField(this, "userId");
    // User ID of space owner
    __publicField(this, "config");
    __publicField(this, "history");
    // Legacy: primary task history
    __publicField(this, "tasks");
    // NEW: Multiple tasks
    __publicField(this, "messageQueue");
    __publicField(this, "agents");
    __publicField(this, "storage");
    __publicField(this, "goal");
    __publicField(this, "name");
    __publicField(this, "xAgent");
    __publicField(this, "createdAt");
    __publicField(this, "updatedAt");
    __publicField(this, "plan");
    __publicField(this, "artifacts");
    __publicField(this, "collaborationManager");
    __publicField(this, "parallelEngine");
    __publicField(this, "collaborativePlanner");
    this.spaceId = spaceId;
    this.userId = userId;
    this.config = config;
    this.history = history;
    this.tasks = /* @__PURE__ */ new Map();
    this.messageQueue = messageQueue;
    this.agents = agents;
    this.storage = storage;
    this.goal = goal;
    this.name = name || `Space ${spaceId}`;
    this.xAgent = xAgent;
    this.createdAt = /* @__PURE__ */ new Date();
    this.updatedAt = /* @__PURE__ */ new Date();
    this.collaborationManager = new AgentCollaborationManager(this);
    this.parallelEngine = new ParallelExecutionEngine(this);
    this.collaborativePlanner = new CollaborativePlanner(
      this,
      this.collaborationManager
    );
  }
  /**
   * Get or create a task within this space
   */
  getOrCreateTask(taskId, title) {
    if (!this.tasks.has(taskId)) {
      const task = {
        id: taskId,
        spaceId: this.spaceId,
        title: title || `Task ${taskId}`,
        history: new ConversationHistory(),
        artifactIds: [],
        status: "active",
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      };
      this.tasks.set(taskId, task);
      console.log(`[Space] Created task ${taskId} in space ${this.spaceId}`);
    }
    return this.tasks.get(taskId);
  }
  /**
   * Get task by ID
   */
  getTask(taskId) {
    return this.tasks.get(taskId);
  }
  /**
   * Get all tasks in this space
   */
  getAllTasks() {
    return Array.from(this.tasks.values());
  }
  /**
   * Update space task status (for conversation tasks, not Plan tasks)
   */
  updateSpaceTaskStatus(taskId, status) {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = status;
      task.updatedAt = /* @__PURE__ */ new Date();
      return true;
    }
    return false;
  }
  getAgent(name) {
    return this.agents.get(name);
  }
  registerAgent(name, agent) {
    this.agents.set(name, agent);
    console.log(`[Space] Registered agent: ${name} - ${agent.description}`);
  }
  complete() {
    console.log(`Space ${this.spaceId} completed`);
  }
  getContext() {
    const context = {
      spaceId: this.spaceId,
      goal: this.goal,
      storagePath: this.storage.getSpacePath(),
      agents: Array.from(this.agents.keys()),
      historyLength: this.history.messages.length,
      createdAt: this.createdAt.toISOString()
    };
    if (this.plan) {
      context.plan = {
        goal: this.goal,
        totalTasks: this.plan.tasks.length,
        progress: this.plan.getProgressSummary()
      };
    }
    return context;
  }
  async createPlan(plan) {
    this.plan = plan;
    await this.persistState();
    console.log(
      `Created plan for space ${this.spaceId} with ${plan.tasks.length} tasks`
    );
  }
  async updatePlan(plan) {
    this.plan = plan;
    this.updatedAt = /* @__PURE__ */ new Date();
    await this.persistState();
    console.log(`Updated plan for space ${this.spaceId}`);
  }
  async setName(name) {
    this.name = name;
    this.updatedAt = /* @__PURE__ */ new Date();
    await this.persistState();
    console.log(`Updated space ${this.spaceId} name to: ${name}`);
  }
  async getNextTask() {
    if (!this.plan) {
      return void 0;
    }
    return this.plan.getNextActionableTask();
  }
  async getParallelTasks(maxTasks = 3) {
    if (!this.plan) {
      return [];
    }
    return this.plan.getAllActionableTasks(maxTasks);
  }
  async updateTaskStatus(taskId, status) {
    if (!this.plan) {
      return false;
    }
    const success = this.plan.updateTaskStatus(taskId, status);
    if (success) {
      this.updatedAt = /* @__PURE__ */ new Date();
      await this.persistState();
      console.log(`Updated task ${taskId} status to ${status}`);
    }
    return success;
  }
  async assignTask(taskId, agentName) {
    if (!this.plan) {
      return false;
    }
    const task = this.plan.getTaskById(taskId);
    if (!task) {
      return false;
    }
    if (!this.agents.has(agentName)) {
      console.error(`Agent '${agentName}' not found in space team`);
      return false;
    }
    task.assignedTo = agentName;
    this.updatedAt = /* @__PURE__ */ new Date();
    await this.persistState();
    console.log(`Assigned task ${taskId} to agent ${agentName}`);
    return true;
  }
  isPlanComplete() {
    if (!this.plan) {
      return false;
    }
    return this.plan.isComplete();
  }
  hasFailedTasks() {
    if (!this.plan) {
      return false;
    }
    return this.plan.hasFailedTasks();
  }
  async persistState() {
    console.log("[Space] State persistence handled by database adapter");
  }
  async loadState() {
    try {
      console.log("[Space] State loading handled by database adapter");
      return false;
    } catch (error) {
      console.error("Failed to load space state:", error);
    }
    return false;
  }
  async loadPlan() {
    if (await this.loadState()) {
      return this.plan;
    }
    return void 0;
  }
  getState() {
    const state = {
      spaceId: this.spaceId,
      name: this.name,
      goal: this.goal,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      teamSize: this.agents.size
    };
    if (this.plan) {
      const taskStats = {
        total: this.plan.tasks.length,
        completed: this.plan.tasks.filter(
          (t) => t.status === "completed" /* COMPLETED */
        ).length,
        running: this.plan.tasks.filter((t) => t.status === "running" /* RUNNING */).length,
        pending: this.plan.tasks.filter((t) => t.status === "pending" /* PENDING */).length,
        failed: this.plan.tasks.filter((t) => t.status === "failed" /* FAILED */).length
      };
      state.tasks = taskStats;
      state.progressPercentage = taskStats.total > 0 ? taskStats.completed / taskStats.total * 100 : 0;
    }
    return state;
  }
};
async function startSpace({
  goal,
  spaceId,
  userId,
  name,
  model
}) {
  const id = spaceId || `proj_${Date.now().toString(36)}`;
  const spaceConfig = {
    name: name || goal.slice(0, 50),
    autoSave: true,
    checkpointInterval: 300
  };
  console.log(`[Space] Creating space - agents will be loaded on demand`);
  const storage = await SpaceStorageFactory.create(id);
  const agents = /* @__PURE__ */ new Map();
  console.log(`[Space] Space initialized (agents loaded on demand)`);
  const messageQueue = new MessageQueue();
  const history = new ConversationHistory();
  const space = new Space({
    spaceId: id,
    userId,
    config: spaceConfig,
    history,
    messageQueue,
    agents,
    storage,
    goal,
    name: name || spaceConfig.name
  });
  const xAgentConfig = {
    name: "X",
    description: "I manage this space and coordinate all work.",
    provider: "deepseek",
    model: model || "deepseek-chat",
    temperature: 0.7,
    promptFile: ""
    // XAgent doesn't use prompt files
  };
  const xAgent = new XAgent(xAgentConfig, space, {
    model,
    spaceId: id
  });
  space.xAgent = xAgent;
  await space.persistState();
  return space;
}

export {
  TaskStatus,
  Task,
  getTextContent,
  MessageQueue,
  ConversationHistory,
  getModelProvider,
  isProviderConfigured,
  getConfiguredProviders,
  parseModelString,
  getModelContextLimit,
  getCompletionTokens,
  buildToolMap,
  clearToolCache,
  generateShortId,
  generateSpaceId,
  validateId,
  Agent,
  Plan,
  WorkflowEngine,
  XAgent,
  AgentCollaborationManager,
  ParallelExecutionEngine,
  CollaborativePlanner,
  Space,
  startSpace
};
