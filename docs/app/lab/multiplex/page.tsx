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

  // Build display messages by extracting agent info from message parts
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
        // Extract agent info from message parts
        // The data-agent parts contain the agent information
        const agentParts = msg.parts.filter(
          (
            p
          ): p is {
            type: "data-agent";
            data: { agentId: string; messageId: string };
          } => p.type === "data-agent" && "data" in p
        );

        // Extract text content
        const textParts = msg.parts.filter(
          (p): p is { type: "text"; text: string } => p.type === "text"
        );

        // If we have multiple agents in one message, split content by agent
        if (agentParts.length > 1) {
          // Group text parts by agent (associate each text part with the preceding agent)
          let currentAgentIndex = 0;
          const agentContentMap = new Map<string, string>();

          for (const part of msg.parts) {
            if (part.type === "data-agent") {
              const agentId = part.data.agentId;
              if (!agentContentMap.has(agentId)) {
                agentContentMap.set(agentId, "");
              }
              // Find the index of this agent in agentParts
              currentAgentIndex = agentParts.findIndex(
                (ap) => ap.data.agentId === agentId
              );
            } else if (part.type === "text") {
              // Associate text with the current agent
              const currentAgent = agentParts[currentAgentIndex];
              if (currentAgent) {
                const existing =
                  agentContentMap.get(currentAgent.data.agentId) || "";
                agentContentMap.set(
                  currentAgent.data.agentId,
                  existing + part.text
                );
              }
            }
          }

          // Create separate display messages for each agent
          for (const [agentId, content] of agentContentMap.entries()) {
            if (content.trim()) {
              newDisplayMessages.push({
                id: `${msg.id}-${agentId}`,
                role: "assistant",
                agentId,
                content,
              });
            }
          }
        } else {
          // Single agent or no agent info
          const agentId =
            agentParts.length > 0 ? agentParts[0].data.agentId : "assistant";

          const content = textParts.map((p) => p.text).join("");

          newDisplayMessages.push({
            id: msg.id,
            role: "assistant",
            agentId,
            content,
          });
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
        <h1 className="text-2xl font-bold">Multi-Agent Chat Lab</h1>
        <p className="text-muted-foreground">
          Testing multiple agents responding to the same user message in
          parallel.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0 mb-4">
        {/* Group Chat Stream */}
        <Card className="flex flex-col overflow-hidden">
          <div className="p-2 bg-muted/50 border-b font-medium text-sm">
            Group Chat ({displayMessages.length} messages,{" "}
            {agentSequenceRef.current.length} agents detected)
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
