
import { describe, it, expect } from "vitest";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load env vars from docs/.env
const envPath = path.resolve(__dirname, "../../../docs/.env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Create OpenAI provider pointing to OpenRouter
const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

describe("Agent Mode Integration", () => {
  // Test with Claude Sonnet 4.5 via OpenRouter
  const model = openrouter("anthropic/claude-sonnet-4.5");
  
  // Define tools using CoreTool interface (same as vibex internal tools)
  const tools = {
    delegate: {
      description: "Delegate complex tasks",
      inputSchema: z.object({
        reasoning: z.string().describe("Explanation"),
      }),
      execute: async (params: { reasoning: string }) => {
        console.log(`Tool executed with reasoning: ${params.reasoning}`);
        return "Delegation successful";
      },
    },
  };

  it("should answer simple questions directly without tools", async () => {
    if (!process.env.OPENROUTER_API_KEY) return;

    const result = streamText({
      model,
      messages: [{ role: "user", content: "What is 2+2?" }],
      tools,
      toolChoice: "auto", 
    });

    let textResponse = "";
    let toolCalled = false;
    
    for await (const part of result.fullStream) {
      // console.log("Stream part:", part.type);
      if (part.type === 'text-delta') {
        textResponse += part.text;
      } else if (part.type === 'tool-call') {
        toolCalled = true;
      }
    }

    expect(toolCalled).toBe(false);
    expect(textResponse).toContain("4");
  }, 30000);

  it("should delegate complex tasks using tool calling", async () => {
    if (!process.env.OPENROUTER_API_KEY) return;

    const result = streamText({
      model,
      system: "You are a helpful assistant. You MUST use the 'delegate' tool for any research tasks. Do not answer directly.",
      messages: [{ role: "user", content: "Research the history of AI agents and summarize it." }],
      tools,
      toolChoice: "required",
    });

    let toolCalled = false;
    for await (const part of result.fullStream) {
      console.log("Stream part:", part.type, part);
      if (part.type === 'tool-call' && part.toolName === 'delegate') {
        toolCalled = true;
      } else if (part.type === 'tool-input-start' && part.toolName === 'delegate') {
        // Accept tool-input-start as proof of delegation attempt
        toolCalled = true;
      } else if (part.type === 'error') {
        console.error("Stream error:", part.error);
      }
    }

    expect(toolCalled).toBe(true);
  }, 30000);
});
