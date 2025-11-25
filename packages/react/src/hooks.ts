/**
 * React Hooks for Vibex Data Access
 *
 * These hooks provide reactive access to Vibex data with automatic
 * re-rendering on data changes.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import * as vibexActions from "./server/actions";
import type { Space, Artifact, Task, Agent, Tool } from "@vibex/data";
import type {
  SpaceFilters,
  ArtifactFilters,
  TaskFilters,
} from "@vibex/data";

// ==================== Space Hooks ====================

export function useVibexSpace(spaceId: string | null | undefined) {
  const [space, setSpace] = useState<Space | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!spaceId) {
      setSpace(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Load initial data using server action
    vibexActions
      .getSpace(spaceId)
      .then((data) => {
        setSpace(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });
  }, [spaceId]);

  const updateSpace = useCallback(
    async (updates: Partial<Space>) => {
      if (!spaceId) throw new Error("No space ID provided");
      setLoading(true);
      try {
        const updated = await vibexActions.updateSpace(spaceId, updates);
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

  const deleteSpace = useCallback(async () => {
    if (!spaceId) throw new Error("No space ID provided");
    setLoading(true);
    try {
      await vibexActions.deleteSpace(spaceId);
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
    updateSpace,
    deleteSpace,
    refetch: () => {
      if (spaceId) {
        vibexActions.getSpace(spaceId).then(setSpace);
      }
    },
  };
}

export function useVibexSpaces(filters?: SpaceFilters) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Load initial data using server action
    vibexActions
      .listSpaces(filters)
      .then((data) => {
        setSpaces(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });
  }, [JSON.stringify(filters)]);

  const createSpace = useCallback(async (space: Partial<Space>) => {
    setLoading(true);
    try {
      const newSpace = await vibexActions.createSpace(space);
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
    createSpace,
    refetch: () => {
      vibexActions.listSpaces(filters).then(setSpaces);
    },
  };
}

// ==================== Artifact Hooks ====================

export function useVibexArtifacts(
  spaceId: string | null | undefined,
  filters?: ArtifactFilters
) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!spaceId) {
      setArtifacts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const effectiveFilters = { ...filters, spaceId };

    // Load initial data using server action
    vibexActions
      .getArtifacts(spaceId, effectiveFilters)
      .then((data) => {
        setArtifacts(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });
  }, [spaceId, JSON.stringify(filters)]);

  const createArtifact = useCallback(
    async (artifact: Partial<Artifact>) => {
      if (!spaceId) throw new Error("No space ID provided");
      setLoading(true);
      try {
        const newArtifact = await vibexActions.createArtifact(
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

  const updateArtifact = useCallback(
    async (artifactId: string, updates: Partial<Artifact>) => {
      if (!spaceId) throw new Error("No space ID provided");
      setLoading(true);
      try {
        const updated = await vibexActions.updateArtifact(
          artifactId,
          spaceId,
          updates
        );
        setArtifacts((prev) =>
          prev.map((a) => (a.id === artifactId ? updated : a))
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

  const deleteArtifact = useCallback(
    async (artifactId: string) => {
      if (!spaceId) throw new Error("No space ID provided");
      setLoading(true);
      try {
        await vibexActions.deleteArtifact(artifactId, spaceId);
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
    createArtifact,
    updateArtifact,
    deleteArtifact,
    refetch: () => {
      if (spaceId) {
        vibexActions.getArtifacts(spaceId, filters).then(setArtifacts);
      }
    },
  };
}

export function useVibexArtifact(artifactId: string | null | undefined) {
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!artifactId) {
      setArtifact(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    vibexActions
      .getArtifact(artifactId)
      .then((data) => {
        setArtifact(data);
        setLoading(false);
      })
      .catch((err) => {
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
        vibexActions.getArtifact(artifactId).then(setArtifact);
      }
    },
  };
}

// ==================== Task Hooks ====================

export function useVibexTasks(
  spaceId: string | null | undefined,
  filters?: TaskFilters
) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!spaceId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const effectiveFilters = { ...filters, spaceId };

    // Load initial data using server action
    vibexActions
      .getTasks(spaceId, effectiveFilters)
      .then((data) => {
        setTasks(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });
  }, [spaceId, JSON.stringify(filters)]);

  const createTask = useCallback(
    async (task: Partial<Task>) => {
      if (!spaceId) throw new Error("No space ID provided");
      setLoading(true);
      try {
        const newTask = await vibexActions.createTask(spaceId, task);
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

  const updateTask = useCallback(
    async (taskId: string, updates: Partial<Task>) => {
      setLoading(true);
      try {
        const updated = await vibexActions.updateTask(taskId, updates);
        setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
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

  const deleteTask = useCallback(
    async (taskId: string) => {
      if (!spaceId) throw new Error("No space ID provided");
      setLoading(true);
      try {
        await vibexActions.deleteTask(taskId, spaceId);
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
    createTask,
    updateTask,
    deleteTask,
    refetch: () => {
      if (spaceId) {
        vibexActions.getTasks(spaceId, filters).then(setTasks);
      }
    },
  };
}

export function useVibexTask(taskId: string | null | undefined) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!taskId) {
      setTask(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    vibexActions
      .getTask(taskId)
      .then((data) => {
        setTask(data);
        setLoading(false);
      })
      .catch((err) => {
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
        vibexActions.getTask(taskId).then(setTask);
      }
    },
  };
}

// ==================== Agent Hooks ====================

export function useVibexAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    vibexActions
      .getAgents()
      .then((data) => {
        setAgents(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });
  }, []);

  return {
    agents,
    loading,
    error,
    refetch: () => {
      vibexActions.getAgents().then(setAgents);
    },
  };
}

export function useVibexAgent(agentId: string | null | undefined) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!agentId) {
      setAgent(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    vibexActions
      .getAgent(agentId)
      .then((data) => {
        setAgent(data);
        setLoading(false);
      })
      .catch((err) => {
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
        vibexActions.getAgent(agentId).then(setAgent);
      }
    },
  };
}

// ==================== Tool Hooks ====================

export function useVibexTools() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    vibexActions
      .getTools()
      .then((data) => {
        setTools(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });
  }, []);

  return {
    tools,
    loading,
    error,
    refetch: () => {
      vibexActions.getTools().then(setTools);
    },
  };
}

export function useVibexTool(toolId: string | null | undefined) {
  const [tool, setTool] = useState<Tool | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!toolId) {
      setTool(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    vibexActions
      .getTool(toolId)
      .then((data) => {
        setTool(data);
        setLoading(false);
      })
      .catch((err) => {
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
        vibexActions.getTool(toolId).then(setTool);
      }
    },
  };
}
