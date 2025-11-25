"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/space/task.ts
var TaskStatus, Task;
var init_task = __esm({
  "src/space/task.ts"() {
    "use strict";
    TaskStatus = /* @__PURE__ */ ((TaskStatus2) => {
      TaskStatus2["PENDING"] = "pending";
      TaskStatus2["RUNNING"] = "running";
      TaskStatus2["COMPLETED"] = "completed";
      TaskStatus2["FAILED"] = "failed";
      TaskStatus2["BLOCKED"] = "blocked";
      TaskStatus2["CANCELLED"] = "cancelled";
      return TaskStatus2;
    })(TaskStatus || {});
    Task = class _Task {
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
  }
});

// src/utils/paths.ts
function getVibexRoot() {
  return process.env.VIBEX_STORAGE_PATH || import_path.default.join(import_os.default.homedir(), ".vibex");
}
function getVibexPath(...subPaths) {
  return import_path.default.join(getVibexRoot(), ...subPaths);
}
var import_path, import_os, VibexPaths;
var init_paths = __esm({
  "src/utils/paths.ts"() {
    "use strict";
    import_path = __toESM(require("path"));
    import_os = __toESM(require("os"));
    VibexPaths = {
      root: () => getVibexRoot(),
      config: () => getVibexPath("config"),
      spaces: () => getVibexPath("spaces"),
      defaults: () => getVibexPath("defaults"),
      // MCP server organization
      mcpServers: () => getVibexPath("mcp-servers"),
      mcpServerShared: () => getVibexPath("mcp-servers", "shared"),
      // Specific paths
      agents: () => getVibexPath("agents"),
      datasets: () => getVibexPath("config", "datasets"),
      tools: () => getVibexPath("config", "tools"),
      // MCP server paths - now using npm package
      officeMcpServer: () => "office-mcp",
      // npm package name
      officeMcpExecutable: () => "office-mcp",
      // npm package command
      // Default templates and configuration
      defaultsAgents: () => getVibexPath("defaults", "agents"),
      defaultsSpaces: () => getVibexPath("defaults", "spaces"),
      // Space-specific paths
      space: (spaceId) => getVibexPath("spaces", spaceId),
      spaceArtifacts: (spaceId) => getVibexPath("spaces", spaceId, "artifacts")
      // Note: MCP servers are now distributed as npm packages, not local binaries
    };
  }
});

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
var MessageQueue, ConversationHistory;
var init_message = __esm({
  "src/space/message.ts"() {
    "use strict";
    MessageQueue = class {
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
    ConversationHistory = class {
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
  }
});

// src/agent/provider.ts
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
      return (0, import_anthropic.createAnthropic)({
        apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
        baseURL: baseURL || process.env.ANTHROPIC_BASE_URL
      });
    case "openai":
      return (0, import_openai.createOpenAI)({
        apiKey: apiKey || process.env.OPENAI_API_KEY,
        baseURL: baseURL || process.env.OPENAI_BASE_URL
      });
    case "deepseek":
      return import_deepseek.deepseek;
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
      return (0, import_ai_sdk_provider.createOpenRouter)(openrouterConfig);
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
var import_anthropic, import_openai, import_deepseek, import_ai_sdk_provider;
var init_provider = __esm({
  "src/agent/provider.ts"() {
    "use strict";
    import_anthropic = require("@ai-sdk/anthropic");
    import_openai = require("@ai-sdk/openai");
    import_deepseek = require("@ai-sdk/deepseek");
    import_ai_sdk_provider = require("@openrouter/ai-sdk-provider");
  }
});

// src/agent/tool.ts
async function buildToolMap(toolIds, context) {
  const tools = {};
  const { getServerDataAdapter: getServerDataAdapter3 } = await import("@vibex/data");
  const adapter = getServerDataAdapter3();
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
    try {
      const toolsModule = await import("@vibex/tools");
      const buildCustomToolMap = toolsModule.buildToolMap;
      if (buildCustomToolMap) {
        const customTools = buildCustomToolMap(customToolIds, context);
        Object.assign(tools, customTools);
      }
    } catch (error) {
      console.warn(
        `[Tools] Failed to load custom tools from @vibex/tools:`,
        error
      );
    }
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
  for (const [serverId, _toolIds] of serverGroups) {
    try {
      let mcpClient = mcpClients.get(serverId);
      if (!mcpClient) {
        console.warn(
          `[Tools] MCP support not yet implemented for server: ${serverId}`
        );
        continue;
      }
    } catch (error) {
      console.error(`[Tools] Failed to load MCP server ${serverId}:`, error);
    }
  }
  return tools;
}
function clearToolCache() {
  mcpClients.clear();
}
var mcpClients;
var init_tool = __esm({
  "src/agent/tool.ts"() {
    "use strict";
    mcpClients = /* @__PURE__ */ new Map();
  }
});

// src/utils/id.ts
function generateShortId(length = 8) {
  const nanoid = (0, import_nanoid.customAlphabet)(ALPHABET_SAFE, length);
  let id = nanoid();
  while (!/^[a-zA-Z]/.test(id)) {
    id = nanoid();
  }
  return id;
}
function generateSpaceId() {
  return generateShortId(8);
}
function validateId(id) {
  if (!id || typeof id !== "string" || id.trim() === "") {
    return false;
  }
  const idPattern = /^[a-zA-Z][a-zA-Z0-9_]*$/;
  return idPattern.test(id);
}
var import_nanoid, ALPHABET_SAFE;
var init_id = __esm({
  "src/utils/id.ts"() {
    "use strict";
    import_nanoid = require("nanoid");
    ALPHABET_SAFE = "abcdefghijklmnopqrstuvwxyz0123456789_ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  }
});

// src/agent/agent.ts
var import_ai, Agent;
var init_agent = __esm({
  "src/agent/agent.ts"() {
    "use strict";
    import_ai = require("ai");
    init_paths();
    init_message();
    init_provider();
    init_tool();
    init_id();
    Agent = class {
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
      registerTool(name, tool2) {
        this.customTools.set(name, tool2);
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
        for (const [name, tool2] of this.customTools.entries()) {
          toolsMap[name] = tool2;
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
          tools: Object.entries(tools || {}).map(([id, tool2]) => ({
            id,
            name: tool2.name || id,
            description: tool2.description,
            functions: Object.keys(tool2.functions || {})
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
        const result = (0, import_ai.streamText)({
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
        return (0, import_ai.generateText)({
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
  }
});

// src/space/plan.ts
var Plan;
var init_plan = __esm({
  "src/space/plan.ts"() {
    "use strict";
    init_task();
    Plan = class _Plan {
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
  }
});

// src/workflow/engine.ts
var import_events, import_uuid, WorkflowEngine;
var init_engine = __esm({
  "src/workflow/engine.ts"() {
    "use strict";
    import_events = require("events");
    import_uuid = require("uuid");
    WorkflowEngine = class extends import_events.EventEmitter {
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
        const contextId = (0, import_uuid.v4)();
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
        void context;
        return step.config.yes;
      }
      replaceVariables(template, variables) {
        return template.replace(
          /\{\{([^}]+)\}\}/g,
          (_, key) => variables[key.trim()] || ""
        );
      }
    };
  }
});

// src/orchestration/xagent.ts
var import_data, import_ai2, import_zod, XAgent;
var init_xagent = __esm({
  "src/orchestration/xagent.ts"() {
    "use strict";
    init_agent();
    import_data = require("@vibex/data");
    init_plan();
    init_task();
    import_ai2 = require("ai");
    import_zod = require("zod");
    init_engine();
    XAgent = class extends Agent {
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
        const workflowSchema = import_zod.z.object({
          name: import_zod.z.string(),
          description: import_zod.z.string(),
          steps: import_zod.z.array(
            import_zod.z.object({
              id: import_zod.z.string(),
              type: import_zod.z.enum(["agent", "tool", "human_input", "condition"]),
              name: import_zod.z.string(),
              next: import_zod.z.string().optional(),
              config: import_zod.z.record(import_zod.z.any())
            })
          )
        });
        const result = await (0, import_ai2.generateObject)({
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
        const metadata = options.metadata || {};
        return super.generateText({
          ...options,
          spaceId: this.space.spaceId,
          metadata: {
            spaceName: this.space.name,
            spaceGoal: this.space.goal,
            ...metadata
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
          const dataAdapter = (0, import_data.getServerDataAdapter)();
          const agentConfig = await dataAdapter.getAgent(targetAgent);
          if (!agentConfig) {
            throw new Error(`Agent '${targetAgent}' not found`);
          }
          if (typeof agentConfig !== "object" || agentConfig === null) {
            throw new Error(`Invalid agent config for '${targetAgent}'`);
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
        void spaceId;
        void restOptions;
        console.log(`[XAgent] Parallel execution: ${agentIds.length} agents`);
        const dataAdapter = (0, import_data.getServerDataAdapter)();
        for (const agentId of agentIds) {
          if (!this.space.getAgent(agentId)) {
            const agentConfig = await dataAdapter.getAgent(agentId);
            if (!agentConfig) {
              throw new Error(`Agent '${agentId}' not found`);
            }
            if (typeof agentConfig !== "object" || agentConfig === null) {
              throw new Error(`Invalid agent config for '${agentId}'`);
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
        const aggregatedText = results.map((r) => `[${r.agentId}]: ${r.result.text}`).join("\n\n");
        return {
          textStream: async function* () {
            yield { type: "text-delta", textDelta: aggregatedText };
          },
          fullStream: async function* () {
            yield { type: "text-delta", textDelta: aggregatedText };
            yield { type: "finish", finishReason: "stop" };
          },
          text: aggregatedText
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
       * Handle message persistence after streaming completes
       * Note: Message persistence is handled on client side to maintain UIMessage format for rendering
       */
      handleMessagePersistence(streamResult, messages, spaceId, metadata) {
        void streamResult;
        void messages;
        void spaceId;
        void metadata;
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
       * Create or update the space plan
       */
      async createPlan(goal) {
        const planGoal = goal || this.space.goal;
        const planSchema = import_zod.z.object({
          tasks: import_zod.z.array(
            import_zod.z.object({
              id: import_zod.z.string(),
              title: import_zod.z.string(),
              description: import_zod.z.string(),
              assignedTo: import_zod.z.string().optional(),
              priority: import_zod.z.enum(["low", "medium", "high"]).default("medium"),
              estimatedTime: import_zod.z.string().optional(),
              dependencies: import_zod.z.array(
                import_zod.z.object({
                  taskId: import_zod.z.string(),
                  type: import_zod.z.enum(["required", "optional"])
                })
              ).default([]),
              tags: import_zod.z.array(import_zod.z.string()).default([])
            })
          )
        });
        const result = await (0, import_ai2.generateObject)({
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
        const adaptSchema = import_zod.z.object({
          preserveTasks: import_zod.z.array(import_zod.z.string()).describe("IDs of tasks to keep unchanged"),
          modifyTasks: import_zod.z.array(
            import_zod.z.object({
              id: import_zod.z.string(),
              changes: import_zod.z.object({
                title: import_zod.z.string().optional(),
                description: import_zod.z.string().optional(),
                priority: import_zod.z.enum(["low", "medium", "high"]).optional(),
                assignedTo: import_zod.z.string().optional()
              })
            })
          ).describe("Tasks to modify"),
          removeTasks: import_zod.z.array(import_zod.z.string()).describe("IDs of tasks to remove"),
          addTasks: import_zod.z.array(
            import_zod.z.object({
              id: import_zod.z.string(),
              title: import_zod.z.string(),
              description: import_zod.z.string(),
              assignedTo: import_zod.z.string().optional(),
              priority: import_zod.z.enum(["low", "medium", "high"]).default("medium"),
              dependencies: import_zod.z.array(
                import_zod.z.object({
                  taskId: import_zod.z.string(),
                  type: import_zod.z.enum(["required", "optional"])
                })
              ).default([]),
              tags: import_zod.z.array(import_zod.z.string()).default([])
            })
          ).describe("New tasks to add"),
          reasoning: import_zod.z.string().describe("Explanation of the plan changes")
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
        const result = await (0, import_ai2.generateObject)({
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
        const { startSpace: startSpace2 } = await Promise.resolve().then(() => (init_space(), space_exports));
        const space = await startSpace2({
          spaceId: id,
          goal,
          name: goal.slice(0, 50),
          model
        });
        if (!space.xAgent) {
          throw new Error("Failed to initialize XAgent");
        }
        if (singleAgentId && space.xAgent) {
          space.xAgent.singleAgentId = singleAgentId;
        }
        return space.xAgent;
      }
      /**
       * Static factory to resume an existing space
       */
      static async resume(spaceId, options = {}) {
        const { model } = options;
        const { SpaceStorageFactory: SpaceStorageFactory3 } = await import("@vibex/data");
        const { startSpace: startSpace2 } = await Promise.resolve().then(() => (init_space(), space_exports));
        const exists = await SpaceStorageFactory3.exists(spaceId);
        if (!exists) {
          throw new Error(`Space ${spaceId} not found`);
        }
        const storage = await SpaceStorageFactory3.create(spaceId);
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
  }
});

// src/orchestration/collaboration.ts
var AgentCollaborationManager, ParallelExecutionEngine, CollaborativePlanner;
var init_collaboration = __esm({
  "src/orchestration/collaboration.ts"() {
    "use strict";
    AgentCollaborationManager = class {
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
    ParallelExecutionEngine = class {
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
    CollaborativePlanner = class {
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
  }
});

// src/space/space.ts
var space_exports = {};
__export(space_exports, {
  Space: () => Space,
  startSpace: () => startSpace
});
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
  const storage = await import_data2.SpaceStorageFactory.create(id);
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
var import_data2, Space;
var init_space = __esm({
  "src/space/space.ts"() {
    "use strict";
    init_task();
    init_xagent();
    import_data2 = require("@vibex/data");
    init_message();
    init_collaboration();
    Space = class {
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
  }
});

// src/space/storage.ts
var storage_exports = {};
__export(storage_exports, {
  Storage: () => Storage
});
var import_data3, Storage;
var init_storage = __esm({
  "src/space/storage.ts"() {
    "use strict";
    import_data3 = require("@vibex/data");
    Storage = class {
      /**
       * Initialize storage system
       * @param adapter - Storage adapter (local filesystem, Supabase, etc.)
       * @param rootPrefix - Logical root prefix for all storage operations (not a filesystem path)
       */
      static async initialize(adapter, rootPrefix) {
        if (adapter) {
          this.adapter = adapter;
        } else {
          if (typeof window === "undefined") {
            const dataModule = await import("@vibex/data");
            const LocalStorageAdapter = dataModule.LocalStorageAdapter;
            this.adapter = new LocalStorageAdapter();
          } else {
            throw new Error(
              "LocalStorageAdapter cannot be used in client code. Provide a client-compatible adapter."
            );
          }
        }
        this.rootPrefix = rootPrefix || "";
      }
      /**
       * Get storage adapter
       */
      static async getAdapter() {
        if (!this.adapter) {
          await this.initialize();
        }
        return this.adapter;
      }
      /**
       * Get root prefix (logical, not filesystem path)
       */
      static async getRootPrefix() {
        if (this.rootPrefix === void 0) {
          await this.initialize();
        }
        return this.rootPrefix || "";
      }
      /**
       * Create a storage instance for a specific logical path prefix
       * @param subPath - Logical sub-path prefix (e.g., "config", "spaces/spaceId")
       */
      static async create(subPath = "") {
        const rootPrefix = await this.getRootPrefix();
        const adapter = await this.getAdapter();
        const logicalPath = rootPrefix ? subPath ? `${rootPrefix}/${subPath}` : rootPrefix : subPath;
        return new import_data3.BaseStorage(logicalPath, adapter);
      }
      /**
       * Get root storage (for top-level directories like agents)
       */
      static async getRootStorage() {
        return this.create("");
      }
      /**
       * Get config storage (for all configuration files)
       */
      static async getConfigStorage() {
        return this.create("config");
      }
      /**
       * Get defaults storage (for default templates, agents, etc.)
       */
      static async getDefaultsStorage() {
        return this.create("defaults");
      }
      /**
       * @deprecated Use getDefaultsStorage() instead
       */
      static async getHubStorage() {
        return this.getDefaultsStorage();
      }
      /**
       * Get space storage (for space-specific files)
       */
      static async getSpaceStorage(spaceId) {
        return this.create(`spaces/${spaceId}`);
      }
    };
    __publicField(Storage, "adapter");
    __publicField(Storage, "rootPrefix");
  }
});

// src/index.ts
var index_exports = {};
__export(index_exports, {
  AGENT_SYSTEM_PROMPT_TEMPLATE: () => AGENT_SYSTEM_PROMPT_TEMPLATE,
  AIEmbeddingModel: () => AIEmbeddingModel,
  Agent: () => Agent,
  AgentCollaborationManager: () => AgentCollaborationManager,
  AgentMarket: () => AgentMarket,
  ArtifactManager: () => ArtifactManager,
  BrowserAgent: () => BrowserAgent,
  CollaborativePlanner: () => CollaborativePlanner,
  ConversationHistory: () => ConversationHistory,
  InMemoryVectorStore: () => InMemoryVectorStore,
  Knowledge: () => Knowledge,
  KnowledgeBase: () => KnowledgeBase,
  MessageQueue: () => MessageQueue,
  ParallelExecutionEngine: () => ParallelExecutionEngine,
  Plan: () => Plan,
  Space: () => Space,
  Storage: () => Storage,
  Task: () => Task,
  TaskStatus: () => TaskStatus,
  VibexPaths: () => VibexPaths,
  WorkflowEngine: () => WorkflowEngine,
  XAgent: () => XAgent,
  buildToolMap: () => buildToolMap,
  calculateContextBudget: () => calculateContextBudget,
  clearToolCache: () => clearToolCache,
  compressMessages: () => compressMessages,
  estimateTokenCount: () => estimateTokenCount,
  generateShortId: () => generateShortId,
  generateSpaceId: () => generateSpaceId,
  getAgentSystemPrompt: () => getAgentSystemPrompt,
  getCompletionTokens: () => getCompletionTokens,
  getConfiguredProviders: () => getConfiguredProviders,
  getModelContextLimit: () => getModelContextLimit,
  getModelProvider: () => getModelProvider,
  getPrompt: () => getPrompt,
  getTextContent: () => getTextContent,
  getVibexPath: () => getVibexPath,
  getVibexRoot: () => getVibexRoot,
  isLargeResultReference: () => isLargeResultReference,
  isProviderConfigured: () => isProviderConfigured,
  loadLargeResult: () => loadLargeResult,
  parseModelString: () => parseModelString,
  processToolResult: () => processToolResult,
  startSpace: () => startSpace,
  streamText: () => streamText2,
  useVibexArtifacts: () => useVibexArtifacts,
  useVibexCurrentSpace: () => useVibexCurrentSpace,
  useVibexSpaces: () => useVibexSpaces,
  useVibexStore: () => useVibexStore,
  useVibexTasks: () => useVibexTasks,
  validateContext: () => validateContext,
  validateId: () => validateId
});
module.exports = __toCommonJS(index_exports);
init_space();

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

// src/index.ts
init_message();
init_plan();
init_task();

// src/space/artifact.ts
var import_path2 = __toESM(require("path"));
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
      const fullPath = import_path2.default.join(
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
      const fullPath = import_path2.default.join(
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
    const ext = import_path2.default.extname(filename).toLowerCase();
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

// src/index.ts
init_storage();

// src/space/state.ts
var import_zustand = require("zustand");
var import_middleware = require("zustand/middleware");
var import_data4 = require("@vibex/data");
var useVibexStore = (0, import_zustand.create)()(
  (0, import_middleware.subscribeWithSelector)((set, get) => ({
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
      const manager = (0, import_data4.getVibexDataManager)();
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
      const manager = (0, import_data4.getVibexDataManager)();
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
      const manager = (0, import_data4.getVibexDataManager)();
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
      const manager = (0, import_data4.getVibexDataManager)();
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
      const manager = (0, import_data4.getVibexDataManager)();
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

// src/index.ts
init_agent();

// src/agent/agent-market.ts
var import_data5 = require("@vibex/data");
var AgentMarket = class {
  /**
   * Get agent categories from hub configuration
   */
  static async getCategories() {
    try {
      const { Storage: Storage2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
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
      const { Storage: Storage2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
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
      const { Storage: Storage2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
      const defaultsStorage = await Storage2.getDefaultsStorage();
      const files = await defaultsStorage.list("agents").catch(() => []);
      if (files.length > 0) {
        return;
      }
      console.log(
        "[AgentMarket] Initializing market with default templates..."
      );
      const fs2 = await import("fs/promises");
      const path3 = await import("path");
      const sourceAgentsDir = path3.join(
        process.cwd(),
        "src",
        "vibex",
        "defaults",
        "agents"
      );
      const sourcePromptsDir = path3.join(
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
            path3.join(sourceAgentsDir, file),
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
              path3.join(sourcePromptsDir, file),
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
      const { Storage: Storage2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
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
    const { Storage: Storage2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
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
      const adapter = (0, import_data5.getServerDataAdapter)();
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
init_agent();
var import_playwright = require("playwright");
var import_zod2 = require("zod");
var import_ai3 = require("ai");
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
      (0, import_ai3.tool)({
        description: "Navigate to a URL",
        parameters: import_zod2.z.object({ url: import_zod2.z.string().url() }),
        execute: async ({ url }) => {
          await this.ensurePage();
          await this.page.goto(url);
          return `Navigated to ${url}`;
        }
      })
    );
    this.registerTool(
      "click",
      (0, import_ai3.tool)({
        description: "Click an element specified by a selector",
        parameters: import_zod2.z.object({ selector: import_zod2.z.string() }),
        execute: async ({ selector }) => {
          await this.ensurePage();
          await this.page.click(selector);
          return `Clicked element: ${selector}`;
        }
      })
    );
    this.registerTool(
      "type",
      (0, import_ai3.tool)({
        description: "Type text into an element",
        parameters: import_zod2.z.object({ selector: import_zod2.z.string(), text: import_zod2.z.string() }),
        execute: async ({ selector, text }) => {
          await this.ensurePage();
          await this.page.fill(selector, text);
          return `Typed "${text}" into ${selector}`;
        }
      })
    );
    this.registerTool(
      "screenshot",
      (0, import_ai3.tool)({
        description: "Take a screenshot of the current page",
        parameters: import_zod2.z.object({ fullPage: import_zod2.z.boolean().optional() }),
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
      (0, import_ai3.tool)({
        description: "Get the text content of the page",
        parameters: import_zod2.z.object({}),
        execute: async () => {
          await this.ensurePage();
          const content = await this.page.content();
          return content.slice(0, 1e4) + "... (truncated)";
        }
      })
    );
    this.registerTool(
      "evaluate",
      (0, import_ai3.tool)({
        description: "Evaluate JavaScript on the page",
        parameters: import_zod2.z.object({ script: import_zod2.z.string() }),
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
      this.browser = await import_playwright.chromium.launch({ headless: this.headless });
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

// src/index.ts
init_provider();
init_tool();

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

// src/index.ts
init_xagent();
init_collaboration();

// src/orchestration/stream-text.ts
init_space();
async function streamText2(options) {
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
var import_data6 = require("@vibex/data");
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
  const storage = await import_data6.SpaceStorageFactory.create(spaceId);
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
  const storage = await import_data6.SpaceStorageFactory.create(spaceId);
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

// src/index.ts
init_engine();

// src/knowledge/knowledge.ts
var import_promises = __toESM(require("fs/promises"));
init_paths();
var _Knowledge = class _Knowledge {
  static async loadDatasets() {
    try {
      const data = await import_promises.default.readFile(_Knowledge.datasetsPath, "utf-8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }
  static async loadDocuments() {
    try {
      const data = await import_promises.default.readFile(_Knowledge.documentsPath, "utf-8");
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  static async saveDatasets(datasets) {
    await import_promises.default.mkdir(_Knowledge.configDir, { recursive: true });
    await import_promises.default.writeFile(_Knowledge.datasetsPath, JSON.stringify(datasets, null, 2));
  }
  static async saveDocuments(documents) {
    await import_promises.default.mkdir(_Knowledge.configDir, { recursive: true });
    await import_promises.default.writeFile(_Knowledge.documentsPath, JSON.stringify(documents, null, 2));
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
var import_ai4 = require("ai");
var AIEmbeddingModel = class {
  constructor(model) {
    this.model = model;
  }
  async embedDocuments(texts) {
    const result = await (0, import_ai4.embedMany)({
      model: this.model,
      values: texts
    });
    return result.embeddings;
  }
  async embedQuery(text) {
    const result = await (0, import_ai4.embed)({
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

// src/index.ts
init_paths();
init_id();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
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
});
