"use client";

import React, { useState } from "react";
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
  Brain,
  ChevronDown,
  ChevronRight,
  Users,
  Zap,
  Copy,
  Check,
  Eye,
  EyeOff,
  Terminal,
  Code,
  ArrowRight,
  ExternalLink,
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

// Get display text from message (handles both parts and content)
function getDisplayText(message: XChatMessage): string {
  if (message.parts && message.parts.length > 0) {
    const textParts = message.parts
      .filter(
        (part): part is XChatPart & { type: "text"; text: string } =>
          part.type === "text" && "text" in part
      )
      .map((part) => part.text)
      .join("");
    if (textParts) return textParts;
  }
  return message.content || "";
}

// Parse structured content from text
interface ParsedContent {
  tasks: ParsedTask[];
  toolUsage: string[];
  cleanContent: string;
}

interface ParsedTask {
  type: "delegated" | "completed" | "failed" | "running";
  agent: string;
  task: string;
  toolsUsed?: string[];
}

function parseContent(content: string): ParsedContent {
  const tasks: ParsedTask[] = [];
  const toolUsage: string[] = [];
  const contentLines: string[] = [];
  const seenTasks = new Set<string>();

  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      contentLines.push(line);
      continue;
    }

    // Skip "Task Execution" header
    if (trimmed.match(/^Task Execution$/i)) {
      continue;
    }

    // Skip "Plan:" header lines  
    if (trimmed.match(/^Plan:/i)) {
      continue;
    }

    // Match tool usage lines like "search_web" or "Used 1 tool(s)"
    if (trimmed.match(/\w+_\w+$/) && trimmed.length < 50) {
      continue; // Skip tool name lines
    }
    if (trimmed.match(/Used \d+ tool/i)) {
      continue;
    }

    // Match delegated tasks - look for "Delegated" keyword anywhere
    const delegatedMatch = trimmed.match(/Delegated\s*"([^"]+)"\s*to\s*(.+)$/i);
    if (delegatedMatch) {
      const agent = delegatedMatch[2].trim();
      const taskKey = `delegated-${delegatedMatch[1]}-${agent}`;
      if (!seenTasks.has(taskKey)) {
        seenTasks.add(taskKey);
        tasks.push({
          type: "delegated",
          task: delegatedMatch[1],
          agent: agent,
        });
      }
      continue;
    }

    // Match completed tasks - look for "completed" keyword
    // Handle lines like: ✅ 研究员 completed "task" or just: Agent completed "task"
    if (trimmed.includes('completed "') || trimmed.includes("completed \"")) {
      const completedMatch = trimmed.match(/completed\s*"([^"]+)"/i);
      if (completedMatch) {
        // Extract agent name - everything before "completed", stripping emojis and whitespace
        const beforeCompleted = trimmed.split(/completed/i)[0].replace(/[^\w\u4e00-\u9fff\s]/g, "").trim();
        const agent = beforeCompleted || "Agent";
        const taskKey = `completed-${completedMatch[1]}-${agent}`;
        if (!seenTasks.has(taskKey)) {
          seenTasks.add(taskKey);
          tasks.push({
            type: "completed",
            agent: agent,
            task: completedMatch[1],
          });
        }
        continue;
      }
    }

    // Match failed tasks
    if (trimmed.includes('failed "') || trimmed.includes("failed \"")) {
      const failedMatch = trimmed.match(/failed\s*"([^"]+)"/i);
      if (failedMatch) {
        const beforeFailed = trimmed.split(/failed/i)[0].replace(/[^\w\u4e00-\u9fff\s]/g, "").trim();
        const agent = beforeFailed || "Agent";
        const taskKey = `failed-${failedMatch[1]}-${agent}`;
        if (!seenTasks.has(taskKey)) {
          seenTasks.add(taskKey);
          tasks.push({
            type: "failed",
            agent: agent,
            task: failedMatch[1],
          });
        }
        continue;
      }
    }

    // Match running tasks
    if (trimmed.includes('running "') || trimmed.includes('working on "')) {
      const runningMatch = trimmed.match(/(?:running|working on)\s*"([^"]+)"/i);
      if (runningMatch) {
        const beforeRunning = trimmed.split(/running|working on/i)[0].replace(/[^\w\u4e00-\u9fff\s]/g, "").trim();
        const agent = beforeRunning || "Agent";
        const taskKey = `running-${runningMatch[1]}-${agent}`;
        if (!seenTasks.has(taskKey)) {
          seenTasks.add(taskKey);
          tasks.push({
            type: "running",
            agent: agent,
            task: runningMatch[1],
          });
        }
        continue;
      }
    }

    // Keep other content (not task-related)
    contentLines.push(line);
  }

  return {
    tasks,
    toolUsage,
    cleanContent: contentLines.join("\n").trim(),
  };
}

// Copy button component
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
      {copied ? (
        <Check className="w-3 h-3 text-emerald-500" />
      ) : (
        <Copy className="w-3 h-3" />
      )}
    </Button>
  );
}

// Tool call status badge
function ToolStatusBadge({ status }: { status?: string }) {
  const configs: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
    completed: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-600 dark:text-emerald-400",
      icon: <CheckCircle className="w-3 h-3" />,
      label: "Done",
    },
    failed: {
      bg: "bg-red-500/10",
      text: "text-red-600 dark:text-red-400",
      icon: <XCircle className="w-3 h-3" />,
      label: "Failed",
    },
    running: {
      bg: "bg-blue-500/10",
      text: "text-blue-600 dark:text-blue-400",
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
      label: "Running",
    },
  };

  const config = configs[status || ""] || {
    bg: "bg-slate-500/10",
    text: "text-slate-500",
    icon: <Clock className="w-3 h-3" />,
    label: "Pending",
  };

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${config.bg} ${config.text}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

// Get tool icon
function getToolIcon(toolName: string) {
  if (toolName.includes("search")) return Search;
  if (toolName.includes("web") || toolName.includes("fetch")) return Globe;
  if (toolName.includes("file") || toolName.includes("read")) return FileText;
  if (toolName.includes("code") || toolName.includes("write")) return Code;
  if (toolName.includes("terminal") || toolName.includes("exec")) return Terminal;
  return Wrench;
}

// Tool Call Card
function ToolCallCard({ part }: { part: XChatPart & { type: "tool-call" } }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const ToolIcon = getToolIcon(part.toolName);

  return (
    <div className="my-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-violet-500/10 flex items-center justify-center">
            <ToolIcon className="w-3.5 h-3.5 text-violet-500" />
          </div>
          <span className="font-mono text-xs font-medium">{part.toolName}</span>
        </div>
        <div className="flex items-center gap-2">
          <ToolStatusBadge status={part.status} />
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && part.args && Object.keys(part.args).length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-200 dark:border-slate-700"
          >
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-slate-500 uppercase">Input</span>
                <CopyButton text={JSON.stringify(part.args, null, 2)} className="opacity-50 hover:opacity-100" />
              </div>
              <pre className="p-2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono overflow-x-auto max-h-40">
                {JSON.stringify(part.args, null, 2)}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Task Execution Card - Compact version
function TaskCard({ task, index }: { task: ParsedTask; index: number }) {
  const statusConfig = {
    delegated: { icon: ArrowRight, color: "text-violet-500", bg: "bg-violet-500", label: "Delegated" },
    running: { icon: Loader2, color: "text-blue-500", bg: "bg-blue-500", label: "Running", spin: true },
    completed: { icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500", label: "Completed" },
    failed: { icon: XCircle, color: "text-red-500", bg: "bg-red-500", label: "Failed" },
  };

  const config = statusConfig[task.type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-start gap-3 py-2"
    >
      {/* Timeline dot */}
      <div className="flex flex-col items-center">
        <div className={`w-6 h-6 rounded-full ${config.bg}/15 flex items-center justify-center`}>
          <Icon className={`w-3.5 h-3.5 ${config.color} ${config.spin ? "animate-spin" : ""}`} />
        </div>
        {index < 3 && <div className="w-0.5 h-full bg-slate-200 dark:bg-slate-700 mt-1" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-medium shrink-0">
            <Users className="w-3 h-3 mr-1" />
            {task.agent}
          </Badge>
          <span className={`text-[10px] font-medium ${config.color}`}>{config.label}</span>
        </div>
        <p className="text-sm text-foreground mt-0.5 line-clamp-2">{task.task}</p>
      </div>
    </motion.div>
  );
}

// Task Execution Timeline
function TaskTimeline({ tasks }: { tasks: ParsedTask[] }) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Deduplicate and get unique tasks
  const uniqueTasks = tasks.reduce((acc, task) => {
    const key = `${task.agent}-${task.task}`;
    const existing = acc.find(t => `${t.agent}-${t.task}` === key);
    if (!existing || (task.type === "completed" && existing.type !== "completed")) {
      return [...acc.filter(t => `${t.agent}-${t.task}` !== key), task];
    }
    return acc;
  }, [] as ParsedTask[]);

  if (uniqueTasks.length === 0) return null;

  const completedCount = uniqueTasks.filter(t => t.type === "completed").length;

  return (
    <div className="mb-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800/30 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <Zap className="w-4 h-4 text-violet-500" />
          </div>
          <div className="text-left">
            <span className="text-sm font-semibold text-foreground">Task Execution</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground">
                {completedCount}/{uniqueTasks.length} completed
              </span>
              {completedCount === uniqueTasks.length && (
                <CheckCircle className="w-3 h-3 text-emerald-500" />
              )}
            </div>
          </div>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-slate-400" />
        )}
      </button>

      {/* Tasks */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-200 dark:border-slate-700"
          >
            <div className="px-4 py-2">
              {uniqueTasks.map((task, idx) => (
                <TaskCard key={`${task.agent}-${task.task}-${idx}`} task={task} index={idx} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Reasoning Block
function ReasoningBlock({ text }: { text: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="my-2 rounded-lg border border-violet-200 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-950/20 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-violet-100/50 dark:hover:bg-violet-900/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-violet-500" />
          <span className="text-xs font-medium text-violet-700 dark:text-violet-300">Thinking</span>
        </div>
        {isExpanded ? (
          <EyeOff className="w-3.5 h-3.5 text-violet-400" />
        ) : (
          <Eye className="w-3.5 h-3.5 text-violet-400" />
        )}
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-violet-200 dark:border-violet-800/50"
          >
            <p className="px-3 py-2 text-xs text-violet-600 dark:text-violet-300 italic">{text}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Artifact Viewer Card
function ArtifactCard({ part }: { part: XChatPart & { type: "artifact" } }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="my-2 rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-emerald-100/50 dark:hover:bg-emerald-900/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
            <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{part.title || "Generated Content"}</span>
              {part.version && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-emerald-500/10 border-emerald-500/30 text-emerald-600">
                  v{part.version}
                </Badge>
              )}
            </div>
            {part.preview && (
              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{part.preview}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-emerald-500" />
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-emerald-200 dark:border-emerald-700/50"
          >
            <div className="p-4 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-medium text-slate-500 uppercase">Content</span>
                <CopyButton text={part.preview || ""} className="opacity-50 hover:opacity-100" />
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <Markdown>{part.preview || "No content available"}</Markdown>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Render a single message part
function MessagePart({ part, isUser }: { part: XChatPart; isUser?: boolean }) {
  switch (part.type) {
    case "text":
      if (!part.text) return null;
      return (
        <div className={isUser ? "text-primary-foreground **:text-primary-foreground" : ""}>
          <Markdown>{part.text}</Markdown>
        </div>
      );

    case "tool-call":
      return <ToolCallCard part={part} />;

    case "reasoning":
      return <ReasoningBlock text={part.text} />;

    case "artifact":
      return <ArtifactCard part={part} />;

    default:
      return null;
  }
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const displayText = getDisplayText(message);
  const hasParts = message.parts && message.parts.length > 0;

  // Parse content to extract tasks and clean text
  const { tasks, cleanContent } = parseContent(displayText);
  const hasTaskExecution = tasks.length > 0;

  // Filter parts
  const toolCallParts = message.parts?.filter((p) => p.type === "tool-call") || [];
  const otherParts = message.parts?.filter((p) => p.type !== "tool-call") || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      {/* Avatar */}
      <Avatar
        className={`w-8 h-8 shrink-0 ring-2 ring-background shadow-md ${
          isUser
            ? "bg-slate-200 dark:bg-slate-700"
            : "bg-gradient-to-br from-violet-500 to-purple-600"
        }`}
      >
        <AvatarFallback className="text-xs font-medium">
          {isUser ? (
            <User className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          ) : (
            <Bot className="w-4 h-4 text-white" />
          )}
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div className={`flex-1 ${isUser ? "text-right" : "max-w-[90%]"}`}>
        {/* Agent Name Header */}
        {!isUser && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-foreground">
              {message.agentName || "Assistant"}
            </span>
            {!!message.metadata?.delegationType && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-normal">
                {String(message.metadata.delegationType)}
              </Badge>
            )}
            <span className="text-[10px] text-muted-foreground">
              {formatTime(message.createdAt)}
            </span>
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={`inline-block ${
            isUser
              ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5 max-w-[85%]"
              : "bg-muted/30 rounded-2xl rounded-bl-md px-4 py-3 w-full"
          }`}
        >
          {/* Task Execution Timeline */}
          {hasTaskExecution && !isUser && <TaskTimeline tasks={tasks} />}

          {/* Tool Calls Section */}
          {toolCallParts.length > 0 && !isUser && (
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="w-3.5 h-3.5 text-violet-500" />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Tools Used
                </span>
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                  {toolCallParts.length}
                </Badge>
              </div>
              {toolCallParts.map((part, idx) => (
                <MessagePart key={`tool-${idx}`} part={part} isUser={isUser} />
              ))}
            </div>
          )}

          {/* Main Content */}
          {hasParts ? (
            otherParts.map((part, idx) => (
              <MessagePart key={idx} part={part} isUser={isUser} />
            ))
          ) : cleanContent ? (
            <div className={isUser ? "text-primary-foreground **:text-primary-foreground" : ""}>
              <Markdown>{cleanContent}</Markdown>
            </div>
          ) : !hasTaskExecution && !toolCallParts.length ? (
            <span className={`text-sm ${isUser ? "text-primary-foreground" : "text-muted-foreground"} italic`}>
              Generating response...
            </span>
          ) : null}
        </div>

        {/* Timestamp for user */}
        {isUser && (
          <span className="text-[10px] text-muted-foreground/70 mt-1 block">
            {formatTime(message.createdAt)}
          </span>
        )}
      </div>
    </motion.div>
  );
}
