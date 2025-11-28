"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { Sparkles, MessageSquare, Terminal, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TooltipProvider } from "@/components/ui/tooltip";

import {
  type Message,
  type Space,
  type Task,
  type Artifact,
  DEMO_AGENTS,
  DEMO_TOOLS,
  SIMULATED_RESPONSES,
  WELCOME_MESSAGE,
  SpacesList,
  TasksList,
  ChatMessage,
  TypingIndicator,
  ChatInput,
  AgentsList,
  ToolsList,
  ArtifactsList,
  CodeSandbox,
} from "@/components/playground";

export default function PlaygroundPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState("x");
  const [currentSpace, setCurrentSpace] = useState<Space | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [tasks] = useState<Task[]>([
    {
      id: "t1",
      title: "Research phase",
      status: "completed",
      assignedTo: "researcher",
    },
    {
      id: "t2",
      title: "Draft outline",
      status: "running",
      assignedTo: "writer",
      progress: 65,
    },
    {
      id: "t3",
      title: "Write introduction",
      status: "pending",
      assignedTo: "writer",
    },
    {
      id: "t4",
      title: "Code examples",
      status: "pending",
      assignedTo: "developer",
    },
  ]);
  const [artifacts] = useState<Artifact[]>([
    { id: "a1", name: "research_notes.md", type: "document", size: "12 KB" },
    { id: "a2", name: "api_schema.json", type: "data", size: "4 KB" },
    { id: "a3", name: "main.ts", type: "code", size: "8 KB" },
  ]);
  const [streamingEnabled, setStreamingEnabled] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize after mount
  useEffect(() => {
    setMounted(true);
    const now = Date.now();

    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: WELCOME_MESSAGE,
        timestamp: now,
        agent: "X",
      },
    ]);

    setSpaces([
      {
        id: "space_1",
        name: "AI Research Paper",
        goal: "Write a research paper on transformers",
        createdAt: now - 86400000 * 3,
        updatedAt: now - 3600000,
        messageCount: 47,
        status: "active",
      },
      {
        id: "space_2",
        name: "E-commerce API",
        goal: "Build a RESTful API for e-commerce",
        createdAt: now - 86400000 * 7,
        updatedAt: now - 86400000,
        messageCount: 124,
        status: "active",
      },
      {
        id: "space_3",
        name: "Marketing Strategy",
        goal: "Develop Q1 2025 marketing strategy",
        createdAt: now - 86400000 * 14,
        updatedAt: now - 86400000 * 5,
        messageCount: 89,
        status: "completed",
      },
    ]);
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Simulate typing
  const simulateTyping = async (text: string, messageId: string) => {
    const words = text.split(" ");
    let currentText = "";
    for (let i = 0; i < words.length; i++) {
      await new Promise((resolve) =>
        setTimeout(resolve, 30 + Math.random() * 20)
      );
      currentText += (i > 0 ? " " : "") + words[i];
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, content: currentText } : m
        )
      );
    }
  };

  // Send message
  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: inputValue,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    await new Promise((resolve) =>
      setTimeout(resolve, 1000 + Math.random() * 1000)
    );

    const responseKey = inputValue.toLowerCase().includes("research")
      ? "research"
      : inputValue.toLowerCase().includes("code")
        ? "code"
        : "default";

    const agent = DEMO_AGENTS.find((a) => a.id === selectedAgent);
    const assistantMessage: Message = {
      id: `msg_${Date.now()}_assistant`,
      role: "assistant",
      content: streamingEnabled ? "" : SIMULATED_RESPONSES[responseKey],
      timestamp: Date.now(),
      agent: agent?.name || "X",
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsTyping(false);

    if (streamingEnabled) {
      await simulateTyping(
        SIMULATED_RESPONSES[responseKey],
        assistantMessage.id
      );
    }
  };

  // Create new space
  const createNewSpace = () => {
    const now = Date.now();
    const newSpace: Space = {
      id: `space_${now}`,
      name: "New Space",
      goal: "Define your goal...",
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
      status: "active",
    };
    setSpaces((prev) => [newSpace, ...prev]);
    setCurrentSpace(newSpace);
    setMessages([
      {
        id: "welcome_new",
        role: "assistant",
        content: "🎉 New space created! What would you like to accomplish?",
        timestamp: now,
        agent: "X",
      },
    ]);
  };

  // Loading state
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-6 h-6 shrink-0 text-white animate-pulse" />
          </div>
          <p className="text-muted-foreground">Loading Playground...</p>
        </div>
      </div>
    );
  }

  const currentAgent = DEMO_AGENTS.find((a) => a.id === selectedAgent);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="max-w-[1800px] mx-auto p-4">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-4 min-h-[calc(100vh-140px)]">
            {/* Left Sidebar */}
            <div className="hidden lg:flex flex-col gap-4">
              <SpacesList
                spaces={spaces}
                currentSpace={currentSpace}
                onSelectSpace={setCurrentSpace}
                onCreateSpace={createNewSpace}
              />
              <TasksList tasks={tasks} />
            </div>

            {/* Main Chat Area */}
            <Card className="flex flex-col min-h-[500px]">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="flex flex-col h-full"
              >
                <div className="border-b px-4 py-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <TabsList className="!flex flex-1 flex-wrap gap-2 bg-transparent p-0 min-h-[3rem] w-full lg:w-auto">
                    <TabsTrigger
                      value="chat"
                      className="gap-2 flex-1 min-w-[140px] sm:min-w-0 sm:flex-initial"
                    >
                      <MessageSquare className="w-4 h-4 shrink-0" />
                      Chat
                    </TabsTrigger>
                    <TabsTrigger
                      value="code"
                      className="gap-2 flex-1 min-w-[140px] sm:min-w-0 sm:flex-initial"
                    >
                      <Terminal className="w-4 h-4 shrink-0" />
                      Code
                    </TabsTrigger>
                    <TabsTrigger
                      value="artifacts"
                      className="gap-2 flex-1 min-w-[140px] sm:min-w-0 sm:flex-initial"
                    >
                      <FileText className="w-4 h-4 shrink-0" />
                      Artifacts
                    </TabsTrigger>
                  </TabsList>

                  <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    <Select
                      value={selectedAgent}
                      onValueChange={setSelectedAgent}
                    >
                      <SelectTrigger className="w-full sm:w-[160px] h-8 text-sm">
                        <SelectValue placeholder="Select agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEMO_AGENTS.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            <div className="flex items-center gap-2">
                              <agent.icon
                                className={`w-4 h-4 shrink-0 ${agent.color}`}
                              />
                              <span>{agent.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Separator
                      orientation="vertical"
                      className="h-6 hidden sm:block"
                    />
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                      <Switch
                        checked={streamingEnabled}
                        onCheckedChange={setStreamingEnabled}
                        id="streaming"
                      />
                      <label
                        htmlFor="streaming"
                        className="text-sm text-muted-foreground cursor-pointer"
                      >
                        Stream
                      </label>
                    </div>
                  </div>
                </div>

                <TabsContent
                  value="chat"
                  className="flex-1 flex flex-col m-0 overflow-hidden"
                >
                  <ScrollArea className="flex-1 px-4">
                    <div className="py-4 space-y-4">
                      <AnimatePresence initial={false}>
                        {messages.map((message) => (
                          <ChatMessage key={message.id} message={message} />
                        ))}
                      </AnimatePresence>
                      {isTyping && <TypingIndicator />}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                  <ChatInput
                    value={inputValue}
                    onChange={setInputValue}
                    onSend={handleSend}
                    isTyping={isTyping}
                    selectedAgent={currentAgent}
                    streamingEnabled={streamingEnabled}
                  />
                </TabsContent>

                <TabsContent value="code" className="flex-1 m-0 p-4">
                  <CodeSandbox />
                </TabsContent>

                <TabsContent value="artifacts" className="flex-1 m-0 p-4">
                  <ArtifactsList artifacts={artifacts} />
                </TabsContent>
              </Tabs>
            </Card>

            {/* Right Sidebar */}
            <div className="hidden lg:flex flex-col gap-4">
              <AgentsList
                agents={DEMO_AGENTS}
                selectedAgent={selectedAgent}
                onSelectAgent={setSelectedAgent}
              />
              <ToolsList tools={DEMO_TOOLS} />
            </div>
          </div>
        </div>

      </div>
    </TooltipProvider>
  );
}
