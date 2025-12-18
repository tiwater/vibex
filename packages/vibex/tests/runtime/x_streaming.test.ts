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
        executePlan: vi.fn().mockImplementation(async function* (plan, space, model) {
          // Emit events
          yield {
            type: "delegation",
            taskId: "task-1",
            taskTitle: "Task 1",
            agentId: "worker-1",
            agentName: "Worker 1",
            status: "started",
            timestamp: Date.now(),
          } as DelegationEvent;

          // Emit streaming chunks
          yield {
            type: "delegation",
            taskId: "task-1",
            taskTitle: "Task 1",
            agentId: "worker-1",
            agentName: "Worker 1",
            status: "streaming",
            result: "Hello ",
            timestamp: Date.now(),
          } as DelegationEvent;

          yield {
            type: "delegation",
            taskId: "task-1",
            taskTitle: "Task 1",
            agentId: "worker-1",
            agentName: "Worker 1",
            status: "streaming",
            result: "World",
            timestamp: Date.now(),
          } as DelegationEvent;

          yield {
            type: "delegation",
            taskId: "task-1",
            taskTitle: "Task 1",
            agentId: "worker-1",
            agentName: "Worker 1",
            status: "completed",
            result: "Hello World",
            timestamp: Date.now(),
          } as DelegationEvent;

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

    const fullStreamChunks: any[] = [];
    for await (const chunk of result.fullStream) {
      fullStreamChunks.push(chunk);
    }

    const textChunks: string[] = [];
    for await (const chunk of result.textStream) {
      textChunks.push(chunk);
    }
    const fullText = textChunks.join("");
    console.error("Full Text:", fullText);
    
    // Verify we got delegation events
    const delegationEvents = fullStreamChunks.filter(c => c.type === "delegation");
    expect(delegationEvents.length).toBeGreaterThan(0);
    expect(delegationEvents[0]).toMatchObject({
      type: "delegation",
      status: "started",
      taskTitle: "Task 1",
      agentId: "worker-1"
    });

    // Verify we got agent-text-delta events (multiplexed streaming)
    const agentTextDeltas = fullStreamChunks.filter(c => c.type === "agent-text-delta");
    expect(agentTextDeltas.length).toBeGreaterThan(0);
    expect(agentTextDeltas[0]).toMatchObject({
      type: "agent-text-delta",
      agentId: "worker-1",
      taskId: "task-1"
    });
    
    // Verify content matches
    const agentContent = agentTextDeltas.map(c => c.textDelta).join("");
    expect(agentContent).toBe("Hello World");

    // Verify text stream still contains everything (backward compatibility)
    expect(fullText).toContain("Hello World");
    expect(fullText).toContain("Plan Created");
    expect(fullText).toContain("Final Summary");
    
    // Verify delegation started message
    expect(fullText).toContain("Delegating to Worker 1");
    
    // Verify completion message
    expect(fullText).toContain("Worker 1 completed");
  });
});
