import {
  XAgent,
  fromXChatMessage,
  getTextFromXChatMessage,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "vibex";
import type { XChatMessage } from "@vibex/react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMode = "ask" | "plan" | "agent";

// Default model - GPT-4o via OpenRouter (reliable, widely available)
const DEFAULT_MODEL = "openai/gpt-4o";

// Valid chat modes
const VALID_MODES: ChatMode[] = ["ask", "plan", "agent"];

export async function POST(req: Request) {
  try {
    const { messages, spaceId, agentId, metadata } = await req.json();

    console.log("[Chat API] Received request:", {
      messageCount: messages?.length,
      spaceId,
      agentId,
    });

    // Get the last user message text (for space naming)
    const lastMessage = messages?.[messages.length - 1] as
      | XChatMessage
      | undefined;
    if (!lastMessage || lastMessage.role !== "user") {
      return new Response("No user message found", { status: 400 });
    }

    const lastContent = getTextFromXChatMessage(lastMessage);
    if (!lastContent) {
      return new Response("Empty message content", { status: 400 });
    }

    console.log("[Chat API] Processing:", lastContent.slice(0, 100));

    // Initialize or resume XAgent with the space
    let xAgent: InstanceType<typeof XAgent>;

    // Try to resume existing space, or create new one
    if (spaceId && spaceId !== "playground") {
      try {
        xAgent = await XAgent.resume(spaceId, { model: DEFAULT_MODEL });
        console.log("[Chat API] Resumed space:", spaceId);
      } catch {
        console.log(`[Chat API] Space ${spaceId} not found, creating new`);
        xAgent = await XAgent.start(lastContent.slice(0, 50), {
          model: DEFAULT_MODEL,
        });
      }
    } else {
      console.log("[Chat API] Creating new playground space");
      xAgent = await XAgent.start(lastContent.slice(0, 50), {
        model: DEFAULT_MODEL,
      });
    }

    // Get space info for metadata
    const space = xAgent.getSpace();

    // Extract chatMode from metadata (default to "agent")
    const chatMode = (metadata?.chatMode as ChatMode) || "agent";
    if (!VALID_MODES.includes(chatMode)) {
      return new Response(`Invalid chat mode: ${chatMode}`, { status: 400 });
    }

    // Convert XChatMessages to XMessages format
    const xMessages = (messages as XChatMessage[]).map(fromXChatMessage);

    console.log("[Chat API] Streaming with", {
      messages: xMessages.length,
      mode: chatMode,
      spaceId: space?.spaceId,
      agentId,
      metadata,
    });
    console.log(
      "[Chat API] Space agents:",
      Array.from(space?.agents?.keys?.() || [])
    );

    // Stream using AI SDK multi-step pattern
    const streamOptions = {
      messages: xMessages,
      metadata: {
        ...metadata,
        chatMode,
        ...(agentId ? { requestedAgent: agentId } : {}),
      },
    };

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        // Get VibeX's stream
        const vibexStream = await xAgent.streamText(streamOptions);

        console.log("[Chat API] xAgent.streamText returned", {
          hasFullStream: typeof vibexStream.fullStream === "object",
          hasTextStream: typeof vibexStream.textStream === "object",
        });

        // Track current speaking agent for multi-step boundaries
        let currentAgentId: string | null = null;

        // Process VibeX's fullStream and emit data-agent markers
        const iterable =
          (vibexStream.fullStream as AsyncIterable<any>) ||
          (vibexStream.textStream as AsyncIterable<any>);

        for await (const chunk of iterable) {
          // Detect agent changes from agent-text-delta events
          if (chunk?.type === "agent-text-delta") {
            const speakingAgent = chunk.agentId || "worker";

            // If agent changed, emit data-agent marker
            if (currentAgentId !== speakingAgent) {
              currentAgentId = speakingAgent;
              writer.write({
                type: "data-agent",
                id: `agent-${speakingAgent}-${Date.now()}`,
                data: {
                  agentId: speakingAgent,
                  messageId: `msg-${speakingAgent}-${Date.now()}`,
                },
              } as any);
            }

            // Convert to standard text-delta
            writer.write({
              type: "text-delta",
              delta: chunk.textDelta,
            } as any);
            continue;
          }

          // X orchestrator text
          if (chunk?.type === "text-delta" && chunk.textDelta) {
            const speakingAgent = "x";

            // If agent changed or this is the first agent, emit marker
            if (currentAgentId !== speakingAgent) {
              currentAgentId = speakingAgent;
              writer.write({
                type: "data-agent",
                id: `agent-x-${Date.now()}`,
                data: {
                  agentId: "x",
                  messageId: `msg-x-${Date.now()}`,
                },
              } as any);
            }

            writer.write({
              type: "text-delta",
              delta: chunk.textDelta,
            } as any);
            continue;
          }

          // Pass through metadata events as message-metadata
          if (chunk?.type === "orchestration") {
            writer.write({
              type: "message-metadata",
              metadata: {
                orchestration: {
                  needsPlan: chunk.needsPlan,
                  reasoning: chunk.reasoning,
                  availableAgents: chunk.availableAgents,
                  suggestedTasks: chunk.suggestedTasks,
                  taskCount: chunk.taskCount,
                },
                spaceId: space?.spaceId || "playground",
              },
            } as any);
            continue;
          }

          if (chunk?.type === "delegation") {
            writer.write({
              type: "message-metadata",
              metadata: {
                delegation: {
                  status: chunk.status,
                  taskId: chunk.taskId,
                  taskTitle: chunk.taskTitle,
                  agentName: chunk.agentName,
                  agentId: chunk.agentId,
                  result: chunk.result,
                  error: chunk.error,
                  warnings: chunk.warnings,
                  configuredTools: chunk.configuredTools,
                  loadedToolCount: chunk.loadedToolCount,
                },
                spaceId: space?.spaceId || "playground",
              },
            } as any);
            continue;
          }

          if (chunk?.type === "llm-call") {
            writer.write({
              type: "message-metadata",
              metadata: {
                llmCall: {
                  id: chunk.id,
                  status: chunk.status,
                  model: chunk.model,
                  agentId: chunk.agentId,
                  agentName: chunk.agentName,
                  purpose: chunk.purpose,
                  userMessagePreview: chunk.userMessagePreview,
                  responsePreview: chunk.responsePreview,
                  durationMs: chunk.durationMs,
                  error: chunk.error,
                },
                spaceId: space?.spaceId || "playground",
              },
            } as any);
            continue;
          }

          // Pass through tool-call and tool-result as-is
          if (chunk?.type === "tool-call") {
            writer.write(chunk as any);
            continue;
          }

          if (chunk?.type === "tool-result") {
            writer.write(chunk as any);
            continue;
          }
        }

        console.log("[Chat API] Stream completed");
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error("[Chat API] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
