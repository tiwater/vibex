import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Agent } from './agent';
import { AgentConfig } from './config';

// Mock AI SDK
vi.mock('ai', () => ({
  generateText: vi.fn(),
  streamText: vi.fn(),
  stepCountIs: vi.fn(),
}));

describe('Agent', () => {
  const mockConfig: AgentConfig = {
    name: 'Test Agent',
    description: 'A test agent',
    provider: 'openai',
    model: 'gpt-4',
    tools: ['calculator'],
  };

  let agent: Agent;

  beforeEach(() => {
    agent = new Agent(mockConfig);
  });

  it('should initialize with correct config', () => {
    expect(agent.name).toBe('Test Agent');
    expect(agent.provider).toBe('openai');
    expect(agent.model).toBe('gpt-4');
    expect(agent.tools).toContain('calculator');
  });

  it('should throw error for invalid provider', () => {
    const invalidConfig = { ...mockConfig, provider: 'vibex' };
    expect(() => new Agent(invalidConfig)).toThrow(/Invalid provider/);
  });

  it('should generate correct system prompt', () => {
    // Access protected method via any cast for testing
    const prompt = (agent as any).getSystemPrompt({
      spaceId: 'test-space',
      metadata: { userId: 'user-1' }
    });

    expect(prompt).toContain('You are Test Agent');
    expect(prompt).toContain('A test agent');
    expect(prompt).toContain('Space ID: test-space');
  });

  it('should include tool instructions when tools are present', () => {
    const prompt = (agent as any).getSystemPrompt();
    expect(prompt).toContain('IMPORTANT - TOOL USAGE');
  });

  it('should not include tool instructions when no tools are present', () => {
    const noToolAgent = new Agent({ ...mockConfig, tools: [] });
    const prompt = (noToolAgent as any).getSystemPrompt();
    expect(prompt).not.toContain('IMPORTANT - TOOL USAGE');
  });
});
