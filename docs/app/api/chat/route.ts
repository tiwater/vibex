import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  convertToModelMessages,
  type UIMessage,
} from "ai";

export const runtime = "edge";

export type ChatUIMessage = UIMessage<
  never,
  {
    agent: {
      agentId: string;
      messageId: string;
    };
  }
>;

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const messagesWithoutId = messages.map(({ id, ...msg }) => msg);
  const modelMessages = convertToModelMessages(messagesWithoutId);

  const stream = createUIMessageStream<ChatUIMessage>({
    execute: async ({ writer }) => {
      const researcher = openrouter("openai/gpt-4o");
      const analyst = openrouter("anthropic/claude-3.5-sonnet");

      // First agent - researcher
      console.log("[Chat API] Starting researcher");
      const result1 = streamText({
        model: researcher,
        messages: modelMessages,
        system:
          "You are a researcher. Provide a brief summary of facts related to the user's request. Be concise.",
      });

      // Mark researcher's content
      writer.write({
        type: "data-agent",
        id: "agent-researcher",
        data: { agentId: "researcher", messageId: "msg-researcher" },
      } as any);

      // Stream researcher (don't finish - more agents coming)
      writer.merge(result1.toUIMessageStream({ sendFinish: false }));

      // Wait for researcher to complete before starting next agent
      await result1.text;
      console.log("[Chat API] Researcher complete");

      // Second agent - analyst (only start after researcher completes)
      console.log("[Chat API] Starting analyst");
      const result2 = streamText({
        model: analyst,
        messages: modelMessages,
        system:
          "You are an analyst. Provide a brief analysis of the implications of the user's request. Be concise.",
      });

      // Mark analyst's content
      writer.write({
        type: "data-agent",
        id: "agent-analyst",
        data: { agentId: "analyst", messageId: "msg-analyst" },
      } as any);

      // Stream analyst (final agent - send finish)
      writer.merge(result2.toUIMessageStream({ sendStart: false }));

      await result2.text;
      console.log("[Chat API] All agents streamed");
    },
  });

  return createUIMessageStreamResponse({ stream });
}
