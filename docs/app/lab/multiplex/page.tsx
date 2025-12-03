"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useMemo, useState, useEffect, useRef } from "react";
import type { ChatUIMessage } from "@/app/api/chat/route";

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  agentId: string;
  content: string;
}

export default function MultiplexLabPage() {
  const [input, setInput] = useState("");
  const [dataEvents, setDataEvents] = useState<any[]>([]);
  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([]);
  const agentSequenceRef = useRef<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Create transport for the chat
  const transport = useMemo(
    () =>
      new DefaultChatTransport<ChatUIMessage>({
        api: "/api/chat",
      }),
    []
  );

  // Use useChat hook with onData callback to capture agent sequence
  const { messages, sendMessage, status } = useChat<ChatUIMessage>({
    transport,
    onData: (dataPart) => {
      console.log("[Multiplex] onData received:", dataPart);
      setDataEvents((prev) => [...prev, dataPart]);

      // Track agent sequence from data-agent events
      if (dataPart.type === "data-agent" && "data" in dataPart) {
        const data = dataPart.data as { agentId: string; messageId: string };
        console.log("[Multiplex] Agent detected:", data.agentId);
        agentSequenceRef.current.push(data.agentId);
      }
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  // Split combined assistant message into separate agent messages
  useEffect(() => {
    const newDisplayMessages: DisplayMessage[] = [];

    for (const msg of messages) {
      if (msg.role === "user") {
        newDisplayMessages.push({
          id: msg.id,
          role: "user",
          agentId: "user",
          content: msg.parts
            .filter((p) => p.type === "text")
            .map((p) => (p as { text: string }).text)
            .join(""),
        });
      } else {
        // Assistant message - split by agent sequence
        const fullContent = msg.parts
          .filter((p) => p.type === "text")
          .map((p) => (p as { text: string }).text)
          .join("");

        const agentCount = agentSequenceRef.current.length;

        if (agentCount === 0) {
          // No agent data yet, show as single message
          newDisplayMessages.push({
            id: msg.id,
            role: "assistant",
            agentId: "assistant",
            content: fullContent,
          });
        } else if (agentCount === 1) {
          // Single agent
          newDisplayMessages.push({
            id: msg.id,
            role: "assistant",
            agentId: agentSequenceRef.current[0],
            content: fullContent,
          });
        } else {
          // Multiple agents - split content
          // Try to find a natural split point around the middle
          const contentLength = fullContent.length;
          const targetSplitPoint = Math.floor(contentLength / agentCount);

          let currentPos = 0;
          for (let i = 0; i < agentCount; i++) {
            const agentId = agentSequenceRef.current[i];

            if (i === agentCount - 1) {
              // Last agent gets remaining content
              newDisplayMessages.push({
                id: `${msg.id}-${agentId}`,
                role: "assistant",
                agentId,
                content: fullContent.slice(currentPos),
              });
            } else {
              // Find sentence boundary near target split
              const searchStart = currentPos + targetSplitPoint;
              const searchText = fullContent.slice(searchStart, searchStart + 200);
              const sentenceMatch = searchText.match(/[.!?]\s+/);

              let splitPoint = searchStart;
              if (sentenceMatch && sentenceMatch.index !== undefined) {
                splitPoint = searchStart + sentenceMatch.index + sentenceMatch[0].length;
              } else {
                // No sentence boundary found, just use target
                splitPoint = searchStart;
              }

              newDisplayMessages.push({
                id: `${msg.id}-${agentId}`,
                role: "assistant",
                agentId,
                content: fullContent.slice(currentPos, splitPoint).trim(),
              });

              currentPos = splitPoint;
            }
          }
        }
      }
    }

    setDisplayMessages(newDisplayMessages);
  }, [messages]);

  const handleSend = async () => {
    const currentInput = input.trim();
    if (!currentInput || isLoading) return;

    // Clear previous state
    setDataEvents([]);
    setDisplayMessages([]);
    agentSequenceRef.current = [];

    await sendMessage({ text: currentInput });
    setInput("");
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages]);

  return (
    <div className="container mx-auto p-4 max-w-6xl h-[calc(100vh-4rem)] flex flex-col">
      <div className="mb-4 flex-none">
        <h1 className="text-2xl font-bold">Multiplexing Lab</h1>
        <p className="text-muted-foreground">
          Testing interleaved multi-agent streaming in a group chat format.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0 mb-4">
        {/* Group Chat Stream */}
        <Card className="flex flex-col overflow-hidden">
          <div className="p-2 bg-muted/50 border-b font-medium text-sm">
            Group Chat ({displayMessages.length} messages, {agentSequenceRef.current.length} agents detected)
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {displayMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-3 border ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted border-border"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1 uppercase">
                      {msg.agentId}
                    </div>
                  )}
                  {msg.role === "user" && (
                    <div className="text-xs font-bold mb-1 uppercase opacity-80">
                      You
                    </div>
                  )}
                  <div className="whitespace-pre-wrap text-sm">
                    {msg.content || "..."}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </Card>

        {/* Data Events Log */}
        <Card className="flex flex-col overflow-hidden">
          <div className="p-2 bg-muted/50 border-b font-medium text-sm">
            Data Events Log ({dataEvents.length} events)
          </div>
          <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-2">
            {dataEvents.map((event, i) => (
              <div
                key={i}
                className="p-2 bg-slate-100 dark:bg-slate-900 rounded border"
              >
                <pre className="whitespace-pre-wrap break-all">
                  {JSON.stringify(event, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask something to see both agents respond..."
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button type="button" onClick={handleSend} disabled={isLoading}>
          {isLoading ? "Streaming..." : "Send"}
        </Button>
      </div>
    </div>
  );
}
