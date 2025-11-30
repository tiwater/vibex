"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  User,
  Wrench,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  FileText,
  ChevronDown,
  ChevronRight,
  Users,
  Copy,
  Check,
  Terminal,
  Code,
  Search,
  Globe,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/Markdown";
import type { XChatMessage, XChatPart } from "@vibex/react";

interface ChatMessageProps {
  message: XChatMessage;
}

function formatTime(date: Date | undefined): string {
  if (!date) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Agent colors for visual distinction
const AGENT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  "x": { bg: "bg-violet-500", border: "border-violet-500", text: "text-violet-600" },
  "researcher": { bg: "bg-blue-500", border: "border-blue-500", text: "text-blue-600" },
  "writer": { bg: "bg-emerald-500", border: "border-emerald-500", text: "text-emerald-600" },
  "analyst": { bg: "bg-amber-500", border: "border-amber-500", text: "text-amber-600" },
  "default": { bg: "bg-slate-500", border: "border-slate-500", text: "text-slate-600" },
};

function getAgentColor(agentName: string) {
  const name = agentName.toLowerCase();
  if (name.includes("research") || name.includes("researcher")) return AGENT_COLORS.researcher;
  if (name.includes("write") || name.includes("writer") || name.includes("content")) return AGENT_COLORS.writer;
  if (name.includes("analyst") || name.includes("analyze")) return AGENT_COLORS.analyst;
  if (name === "x" || name === "assistant") return AGENT_COLORS.x;
  return AGENT_COLORS.default;
}

// Parsed message segment for group chat display
interface MessageSegment {
  type: "agent-message" | "tool-call" | "content";
  agent?: string;
  content?: string;
  toolName?: string;
  toolArgs?: Record<string, string>;
  toolResult?: string;
  toolStatus?: "running" | "completed" | "failed";
}

// Parse message into segments for group chat display
function parseMessageIntoSegments(content: string): MessageSegment[] {
  const segments: MessageSegment[] = [];
  
  // Remove XML function call blocks and extract tool info
  const functionCallRegex = /<function_calls>([\s\S]*?)<\/function_calls>/g;
  const resultRegex = /<function_result>([\s\S]*?)<\/function_result>/g;
  const invokeRegex = /<invoke\s+name="([^"]+)">([\s\S]*?)<\/invoke>/g;
  const paramRegex = /<parameter\s+name="([^"]+)">([^<]*)<\/parameter>/g;

  // Extract tool calls
  let match;
  const toolCalls: MessageSegment[] = [];
  
  while ((match = functionCallRegex.exec(content)) !== null) {
    const block = match[1];
    let invokeMatch;
    while ((invokeMatch = invokeRegex.exec(block)) !== null) {
      const toolName = invokeMatch[1];
      const paramsBlock = invokeMatch[2];
      const args: Record<string, string> = {};
      
      let paramMatch;
      const paramRegexLocal = /<parameter\s+name="([^"]+)">([^<]*)<\/parameter>/g;
      while ((paramMatch = paramRegexLocal.exec(paramsBlock)) !== null) {
        args[paramMatch[1]] = paramMatch[2];
      }

      toolCalls.push({
        type: "tool-call",
        toolName,
        toolArgs: args,
        toolStatus: "running",
      });
    }
  }

  // Extract results
  let resultIndex = 0;
  while ((match = resultRegex.exec(content)) !== null) {
    if (toolCalls[resultIndex]) {
      toolCalls[resultIndex].toolResult = match[1].trim();
      toolCalls[resultIndex].toolStatus = "completed";
    }
    resultIndex++;
  }

  // Clean content
  let cleanContent = content
    .replace(/<function_calls>[\s\S]*?<\/function_calls>/g, "")
    .replace(/<function_result>[\s\S]*?<\/function_result>/g, "")
    .replace(/<[\s\S]*?<\/antml:[^>]+>/g, "");

  // Parse agent messages and task status
  const lines = cleanContent.split("\n");
  let currentContent: string[] = [];
  let currentAgent: string | null = null;

  const flushContent = () => {
    if (currentContent.length > 0) {
      const text = currentContent.join("\n").trim();
      if (text) {
        segments.push({
          type: currentAgent ? "agent-message" : "content",
          agent: currentAgent || undefined,
          content: text,
        });
      }
      currentContent = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines but preserve for formatting
    if (!trimmed) {
      currentContent.push(line);
      continue;
    }

    // Skip task execution headers
    if (trimmed.match(/^(Task Execution|Plan:|Summary)$/i) || trimmed.match(/^Plan:\s/i)) {
      continue;
    }

    // Skip tool name lines
    if (trimmed.match(/^[^\w]*\w+_\w+$/) && trimmed.length < 40) {
      continue;
    }
    if (trimmed.match(/Used \d+ tool/i)) {
      continue;
    }

    // Parse delegated tasks - these become agent messages
    const delegatedMatch = trimmed.match(/Delegated\s*"([^"]+)"\s*to\s*(.+)$/i);
    if (delegatedMatch) {
      flushContent();
      const agent = delegatedMatch[2].replace(/[^\w\u4e00-\u9fff\s]/g, "").trim();
      segments.push({
        type: "agent-message",
        agent,
        content: `Working on: ${delegatedMatch[1]}`,
      });
      continue;
    }

    // Parse completed tasks
    const completedMatch = trimmed.match(/completed\s*"([^"]+)"/i);
    if (completedMatch && trimmed.toLowerCase().includes('completed')) {
      flushContent();
      const beforeKeyword = trimmed.split(/completed/i)[0].replace(/[^\w\u4e00-\u9fff\s]/g, "").trim();
      const agent = beforeKeyword || "Agent";
      segments.push({
        type: "agent-message",
        agent,
        content: `Completed: ${completedMatch[1]}`,
      });
      continue;
    }

    // Parse failed tasks
    const failedMatch = trimmed.match(/failed\s*"([^"]+)"/i);
    if (failedMatch && trimmed.toLowerCase().includes('failed')) {
      flushContent();
      const beforeKeyword = trimmed.split(/failed/i)[0].replace(/[^\w\u4e00-\u9fff\s]/g, "").trim();
      const agent = beforeKeyword || "Agent";
      segments.push({
        type: "agent-message",
        agent,
        content: `Failed: ${failedMatch[1]}`,
      });
      continue;
    }

    // Regular content
    currentContent.push(line);
  }

  flushContent();

  // Add tool calls
  segments.push(...toolCalls);

  return segments;
}

// Copy button
function CopyButton({ text, className = "" }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`h-6 w-6 p-0 ${className}`}
      onClick={handleCopy}
    >
      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
    </Button>
  );
}

// Get tool icon
function getToolIcon(toolName: string) {
  const name = toolName.toLowerCase();
  if (name.includes("search")) return Search;
  if (name.includes("web") || name.includes("fetch") || name.includes("browse")) return Globe;
  if (name.includes("file") || name.includes("read") || name.includes("write")) return FileText;
  if (name.includes("code") || name.includes("execute")) return Code;
  if (name.includes("terminal") || name.includes("shell")) return Terminal;
  return Wrench;
}

// Compact Tool Call Component
function ToolCallBubble({ segment }: { segment: MessageSegment }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const Icon = getToolIcon(segment.toolName || "");
  
  const statusConfig = {
    running: { bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800", icon: Loader2, spin: true },
    completed: { bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800", icon: CheckCircle, spin: false },
    failed: { bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-800", icon: XCircle, spin: false },
  };

  const status = statusConfig[segment.toolStatus || "running"];
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-2 my-1"
    >
      <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
        <Wrench className="w-3.5 h-3.5 text-slate-500" />
      </div>
      <div className={`flex-1 rounded-xl border ${status.border} ${status.bg} overflow-hidden`}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-black/5 dark:hover:bg-white/5"
        >
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span className="font-mono text-xs font-medium">{segment.toolName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <StatusIcon className={`w-3.5 h-3.5 ${status.spin ? 'animate-spin text-blue-500' : segment.toolStatus === 'completed' ? 'text-emerald-500' : 'text-red-500'}`} />
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
          </div>
        </button>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              className="overflow-hidden border-t border-inherit"
            >
              <div className="p-2 space-y-2 text-xs">
                {segment.toolArgs && Object.keys(segment.toolArgs).length > 0 && (
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase mb-1">Input</div>
                    <pre className="p-2 rounded bg-white dark:bg-slate-900 overflow-x-auto">
                      {JSON.stringify(segment.toolArgs, null, 2)}
                    </pre>
                  </div>
                )}
                {segment.toolResult && (
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase mb-1">Output</div>
                    <pre className="p-2 rounded bg-white dark:bg-slate-900 overflow-x-auto max-h-32">
                      {segment.toolResult.slice(0, 300)}{segment.toolResult.length > 300 ? "..." : ""}
                    </pre>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Agent Message Bubble - looks like a chat message from that agent
function AgentMessageBubble({ segment, isLast }: { segment: MessageSegment; isLast: boolean }) {
  const agentName = segment.agent || "Agent";
  const colors = getAgentColor(agentName);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-2 my-2"
    >
      {/* Agent Avatar */}
      <Avatar className={`w-7 h-7 shrink-0 ${colors.bg}`}>
        <AvatarFallback className="text-[10px] font-medium text-white">
          {agentName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      {/* Message */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-xs font-medium ${colors.text}`}>{agentName}</span>
        </div>
        <div className="inline-block bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-md px-3 py-2 max-w-full">
          <p className="text-sm">{segment.content}</p>
        </div>
      </div>
    </motion.div>
  );
}

// Main content bubble from the orchestrator
function ContentBubble({ content }: { content: string }) {
  if (!content.trim()) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-2"
    >
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <Markdown>{content}</Markdown>
      </div>
    </motion.div>
  );
}

// User Message Component
function UserMessage({ message }: { message: XChatMessage }) {
  const content = message.content || 
    message.parts?.filter((p): p is XChatPart & { type: "text" } => p.type === "text")
      .map(p => p.text).join("") || "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 flex-row-reverse"
    >
      <Avatar className="w-8 h-8 shrink-0 bg-slate-200 dark:bg-slate-700">
        <AvatarFallback>
          <User className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        </AvatarFallback>
      </Avatar>
      <div className="text-right">
        <div className="inline-block bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5 max-w-[85%]">
          <p className="text-sm">{content}</p>
        </div>
        <div className="text-[10px] text-muted-foreground mt-1">
          {formatTime(message.createdAt)}
        </div>
      </div>
    </motion.div>
  );
}

// Assistant Message Component - Group Chat Style
function AssistantMessage({ message }: { message: XChatMessage }) {
  const rawContent = useMemo(() => {
    if (message.parts && message.parts.length > 0) {
      return message.parts
        .filter((part): part is XChatPart & { type: "text"; text: string } => 
          part.type === "text" && "text" in part
        )
        .map((part) => part.text)
        .join("");
    }
    return message.content || "";
  }, [message]);

  const segments = useMemo(() => parseMessageIntoSegments(rawContent), [rawContent]);

  // Separate segments by type
  const agentMessages = segments.filter(s => s.type === "agent-message");
  const toolCalls = segments.filter(s => s.type === "tool-call");
  const contentSegments = segments.filter(s => s.type === "content");
  const mainContent = contentSegments.map(s => s.content).join("\n").trim();

  const hasAgentActivity = agentMessages.length > 0 || toolCalls.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-1"
    >
      {/* Orchestrator Header */}
      <div className="flex items-center gap-2 mb-2">
        <Avatar className="w-8 h-8 shrink-0 bg-linear-to-br from-violet-500 to-purple-600">
          <AvatarFallback>
            <Bot className="w-4 h-4 text-white" />
          </AvatarFallback>
        </Avatar>
        <div>
          <span className="text-sm font-medium">{message.agentName || "X"}</span>
          <span className="text-xs text-muted-foreground ml-2">{formatTime(message.createdAt)}</span>
        </div>
      </div>

      {/* Agent Activity - Group Chat Style */}
      {hasAgentActivity && (
        <div className="ml-10 space-y-1 border-l-2 border-slate-200 dark:border-slate-700 pl-3">
          {/* Tool Calls */}
          {toolCalls.map((segment, idx) => (
            <ToolCallBubble key={`tool-${idx}`} segment={segment} />
          ))}
          
          {/* Agent Messages */}
          {agentMessages.map((segment, idx) => (
            <AgentMessageBubble 
              key={`agent-${idx}`} 
              segment={segment} 
              isLast={idx === agentMessages.length - 1}
            />
          ))}
        </div>
      )}

      {/* Main Content */}
      {mainContent && (
        <div className="ml-10 bg-muted/40 rounded-2xl rounded-tl-md px-4 py-3">
          <ContentBubble content={mainContent} />
        </div>
      )}

      {/* Loading state */}
      {!mainContent && !hasAgentActivity && (
        <div className="ml-10 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Thinking...</span>
        </div>
      )}
    </motion.div>
  );
}

// Main Export
export function ChatMessage({ message }: ChatMessageProps) {
  if (message.role === "user") {
    return <UserMessage message={message} />;
  }
  return <AssistantMessage message={message} />;
}
