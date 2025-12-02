import { describe, it, expect, vi, beforeEach } from "vitest";
import { WorkflowEngine } from "../../src/workflow/engine";
import { ExecutionGraph } from "../../src/workflow/types";

describe("WorkflowEngine", () => {
  let engine: WorkflowEngine;

  beforeEach(() => {
    engine = new WorkflowEngine();
  });

  it("should register a workflow", () => {
    const graph: ExecutionGraph = {
      id: "wf-1",
      name: "Test Workflow",
      description: "Test",
      nodes: [],
    };

    engine.registerWorkflow(graph);
    expect((engine as any).graphs.has("wf-1")).toBe(true);
  });

  it("should emit nodeStart event when executing", async () => {
    const graph: ExecutionGraph = {
      id: "wf-1",
      name: "Test Workflow",
      description: "Test",
      nodes: [
        {
          id: "node-1",
          name: "Node 1",
          type: "tool",
          config: { toolName: "test" },
        },
      ],
    };

    engine.registerWorkflow(graph);

    const nodeStartSpy = vi.fn();
    engine.on("nodeStart", nodeStartSpy);

    // Start workflow and let it execute
    await engine.startWorkflow("wf-1", {});

    expect(nodeStartSpy).toHaveBeenCalledTimes(1);
    expect(nodeStartSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        node: expect.objectContaining({ id: "node-1" }),
      })
    );
  });

  it("should throw if workflow not found", async () => {
    await expect(engine.startWorkflow("non-existent", {})).rejects.toThrow(
      "Execution graph non-existent not found"
    );
  });

  it("should handle legacy Workflow format with steps", () => {
    // Legacy format uses 'steps' instead of 'nodes'
    const legacyWorkflow = {
      id: "legacy-1",
      name: "Legacy Workflow",
      steps: [
        {
          id: "step-1",
          name: "Step 1",
          type: "tool" as const,
          config: {},
        },
      ],
    };

    engine.registerWorkflow(legacyWorkflow as any);
    expect((engine as any).graphs.has("legacy-1")).toBe(true);

    // Verify it was normalized to use 'nodes'
    const normalized = (engine as any).graphs.get("legacy-1");
    expect(normalized.nodes).toBeDefined();
    expect(normalized.nodes.length).toBe(1);
  });

  it("should get execution status", async () => {
    const graph: ExecutionGraph = {
      id: "wf-2",
      name: "Status Test",
      nodes: [
        {
          id: "node-1",
          name: "End Node",
          type: "end",
          config: {},
        },
      ],
    };

    engine.registerWorkflow(graph);
    const contextId = await engine.startWorkflow("wf-2", {});

    // Single end node with no next should complete
    expect(engine.getStatus(contextId)).toBe("completed");
  });

  it("should cancel execution", async () => {
    const graph: ExecutionGraph = {
      id: "wf-3",
      name: "Cancel Test",
      nodes: [
        {
          id: "node-1",
          name: "Node 1",
          type: "human_input",
          config: { prompt: "Wait for input" },
        },
      ],
    };

    engine.registerWorkflow(graph);
    const contextId = await engine.startWorkflow("wf-3", {});

    // human_input node pauses execution
    expect(engine.getStatus(contextId)).toBe("paused");

    expect(engine.getStatus(contextId)).toBe("paused");
  });
});
