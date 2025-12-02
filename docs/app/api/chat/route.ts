import { XAgent, fromXChatMessage, getTextFromXChatMessage } from "vibex";
type ChatMode = "ask" | "plan" | "agent";
import type { XChatMessage } from "@vibex/react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Default model - GPT-5.1 Codex via OpenRouter (optimized for coding tasks)
const DEFAULT_MODEL = "openai/gpt-5.1-codex";

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
    console.log("[Chat API] Space agents:", Array.from(space?.agents?.keys?.() || []));

    // Stream the response
    // Only set requestedAgent if explicitly provided - otherwise let X decide
    const streamOptions = {
      messages: xMessages,
      metadata: {
        ...metadata,
        chatMode,
        ...(agentId ? { requestedAgent: agentId } : {}),
      },
    };
    console.log("[Chat API] Calling xAgent.streamText with:", {
      mode: chatMode,
      requestedAgent: agentId,
      messageCount: xMessages.length,
      metadata: streamOptions.metadata,
    });

    const stream = await xAgent.streamText(streamOptions);
    console.log("[Chat API] xAgent.streamText returned", {
      hasFullStream: typeof stream.fullStream === "object",
      hasTextStream: typeof stream.textStream === "object",
      keys: Object.keys(stream || {}),
    });

    // Manual UI-message SSE to ensure consistent chunks for multi-agent/tool streaming.
    const displayAgent = agentId || "x";
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const emit = (obj: unknown) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        const messageId = `msg_${Date.now()}`;
        let sawTextEnd = false;
        let chunkCount = 0;
        const seenTypes = new Set<string>();

        // Emit initial start + metadata
        emit({
          type: "text-start",
          id: messageId,
          metadata: {
            agentName: displayAgent === "x" ? "X (Orchestrator)" : displayAgent,
            agentId: displayAgent,
            spaceId: space?.spaceId || "playground",
          },
        });

        try {
          const iterable =
            (stream.fullStream as AsyncIterable<any>) ||
            (stream.textStream as AsyncIterable<any>);

          for await (const chunk of iterable) {
            chunkCount++;
            if (chunk?.type) seenTypes.add(chunk.type);
            if (chunk?.type) {
              console.log("[Chat API] Stream chunk", {
                type: chunk.type,
                agentName: chunk.agentName || chunk.metadata?.agentName,
                agentId: chunk.agentId || chunk.metadata?.agentId,
                tool: chunk.toolName,
                toolCallId: chunk.toolCallId,
                text: chunk.textDelta
                  ? String(chunk.textDelta).slice(0, 120)
                  : undefined,
                state: chunk.state,
              });
            }

            // If chunk has agent identity (worker), emit metadata so UI can label it
            const chunkAgentName =
              chunk?.agentName || chunk?.metadata?.agentName || undefined;
            const chunkAgentId =
              chunk?.agentId || chunk?.metadata?.agentId || undefined;
            if (chunkAgentName || chunkAgentId) {
              emit({
                type: "message-metadata",
                metadata: {
                  agentName: chunkAgentName || chunkAgentId,
                  agentId: chunkAgentId || chunkAgentName,
                  spaceId: space?.spaceId || "playground",
                },
              });
            }

            if (chunk?.type === "text-delta" && chunk.textDelta) {
              emit({ type: "text-delta", id: messageId, delta: chunk.textDelta });
            }
            if (chunk?.type === "tool-call") {
              emit({
                type: "tool-call",
                id: messageId,
                toolCallId: chunk.toolCallId || chunk.id,
                toolName: chunk.toolName,
                args: chunk.args,
                state: chunk.state || "call",
                metadata: {
                  agentName: chunkAgentName || chunkAgentId,
                  agentId: chunkAgentId || chunkAgentName,
                },
              });
            }
            if (chunk?.type === "tool-result") {
              emit({
                type: "tool-result",
                id: messageId,
                toolCallId: chunk.toolCallId || chunk.id,
                toolName: chunk.toolName,
                result: chunk.result,
                metadata: {
                  agentName: chunkAgentName || chunkAgentId,
                  agentId: chunkAgentId || chunkAgentName,
                },
              });
            }
            if (chunk?.type === "delegation") {
              const delegationPayload = {
                status: chunk.status,
                taskId: chunk.taskId,
                taskTitle: chunk.taskTitle,
                agentName: chunk.agentName,
                agentId: chunk.agentId,
                result: chunk.result,
                error: chunk.error,
              };
              emit({
                type: "message-metadata",
                metadata: {
                  agentName: chunk.agentName || chunk.agentId,
                  agentId: chunk.agentId || chunk.agentName,
                  delegation: delegationPayload,
                  spaceId: space?.spaceId || "playground",
                },
              });
            }
            if (chunk?.type === "finish") {
              emit({ type: "text-end", id: messageId });
              sawTextEnd = true;
            }
          }
        } catch (err) {
          controller.error(err);
          return;
        }

        if (!sawTextEnd) {
          emit({ type: "text-end", id: messageId });
        }
        console.log("[Chat API] Stream finished", {
          messageId,
          chunkCount,
          types: Array.from(seenTypes),
          mode: chatMode,
        });
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        Connection: "keep-alive",
        "Cache-Control": "no-cache, no-transform",
      },
    });
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
