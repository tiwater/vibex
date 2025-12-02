import { describe, it, expect, vi, beforeEach } from "vitest";
import { XAgent } from "../../src/runtime/x";
import { Space } from "../../src/space";
import { AgentConfig } from "../../src/config";
import { DelegationEvent } from "../../src/runtime/orchestration";

describe("XAgent Streaming", () => {
  let space: Space;
  let xAgent: XAgent;

  beforeEach(() => {
    // Mock Space
    space = {
      spaceId: "test-space",
      name: "Test Space",
      goal: "Test Goal",
      agents: new Map(),
      getAgent: vi.fn(),
      registerAgent: vi.fn(),
      getOrCreateTask: vi.fn().mockReturnValue({
        history: [],
      }),
    } as any;

    const config: AgentConfig = {
      name: "X",
      description: "Test X",
      provider: "test",
      model: "test-model",
    };

    xAgent = new XAgent(config, space);
  });

  it("should stream delegation events and content", async () => {
    // Mock executePlan to emit events
    vi.mock("../../src/runtime/orchestration", async () => {
      const actual = await vi.importActual("../../src/runtime/orchestration");
      return {
        ...actual,
        analyzeRequest: vi.fn().mockResolvedValue({
          needsPlan: true,
          reasoning: "Test reasoning",
          suggestedTasks: [
            {
              title: "Task 1",
              description: "Do something",
              assignedTo: "worker-1",
              dependencies: [],
            },
          ],
        }),
        executePlan: vi.fn().mockImplementation(async (plan, space, model, onEvent) => {
          // Emit events
          onEvent({
            type: "delegation",
            taskId: "task-1",
            taskTitle: "Task 1",
            agentId: "worker-1",
            agentName: "Worker 1",
            status: "started",
            timestamp: Date.now(),
          } as DelegationEvent);

          // Emit streaming chunks
          onEvent({
            type: "delegation",
            taskId: "task-1",
            taskTitle: "Task 1",
            agentId: "worker-1",
            agentName: "Worker 1",
            status: "streaming",
            result: "Hello ",
            timestamp: Date.now(),
          } as DelegationEvent);

          onEvent({
            type: "delegation",
            taskId: "task-1",
            taskTitle: "Task 1",
            agentId: "worker-1",
            agentName: "Worker 1",
            status: "streaming",
            result: "World",
            timestamp: Date.now(),
          } as DelegationEvent);

          onEvent({
            type: "delegation",
            taskId: "task-1",
            taskTitle: "Task 1",
            agentId: "worker-1",
            agentName: "Worker 1",
            status: "completed",
            result: "Hello World",
            timestamp: Date.now(),
          } as DelegationEvent);

          return { results: new Map([["task-1", "Hello World"]]), artifacts: [] };
        }),
        synthesizeResults: vi.fn().mockResolvedValue("Final Summary"),
      };
    });

    // Mock getAvailableAgents
    (xAgent as any).getAvailableAgents = vi.fn().mockResolvedValue([
      { id: "worker-1", name: "Worker 1", description: "Worker" },
    ]);

    // Mock getModel
    (xAgent as any).getModel = vi.fn().mockReturnValue({});

    // Mock streamText to return the stream from executePlan
    // We don't need to spy on streamText, we want to call the real one
    // which will call our mocked executePlan
    
    const result = await xAgent.streamText({
      messages: [{ role: "user", content: "Do something" }],
      metadata: { mode: "agent" },
    });

    const chunks: string[] = [];
    for await (const chunk of result.textStream) {
      chunks.push(chunk);
    }

    const fullText = chunks.join("");
    console.error("Full Text:", fullText);
    
    // Verify streaming content
    expect(fullText).toContain("Hello ");
    expect(fullText).toContain("World");
    expect(fullText).toContain("Final Summary");
    
    // Verify delegation started message
    expect(fullText).toContain("Delegating to Worker 1");
    
    // Verify completion message
    expect(fullText).toContain("Worker 1 completed");
  });
});
