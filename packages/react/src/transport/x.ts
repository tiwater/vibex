import {
  HttpChatTransport,
  type UIMessage,
  type UIMessageChunk,
} from "ai";

/**
 * XChatTransport
 *
 * Custom chat transport that consumes the VibeX SSE stream and maps it
 * into UIMessageChunk events understood by the AI SDK chat UI helpers.
 */
export class XChatTransport extends HttpChatTransport<UIMessage> {
  processResponseStream(stream: ReadableStream<Uint8Array>) {
    // Parse SSE JSON payloads manually and map to UIMessageChunk
    const decoder = new TextDecoder();
    let buffer = "";

    const parsedStream = new ReadableStream<any>({
      async start(controller) {
        const reader = stream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let idx: number;
            while ((idx = buffer.indexOf("\n\n")) !== -1) {
              const chunkStr = buffer.slice(0, idx).trim();
              buffer = buffer.slice(idx + 2);
              if (!chunkStr.startsWith("data:")) continue;
              const jsonStr = chunkStr.slice(5).trim();
              try {
                const parsed = JSON.parse(jsonStr);
                controller.enqueue(parsed);
              } catch {
                // Ignore malformed chunk
              }
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        } finally {
          reader.releaseLock();
        }
      },
    });

    return parsedStream.pipeThrough(
      new TransformStream({
        transform(value, controller) {
          const id =
            value.id ||
            value.messageId ||
            `msg_${value.timestamp || Date.now()}`;

          const mapped: UIMessageChunk | null = (() => {
            switch (value.type) {
              case "text-start":
                return {
                  type: "text-start",
                  id,
                  metadata: value.metadata,
                } as UIMessageChunk;
              case "text-delta":
                return {
                  type: "text-delta",
                  id,
                  delta: value.delta ?? value.textDelta ?? "",
                  metadata: value.metadata,
                } as UIMessageChunk;
              case "text-end":
                return {
                  type: "text-end",
                  id,
                  metadata: value.metadata,
                } as UIMessageChunk;
              case "message-metadata":
                return {
                  type: "message-metadata",
                  messageMetadata: value.metadata,
                } as unknown as UIMessageChunk;
              case "tool-call":
                return {
                  type: "tool-call",
                  toolCallId: value.toolCallId || id,
                  toolName: value.toolName,
                  args: value.args,
                  state: value.state,
                  id,
                } as unknown as UIMessageChunk;
              case "tool-result":
                return {
                  type: "tool-result",
                  toolCallId: value.toolCallId || id,
                  toolName: value.toolName,
                  result: value.result,
                  id,
                } as unknown as UIMessageChunk;
              default:
                console.debug("[XChatTransport] Ignored chunk", value.type, {
                  keys: Object.keys(value || {}),
                });
                return null;
            }
          })();

          if (mapped) {
            controller.enqueue(mapped);
          }
        },
      })
    );
  }
}
