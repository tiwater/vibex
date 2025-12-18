"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  AlertCircle,
  ArrowRight,
  Loader2,
  BrushCleaning,
  Activity,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  usePlayground,
  ChatMessage,
  TypingIndicator,
  ChatInput,
  DiagnosisPanel,
  type ChatMode,
} from "@/components/playground";
import { cn } from "@/lib/utils";

/**
 * Real Playground Page
 *
 * This is a real demonstration of the VibeX framework.
 * It connects to the actual backend and shows real AI responses.
 * No fake simulation - everything you see is real.
 */
export default function PlaygroundPage() {
  const [mounted, setMounted] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    input,
    setInput,
    isLoading,
    status,
    sendMessage,
    agentId,
    setAgentId,
    error,
    clearError,
    chatMode,
    setChatMode,
    resetSpace,
    diagnostics,
  } = usePlayground();

  // Initialize after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-scroll only when message count changes (not on every streaming update)
  const messageCount = messages.length;
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messageCount]);

  // Handle send - accept value from ChatInput to avoid stale state issues
  const handleSend = (value?: string) => {
    const messageContent = value || input;
    if (!messageContent.trim() || isLoading) return;
    sendMessage(messageContent);
    setInput("");
  };

  // Handle reset - open dialog
  const handleReset = () => {
    setIsResetDialogOpen(true);
  };

  // Confirm reset
  const confirmReset = async () => {
    // Try to get spaceId from any message metadata, or use "playground"
    const messageWithSpaceId = messages.find((msg) => msg.metadata?.spaceId);
    const spaceId = messageWithSpaceId?.metadata?.spaceId || "playground";

    await resetSpace(spaceId as string);
    setIsResetDialogOpen(false);
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
        className="h-[calc(100dvh-4rem)] overflow-hidden bg-background flex flex-row"
      >
        {/* Chat Area */}
        <div 
          className={cn(
            "flex flex-col h-full transition-all duration-300 ease-in-out",
            showDiagnosis ? "w-[60%] border-r border-border" : "w-full"
          )}
        >
          <div
            className={cn(
              "flex-1 flex flex-col min-h-0 p-3 gap-3",
              !showDiagnosis && "max-w-4xl mx-auto w-full"
            )}
          >
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

            <div className="relative flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
                {status === "streaming" && (
                  <Badge
                    variant="outline"
                    className="h-6 gap-1.5 pl-1.5 pr-2.5 bg-background border-border shadow-sm text-foreground"
                  >
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="text-xs font-medium">
                      {messages.length > 0 &&
                      messages[messages.length - 1].role === "assistant" &&
                      messages[messages.length - 1].content
                        ? "Generating..."
                        : "Thinking..."}
                    </span>
                  </Badge>
                )}
                {status === "submitted" && (
                  <Badge
                    variant="secondary"
                    className="text-xs flex items-center gap-1"
                  >
                    <Loader2 className="w-3 h-3 animate-spin" />
                  </Badge>
                )}
                {status === "idle" && messages.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {messages.length}
                  </Badge>
                )}
                {messages.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleReset}
                        disabled={isLoading}
                      >
                        <BrushCleaning className="w-4 h-4 shrink-0" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      Reset space (clear all content and restore defaults)
                    </TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={showDiagnosis ? "secondary" : "ghost"}
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setShowDiagnosis(!showDiagnosis)}
                    >
                      <Activity className="w-4 h-4 shrink-0" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Toggle diagnosis panel
                  </TooltipContent>
                </Tooltip>
              </div>
              {messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center overflow-auto p-6">
                  <div className="text-center max-w-md">
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
                              onClick={() => sendMessage(prompt)}
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
                              onClick={() => sendMessage(prompt)}
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
                              onClick={() => sendMessage(prompt)}
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
                    {messages.map((message) => (
                      <ChatMessage key={message.id} message={message} />
                    ))}

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
                agentId={agentId}
                onAgentChange={setAgentId}
                chatMode={chatMode}
                onChatModeChange={setChatMode}
              />
            </div>
          </div>
        </div>

        {/* Diagnosis Panel */}
        {showDiagnosis && (
          <div className="w-[40%] shrink-0 h-full bg-background transition-all duration-300 ease-in-out">
            <DiagnosisPanel
              messages={messages}
              status={status}
              isLoading={isLoading}
              onClose={() => setShowDiagnosis(false)}
              className="h-full"
              chatMode={chatMode}
              agentId={agentId}
              error={error}
              diagnostics={diagnostics}
            />
          </div>
        )}
      </div>

      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Space?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset this space? This will delete all
              conversations, artifacts, and reset agents to defaults.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReset}>
              Reset Space
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
