"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  VibexErrorBoundary: () => VibexErrorBoundary,
  VibexProvider: () => VibexProvider,
  useVibexAgent: () => useVibexAgent,
  useVibexAgents: () => useVibexAgents,
  useVibexArtifact: () => useVibexArtifact,
  useVibexArtifacts: () => useVibexArtifacts,
  useVibexChat: () => useVibexChat,
  useVibexSpace: () => useVibexSpace,
  useVibexSpaces: () => useVibexSpaces,
  useVibexTask: () => useVibexTask,
  useVibexTasks: () => useVibexTasks,
  useVibexTool: () => useVibexTool,
  useVibexTools: () => useVibexTools
});
module.exports = __toCommonJS(index_exports);

// src/provider.tsx
var import_jsx_runtime = require("react/jsx-runtime");
function VibexProvider({ children }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
}

// src/hooks.ts
var import_react = require("react");

// src/server/actions.ts
var import_data = require("@vibex/data");
async function getSpace(spaceId) {
  const manager = (0, import_data.getVibexDataManagerServer)();
  return await manager.getSpace(spaceId);
}
async function listSpaces(filters) {
  const manager = (0, import_data.getVibexDataManagerServer)();
  return await manager.listSpaces(filters);
}
async function createSpace(space) {
  const manager = (0, import_data.getVibexDataManagerServer)();
  return await manager.createSpace(space);
}
async function updateSpace(spaceId, updates) {
  const manager = (0, import_data.getVibexDataManagerServer)();
  return await manager.updateSpace(spaceId, updates);
}
async function deleteSpace(spaceId) {
  const manager = (0, import_data.getVibexDataManagerServer)();
  return await manager.deleteSpace(spaceId);
}
async function getArtifacts(spaceId, filters) {
  const manager = (0, import_data.getVibexDataManagerServer)();
  return await manager.getArtifacts(spaceId, filters);
}
async function getArtifact(artifactId) {
  const manager = (0, import_data.getVibexDataManagerServer)();
  return await manager.getArtifact(artifactId);
}
async function createArtifact(spaceId, artifact) {
  const manager = (0, import_data.getVibexDataManagerServer)();
  return await manager.createArtifact(spaceId, artifact);
}
async function updateArtifact(artifactId, spaceId, updates) {
  const manager = (0, import_data.getVibexDataManagerServer)();
  return await manager.updateArtifact(artifactId, spaceId, updates);
}
async function deleteArtifact(artifactId, spaceId) {
  const manager = (0, import_data.getVibexDataManagerServer)();
  return await manager.deleteArtifact(artifactId, spaceId);
}
async function getTasks(spaceId, filters) {
  const manager = (0, import_data.getVibexDataManagerServer)();
  return await manager.getTasks(spaceId, filters);
}
async function getTask(taskId) {
  const manager = (0, import_data.getVibexDataManagerServer)();
  return await manager.getTask(taskId);
}
async function createTask(spaceId, task) {
  const manager = (0, import_data.getVibexDataManagerServer)();
  return await manager.createTask(spaceId, task);
}
async function updateTask(taskId, updates) {
  const manager = (0, import_data.getVibexDataManagerServer)();
  return await manager.updateTask(taskId, updates);
}
async function deleteTask(taskId, spaceId) {
  const manager = (0, import_data.getVibexDataManagerServer)();
  return await manager.deleteTask(taskId, spaceId);
}
async function getAgents() {
  const manager = (0, import_data.getVibexDataManagerServer)();
  return await manager.getAgents();
}
async function getAgent(agentId) {
  const manager = (0, import_data.getVibexDataManagerServer)();
  return await manager.getAgent(agentId);
}
async function getTools() {
  const manager = (0, import_data.getVibexDataManagerServer)();
  return await manager.getTools();
}
async function getTool(toolId) {
  const manager = (0, import_data.getVibexDataManagerServer)();
  return await manager.getTool(toolId);
}

// src/hooks.ts
function useVibexSpace(spaceId) {
  const [space, setSpace] = (0, import_react.useState)(null);
  const [loading, setLoading] = (0, import_react.useState)(true);
  const [error, setError] = (0, import_react.useState)(null);
  (0, import_react.useEffect)(() => {
    if (!spaceId) {
      setSpace(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getSpace(spaceId).then((data) => {
      setSpace(data);
      setLoading(false);
    }).catch((err) => {
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
    });
  }, [spaceId]);
  const updateSpace2 = (0, import_react.useCallback)(
    async (updates) => {
      if (!spaceId) throw new Error("No space ID provided");
      setLoading(true);
      try {
        const updated = await updateSpace(spaceId, updates);
        setSpace(updated);
        return updated;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [spaceId]
  );
  const deleteSpace2 = (0, import_react.useCallback)(async () => {
    if (!spaceId) throw new Error("No space ID provided");
    setLoading(true);
    try {
      await deleteSpace(spaceId);
      setSpace(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [spaceId]);
  return {
    space,
    loading,
    error,
    updateSpace: updateSpace2,
    deleteSpace: deleteSpace2,
    refetch: () => {
      if (spaceId) {
        getSpace(spaceId).then(setSpace);
      }
    }
  };
}
function useVibexSpaces(filters) {
  const [spaces, setSpaces] = (0, import_react.useState)([]);
  const [loading, setLoading] = (0, import_react.useState)(true);
  const [error, setError] = (0, import_react.useState)(null);
  (0, import_react.useEffect)(() => {
    setLoading(true);
    setError(null);
    listSpaces(filters).then((data) => {
      setSpaces(data);
      setLoading(false);
    }).catch((err) => {
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
    });
  }, [JSON.stringify(filters)]);
  const createSpace2 = (0, import_react.useCallback)(async (space) => {
    setLoading(true);
    try {
      const newSpace = await createSpace(space);
      setSpaces((prev) => [...prev, newSpace]);
      return newSpace;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  return {
    spaces,
    loading,
    error,
    createSpace: createSpace2,
    refetch: () => {
      listSpaces(filters).then(setSpaces);
    }
  };
}
function useVibexArtifacts(spaceId, filters) {
  const [artifacts, setArtifacts] = (0, import_react.useState)([]);
  const [loading, setLoading] = (0, import_react.useState)(true);
  const [error, setError] = (0, import_react.useState)(null);
  (0, import_react.useEffect)(() => {
    if (!spaceId) {
      setArtifacts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const effectiveFilters = { ...filters, spaceId };
    getArtifacts(spaceId, effectiveFilters).then((data) => {
      setArtifacts(data);
      setLoading(false);
    }).catch((err) => {
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
    });
  }, [spaceId, JSON.stringify(filters)]);
  const createArtifact2 = (0, import_react.useCallback)(
    async (artifact) => {
      if (!spaceId) throw new Error("No space ID provided");
      setLoading(true);
      try {
        const newArtifact = await createArtifact(
          spaceId,
          artifact
        );
        setArtifacts((prev) => [...prev, newArtifact]);
        return newArtifact;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [spaceId]
  );
  const updateArtifact2 = (0, import_react.useCallback)(
    async (artifactId, updates) => {
      if (!spaceId) throw new Error("No space ID provided");
      setLoading(true);
      try {
        const updated = await updateArtifact(
          artifactId,
          spaceId,
          updates
        );
        setArtifacts(
          (prev) => prev.map((a) => a.id === artifactId ? updated : a)
        );
        return updated;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [spaceId]
  );
  const deleteArtifact2 = (0, import_react.useCallback)(
    async (artifactId) => {
      if (!spaceId) throw new Error("No space ID provided");
      setLoading(true);
      try {
        await deleteArtifact(artifactId, spaceId);
        setArtifacts((prev) => prev.filter((a) => a.id !== artifactId));
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [spaceId]
  );
  return {
    artifacts,
    loading,
    error,
    createArtifact: createArtifact2,
    updateArtifact: updateArtifact2,
    deleteArtifact: deleteArtifact2,
    refetch: () => {
      if (spaceId) {
        getArtifacts(spaceId, filters).then(setArtifacts);
      }
    }
  };
}
function useVibexArtifact(artifactId) {
  const [artifact, setArtifact] = (0, import_react.useState)(null);
  const [loading, setLoading] = (0, import_react.useState)(true);
  const [error, setError] = (0, import_react.useState)(null);
  (0, import_react.useEffect)(() => {
    if (!artifactId) {
      setArtifact(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getArtifact(artifactId).then((data) => {
      setArtifact(data);
      setLoading(false);
    }).catch((err) => {
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
    });
  }, [artifactId]);
  return {
    artifact,
    loading,
    error,
    refetch: () => {
      if (artifactId) {
        getArtifact(artifactId).then(setArtifact);
      }
    }
  };
}
function useVibexTasks(spaceId, filters) {
  const [tasks, setTasks] = (0, import_react.useState)([]);
  const [loading, setLoading] = (0, import_react.useState)(true);
  const [error, setError] = (0, import_react.useState)(null);
  (0, import_react.useEffect)(() => {
    if (!spaceId) {
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const effectiveFilters = { ...filters, spaceId };
    getTasks(spaceId, effectiveFilters).then((data) => {
      setTasks(data);
      setLoading(false);
    }).catch((err) => {
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
    });
  }, [spaceId, JSON.stringify(filters)]);
  const createTask2 = (0, import_react.useCallback)(
    async (task) => {
      if (!spaceId) throw new Error("No space ID provided");
      setLoading(true);
      try {
        const newTask = await createTask(spaceId, task);
        setTasks((prev) => [...prev, newTask]);
        return newTask;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [spaceId]
  );
  const updateTask2 = (0, import_react.useCallback)(
    async (taskId, updates) => {
      setLoading(true);
      try {
        const updated = await updateTask(taskId, updates);
        setTasks((prev) => prev.map((t) => t.id === taskId ? updated : t));
        return updated;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );
  const deleteTask2 = (0, import_react.useCallback)(
    async (taskId) => {
      if (!spaceId) throw new Error("No space ID provided");
      setLoading(true);
      try {
        await deleteTask(taskId, spaceId);
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [spaceId]
  );
  return {
    tasks,
    loading,
    error,
    createTask: createTask2,
    updateTask: updateTask2,
    deleteTask: deleteTask2,
    refetch: () => {
      if (spaceId) {
        getTasks(spaceId, filters).then(setTasks);
      }
    }
  };
}
function useVibexTask(taskId) {
  const [task, setTask] = (0, import_react.useState)(null);
  const [loading, setLoading] = (0, import_react.useState)(true);
  const [error, setError] = (0, import_react.useState)(null);
  (0, import_react.useEffect)(() => {
    if (!taskId) {
      setTask(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getTask(taskId).then((data) => {
      setTask(data);
      setLoading(false);
    }).catch((err) => {
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
    });
  }, [taskId]);
  return {
    task,
    loading,
    error,
    refetch: () => {
      if (taskId) {
        getTask(taskId).then(setTask);
      }
    }
  };
}
function useVibexAgents() {
  const [agents, setAgents] = (0, import_react.useState)([]);
  const [loading, setLoading] = (0, import_react.useState)(true);
  const [error, setError] = (0, import_react.useState)(null);
  (0, import_react.useEffect)(() => {
    setLoading(true);
    setError(null);
    getAgents().then((data) => {
      setAgents(data);
      setLoading(false);
    }).catch((err) => {
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
    });
  }, []);
  return {
    agents,
    loading,
    error,
    refetch: () => {
      getAgents().then(setAgents);
    }
  };
}
function useVibexAgent(agentId) {
  const [agent, setAgent] = (0, import_react.useState)(null);
  const [loading, setLoading] = (0, import_react.useState)(true);
  const [error, setError] = (0, import_react.useState)(null);
  (0, import_react.useEffect)(() => {
    if (!agentId) {
      setAgent(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getAgent(agentId).then((data) => {
      setAgent(data);
      setLoading(false);
    }).catch((err) => {
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
    });
  }, [agentId]);
  return {
    agent,
    loading,
    error,
    refetch: () => {
      if (agentId) {
        getAgent(agentId).then(setAgent);
      }
    }
  };
}
function useVibexTools() {
  const [tools, setTools] = (0, import_react.useState)([]);
  const [loading, setLoading] = (0, import_react.useState)(true);
  const [error, setError] = (0, import_react.useState)(null);
  (0, import_react.useEffect)(() => {
    setLoading(true);
    setError(null);
    getTools().then((data) => {
      setTools(data);
      setLoading(false);
    }).catch((err) => {
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
    });
  }, []);
  return {
    tools,
    loading,
    error,
    refetch: () => {
      getTools().then(setTools);
    }
  };
}
function useVibexTool(toolId) {
  const [tool, setTool] = (0, import_react.useState)(null);
  const [loading, setLoading] = (0, import_react.useState)(true);
  const [error, setError] = (0, import_react.useState)(null);
  (0, import_react.useEffect)(() => {
    if (!toolId) {
      setTool(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getTool(toolId).then((data) => {
      setTool(data);
      setLoading(false);
    }).catch((err) => {
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
    });
  }, [toolId]);
  return {
    tool,
    loading,
    error,
    refetch: () => {
      if (toolId) {
        getTool(toolId).then(setTool);
      }
    }
  };
}

// src/hooks/chat.ts
var import_react2 = require("ai/react");
var import_react3 = require("react");
function useVibexChat({
  spaceId,
  agentId,
  metadata,
  ...options
}) {
  const body = (0, import_react3.useMemo)(() => ({
    spaceId,
    agentId,
    metadata: {
      ...metadata,
      mode: agentId ? "agent" : "chat",
      requestedAgent: agentId
    }
  }), [spaceId, agentId, JSON.stringify(metadata)]);
  const chat = (0, import_react2.useChat)({
    ...options,
    body,
    // Default to the standard Vibex API endpoint
    api: options.api ?? "/api/chat"
  });
  return {
    ...chat
    // Add any Vibex-specific helpers here if needed
  };
}

// src/error-boundary.tsx
var import_react4 = require("react");
var import_jsx_runtime2 = require("react/jsx-runtime");
var VibexErrorBoundary = class extends import_react4.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("[VibexErrorBoundary] Caught error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex flex-col items-center justify-center p-8 text-center", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { className: "text-lg font-semibold mb-2", children: "Something went wrong" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-sm text-muted-foreground mb-4", children: this.state.error?.message || "An unexpected error occurred" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            onClick: () => this.setState({ hasError: false, error: null }),
            className: "px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90",
            children: "Try again"
          }
        )
      ] });
    }
    return this.props.children;
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  VibexErrorBoundary,
  VibexProvider,
  useVibexAgent,
  useVibexAgents,
  useVibexArtifact,
  useVibexArtifacts,
  useVibexChat,
  useVibexSpace,
  useVibexSpaces,
  useVibexTask,
  useVibexTasks,
  useVibexTool,
  useVibexTools
});
