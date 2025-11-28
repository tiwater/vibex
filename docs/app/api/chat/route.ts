import { XAgent, XChatMode } from "vibex";
import type { UIMessage } from "ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Default model - uses OpenRouter format to use OPENROUTER_API_KEY
const DEFAULT_MODEL = "anthropic/claude-sonnet-4";

// Valid chat modes
const VALID_MODES: XChatMode[] = ["ask", "plan", "agent"];

// Extract text from UIMessage parts
function getTextFromUIMessage(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

// Convert UIMessage to XMessage format
function uiToXMessage(msg: UIMessage): {
  role: "user" | "assistant" | "system";
  content: string;
} {
  return {
    role: msg.role as "user" | "assistant" | "system",
    content: getTextFromUIMessage(msg),
  };
}

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
      | UIMessage
      | undefined;
    if (!lastMessage || lastMessage.role !== "user") {
      return new Response("No user message found", { status: 400 });
    }

    const lastContent = getTextFromUIMessage(lastMessage);
    if (!lastContent) {
      return new Response("Empty message content", { status: 400 });
    }

    console.log("[Chat API] Processing:", lastContent.slice(0, 100));

    // Initialize or resume XAgent with the space
    let xAgent: XAgent;

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
    const requestedAgent = agentId || "x";

    // Extract chatMode from metadata (default to "agent")
    const chatMode = (metadata?.chatMode as XChatMode) || "agent";
    if (!VALID_MODES.includes(chatMode)) {
      return new Response(`Invalid chat mode: ${chatMode}`, { status: 400 });
    }

    // Convert UIMessages to XMessages format
    const xMessages = (messages as UIMessage[]).map(uiToXMessage);

    console.log("[Chat API] Streaming with", xMessages.length, "messages", "mode:", chatMode);

    // Stream the response
    const stream = await xAgent.streamText({
      messages: xMessages,
      metadata: {
        ...metadata,
        chatMode,
        requestedAgent,
      },
    });

    // Return UIMessageStream response with agent metadata
    return stream.toUIMessageStreamResponse({
      messageMetadata: ({ part }) => {
        // Send metadata when streaming starts
        if (part.type === "start") {
          return {
            agentName:
              requestedAgent === "x" ? "X (Orchestrator)" : requestedAgent,
            agentId: requestedAgent,
            spaceId: space?.spaceId || "playground",
            delegationType: requestedAgent === "x" ? "orchestrator" : "direct",
            startedAt: Date.now(),
          };
        }
        // Send additional metadata when streaming completes
        if (part.type === "finish") {
          return {
            finishedAt: Date.now(),
            finishReason: part.finishReason,
          };
        }
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
