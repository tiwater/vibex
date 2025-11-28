"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sparkles,
  Users,
  AlertCircle,
  ArrowRight,
  Loader2,
  MessageSquare,
  ListTodo,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import {
  usePlayground,
  ChatMessage,
  TypingIndicator,
  ChatInput,
  type ChatMode,
} from "@/components/playground";

/**
 * Real Playground Page
 *
 * This is a real demonstration of the VibeX framework.
 * It connects to the actual backend and shows real AI responses.
 * No fake simulation - everything you see is real.
 */
export default function PlaygroundPage() {
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    input,
    setInput,
    isLoading,
    status,
    sendMessage,
    error,
    clearError,
    chatMode,
    setChatMode,
  } = usePlayground();

  // Initialize after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle send
  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput("");
  };

  // Loading state
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-16 h-16 rounded-2xl bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/25"
          >
            <Sparkles className="w-8 h-8 shrink-0 text-white" />
          </motion.div>
          <p className="text-muted-foreground">Connecting to VibeX...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div
        data-playground
        className="h-[calc(100dvh-4rem)] overflow-hidden bg-background"
      >
        <div className="max-w-4xl mx-auto p-3 h-full flex flex-col gap-3">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="shrink-0">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <button
                  onClick={clearError}
                  className="text-sm underline hover:no-underline"
                >
                  Dismiss
                </button>
              </AlertDescription>
            </Alert>
          )}

          {/* Chat Card */}
          <Card className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <CardHeader className="py-2.5 px-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div>
                    <CardTitle className="text-sm font-semibold">
                      X Playground
                    </CardTitle>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Chat Mode Switcher */}
                  <ToggleGroup
                    type="single"
                    value={chatMode}
                    onValueChange={(value) =>
                      value && setChatMode(value as ChatMode)
                    }
                    variant="outline"
                    size="sm"
                    className="rounded-lg p-0.5 border-0"
                  >
                    {[
                      {
                        label: "Ask",
                        value: "ask",
                        icon: MessageSquare,
                        description: "Direct response, no multi-agent",
                      },
                      {
                        label: "Plan",
                        value: "plan",
                        icon: ListTodo,
                        description: "Create plan for approval first",
                      },
                      {
                        label: "Agent",
                        value: "agent",
                        icon: Zap,
                        description: "Auto-execute with multi-agent",
                      },
                    ].map(({ label, value, icon: Icon, description }) => (
                      <Tooltip key={value}>
                        <TooltipTrigger asChild>
                          <ToggleGroupItem
                            value={value}
                            className={`h-7 px-2 text-xs transition-all ${
                              (value as ChatMode) === chatMode
                                ? "bg-muted text-foreground border-border shadow-sm font-semibold"
                                : "bg-transparent text-muted-foreground border-transparent hover:bg-muted/50 hover:text-foreground"
                            }`}
                          >
                            <Icon className="w-3 h-3 shrink-0" />
                            {label}
                          </ToggleGroupItem>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          {description}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </ToggleGroup>

                  {/* Status badges */}
                  {status === "streaming" && (
                    <Badge
                      variant="secondary"
                      className="text-xs flex items-center gap-1"
                    >
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Streaming
                    </Badge>
                  )}
                  {status === "submitted" && (
                    <Badge
                      variant="secondary"
                      className="text-xs flex items-center gap-1"
                    >
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Processing
                    </Badge>
                  )}
                  {status === "idle" && messages.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {messages.length} message
                      {messages.length !== 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden min-h-0">
              {/* Messages */}
              {messages.length === 0 ? (
                <div className="flex-1 flex items-start justify-center overflow-auto">
                  <div className="text-center max-w-md px-8 pt-8">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto shadow-xl shadow-violet-500/20">
                        <Sparkles className="w-10 h-10 shrink-0 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">
                          X Playground
                        </h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {chatMode === "ask" &&
                            "Ask mode: Direct responses from X without multi-agent orchestration."}
                          {chatMode === "plan" &&
                            "Plan mode: X creates a detailed plan for your approval before execution."}
                          {chatMode === "agent" &&
                            "Agent mode: X automatically orchestrates multiple agents to complete complex tasks."}
                        </p>
                      </div>

                      {/* Example prompts based on mode */}
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">
                          Try{" "}
                          {chatMode === "agent" ? "a complex task" : "asking"}
                        </p>
                        {chatMode === "ask" &&
                          [
                            "What is the X framework?",
                            "Explain multi-agent systems",
                            "How does task planning work?",
                          ].map((prompt, idx) => (
                            <motion.button
                              key={idx}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.1 * idx }}
                              onClick={() => setInput(prompt)}
                              className="w-full text-left px-4 py-3 rounded-lg bg-muted/50 hover:bg-muted border border-border hover:border-violet-500/30 text-sm text-foreground transition-all group"
                            >
                              <span className="flex items-center justify-between">
                                {prompt}
                                <ArrowRight className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-violet-500" />
                              </span>
                            </motion.button>
                          ))}
                        {chatMode === "plan" &&
                          [
                            "Create a plan to research AI trends and write a report",
                            "Plan a website redesign with multiple components",
                            "Design a data pipeline architecture",
                          ].map((prompt, idx) => (
                            <motion.button
                              key={idx}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.1 * idx }}
                              onClick={() => setInput(prompt)}
                              className="w-full text-left px-4 py-3 rounded-lg bg-muted/50 hover:bg-muted border border-border hover:border-violet-500/30 text-sm text-foreground transition-all group"
                            >
                              <span className="flex items-center justify-between">
                                {prompt}
                                <ArrowRight className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-violet-500" />
                              </span>
                            </motion.button>
                          ))}
                        {chatMode === "agent" &&
                          [
                            "Research the latest AI agent frameworks and write a summary",
                            "Analyze competitor products and create a comparison report",
                            "Build a project plan with research, design, and implementation",
                          ].map((prompt, idx) => (
                            <motion.button
                              key={idx}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.1 * idx }}
                              onClick={() => setInput(prompt)}
                              className="w-full text-left px-4 py-3 rounded-lg bg-muted/50 hover:bg-muted border border-border hover:border-violet-500/30 text-sm text-foreground transition-all group"
                            >
                              <span className="flex items-center justify-between">
                                {prompt}
                                <ArrowRight className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-violet-500" />
                              </span>
                            </motion.button>
                          ))}
                      </div>
                    </motion.div>
                  </div>
                </div>
              ) : (
                <ScrollArea className="flex-1 px-4">
                  <div className="py-4 space-y-4">
                    <AnimatePresence initial={false}>
                      {messages.map((message) => (
                        <ChatMessage key={message.id} message={message} />
                      ))}
                    </AnimatePresence>

                    {isLoading && <TypingIndicator />}

                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              )}

              <ChatInput
                value={input}
                onChange={setInput}
                onSend={handleSend}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
