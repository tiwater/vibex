import { describe, it, expect, vi, beforeEach } from "vitest";
import { XAgent } from "./xagent";
import { AgentConfig } from "../config";

// Mock dependencies
vi.mock("ai", () => ({
  generateText: vi.fn(),
  streamText: vi.fn(),
  generateObject: vi.fn().mockResolvedValue({ object: { tasks: [] } }),
  stepCountIs: vi.fn(),
}));

vi.mock("@vibex/data", () => ({
  getServerDataAdapter: vi.fn().mockReturnValue({
    getAgent: vi.fn(),
  }),
}));

describe("XAgent", () => {
  const mockConfig: AgentConfig = {
    name: "X",
    description: "Orchestrator",
    provider: "openai",
    model: "gpt-4",
  };

  let xAgent: XAgent;
  let mockSpace: any;

  beforeEach(() => {
    mockSpace = {
      spaceId: "test-space",
      name: "Test Space",
      goal: "Test Goal",
      agents: new Map(),
      messageQueue: { add: vi.fn(), clear: vi.fn() },
      history: { getMessages: vi.fn().mockReturnValue([]), add: vi.fn() },
      getAgent: vi.fn(),
      registerAgent: vi.fn(),
      getOrCreateTask: vi.fn().mockReturnValue({
        history: { getMessages: vi.fn().mockReturnValue([]), add: vi.fn() },
      }),
      createPlan: vi.fn(),
      parallelEngine: {
        executeParallel: vi.fn().mockResolvedValue([]),
      },
    };
    xAgent = new XAgent(mockConfig, mockSpace);
  });

  it("should initialize with correct space context", () => {
    expect(xAgent.spaceId).toBe("test-space");
    expect(xAgent.name).toBe("X");
  });

  it("should enhance system prompt with plan context", () => {
    const prompt = xAgent.getSystemPrompt();
    expect(prompt).toContain("No active plan for this space yet");
  });

  it("should support agent mode in streamText", async () => {
    const messages = [{ role: "user", content: "Hello" }];
    const metadata = { mode: "agent", requestedAgent: "coder" };

    // Mock getAgent to return a mock agent
    const mockAgent = {
      streamText: vi.fn().mockResolvedValue({ fullStream: [] }),
    };
    (mockSpace.getAgent as any).mockReturnValue(mockAgent);

    await xAgent.streamText({ messages, metadata });

    expect(mockSpace.getAgent).toHaveBeenCalledWith("coder");
    expect(mockAgent.streamText).toHaveBeenCalled();
  });

  it("should throw error if mode is not agent", async () => {
    const messages = [{ role: "user", content: "Hello" }];
    const metadata = { mode: "chat" }; // Invalid mode for XAgent streamText

    await expect(xAgent.streamText({ messages, metadata })).rejects.toThrow(
      /XAgent only supports 'agent' mode/
    );
  });
});
