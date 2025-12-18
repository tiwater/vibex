import { describe, it, expect, vi } from "vitest";
import { Agent } from "../../src/runtime/agent";
import { AgentConfig } from "../../src/config";

describe("Agent Worker Mode", () => {
  const config: AgentConfig = {
    name: "WorkerAgent",
    description: "A test worker agent",
    provider: "test",
    model: "test-model",
  };

  it("should inject worker preamble when mode is worker", () => {
    const agent = new Agent(config);
    
    // Access protected method via any cast
    const systemPrompt = (agent as any).getSystemPrompt({
      spaceId: "test-space",
      mode: "worker"
    });

    expect(systemPrompt).toContain("🚨 **WORKER MODE ACTIVE** 🚨");
    expect(systemPrompt).toContain("You are currently operating in WORKER MODE.");
    expect(systemPrompt).toContain("Do NOT attempt to create a new plan");
  });

  it("should NOT inject worker preamble when mode is autonomous", () => {
    const agent = new Agent(config);
    
    // Access protected method via any cast
    const systemPrompt = (agent as any).getSystemPrompt({
      spaceId: "test-space",
      mode: "autonomous"
    });

    expect(systemPrompt).not.toContain("🚨 **WORKER MODE ACTIVE** 🚨");
    expect(systemPrompt).not.toContain("You are currently operating in WORKER MODE.");
  });

  it("should NOT inject worker preamble when mode is undefined", () => {
    const agent = new Agent(config);
    
    // Access protected method via any cast
    const systemPrompt = (agent as any).getSystemPrompt({
      spaceId: "test-space"
    });

    expect(systemPrompt).not.toContain("🚨 **WORKER MODE ACTIVE** 🚨");
    expect(systemPrompt).not.toContain("You are currently operating in WORKER MODE.");
  });
});
