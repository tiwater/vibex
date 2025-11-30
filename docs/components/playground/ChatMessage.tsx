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
  Play,
  Users,
  Zap,
  Copy,
  Check,
  Eye,
  EyeOff,
  Terminal,
  Code,
  ArrowRight,
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

// Parse task execution from text content
interface ParsedTask {
  type: "delegated" | "completed" | "failed" | "running";
  agent: string;
  task: string;
  result?: string;
}

function parseTasksFromContent(content: string): {
  tasks: ParsedTask[];
  remainingContent: string;
} {
  const tasks: ParsedTask[] = [];
  const lines = content.split("\n");
  const remainingLines: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Match: 🔄 Delegated "task" to Agent (various formats)
    // Handles: "🔄 Delegated", "Delegated", "🔄Delegated"
    const delegatedMatch = trimmedLine.match(
      /^[🔄\s]*Delegated\s*"([^"]+)"\s*to\s*(.+)$/i
    );
    if (delegatedMatch) {
      tasks.push({
        type: "delegated",
        task: delegatedMatch[1],
        agent: delegatedMatch[2].trim(),
      });
      continue;
    }

    // Match: ✅ Agent completed "task" (various formats)
    // Handles: "✅ Agent completed", "✅Agent completed", "Agent completed"
    const completedMatch = trimmedLine.match(
      /^[✅✓\s]*(.+?)\s+completed\s*"([^"]+)"$/i
    );
    if (completedMatch) {
      tasks.push({
        type: "completed",
        agent: completedMatch[1].trim(),
        task: completedMatch[2],
      });
      continue;
    }

    // Match: ❌ Agent failed "task"
    const failedMatch = trimmedLine.match(
      /^[❌✗\s]*(.+?)\s+failed\s*"([^"]+)"$/i
    );
    if (failedMatch) {
      tasks.push({
        type: "failed",
        agent: failedMatch[1].trim(),
        task: failedMatch[2],
      });
      continue;
    }

    // Match: 🔄 Agent running "task" or ⏳ Agent working on "task"
    const runningMatch = trimmedLine.match(
      /^[🔄⏳\s]*(.+?)\s+(?:running|working on)\s*"([^"]+)"$/i
    );
    if (runningMatch) {
      tasks.push({
        type: "running",
        agent: runningMatch[1].trim(),
        task: runningMatch[2],
      });
      continue;
    }

    // Skip empty lines that were just task lines
    if (trimmedLine === "") {
      // Keep empty lines in remaining content for formatting
      remainingLines.push(line);
      continue;
    }

    remainingLines.push(line);
  }

  return {
    tasks,
    remainingContent: remainingLines.join("\n").trim(),
  };
}

// Tool call status badge with enhanced styling
function ToolStatusBadge({ status }: { status?: string }) {
  switch (status) {
    case "completed":
      return (
        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0 h-5 font-medium">
          <CheckCircle className="w-3 h-3 mr-1" />
          Completed
        </Badge>
      );
    case "failed":
      return (
        <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 text-[10px] px-1.5 py-0 h-5 font-medium">
          <XCircle className="w-3 h-3 mr-1" />
          Failed
        </Badge>
      );
    case "running":
      return (
        <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px] px-1.5 py-0 h-5 font-medium">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Running
        </Badge>
      );
    case "pending-approval":
      return (
        <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] px-1.5 py-0 h-5 font-medium">
          <Clock className="w-3 h-3 mr-1" />
          Awaiting
        </Badge>
      );
    default:
      return (
        <Badge className="bg-muted text-muted-foreground border-border text-[10px] px-1.5 py-0 h-5 font-medium">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
  }
}

// Copy button component
function CopyButton({ text }: { text: string }) {
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
      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
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

// Enhanced Tool Call Card
function ToolCallCard({
  part,
  isUser,
}: {
  part: XChatPart & { type: "tool-call" };
  isUser?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getToolIcon = (toolName: string) => {
    if (toolName.includes("file") || toolName.includes("read"))
      return FileText;
    if (toolName.includes("code") || toolName.includes("write")) return Code;
    if (toolName.includes("terminal") || toolName.includes("exec"))
      return Terminal;
    return Wrench;
  };

  const ToolIcon = getToolIcon(part.toolName);

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group my-2 rounded-lg border overflow-hidden ${
        isUser
          ? "bg-primary-foreground/5 border-primary-foreground/20"
          : "bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900/50 dark:to-slate-800/30 border-slate-200 dark:border-slate-700/50"
      }`}
    >
      {/* Tool Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-7 h-7 rounded-md flex items-center justify-center ${
              part.status === "completed"
                ? "bg-emerald-500/15"
                : part.status === "failed"
                  ? "bg-red-500/15"
                  : part.status === "running"
                    ? "bg-blue-500/15"
                    : "bg-violet-500/15"
            }`}
          >
            <ToolIcon
              className={`w-3.5 h-3.5 ${
                part.status === "completed"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : part.status === "failed"
                    ? "text-red-600 dark:text-red-400"
                    : part.status === "running"
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-violet-600 dark:text-violet-400"
              }`}
            />
          </div>
          <div className="flex flex-col items-start min-w-0">
            <span className="font-mono text-xs font-semibold truncate">
              {part.toolName}
            </span>
            {part.args && Object.keys(part.args).length > 0 && (
              <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                {Object.entries(part.args)
                  .slice(0, 2)
                  .map(([k, v]) => `${k}: ${String(v).slice(0, 20)}`)
                  .join(", ")}
                {Object.keys(part.args).length > 2 && "..."}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ToolStatusBadge status={part.status} />
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2 border-t border-slate-200 dark:border-slate-700/50 pt-2">
              {/* Arguments */}
              {part.args && Object.keys(part.args).length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      Arguments
                    </span>
                    <CopyButton text={JSON.stringify(part.args, null, 2)} />
                  </div>
                  <pre className="p-2 rounded-md bg-slate-100 dark:bg-slate-900 text-[10px] font-mono overflow-x-auto max-h-32 scrollbar-thin">
                    {JSON.stringify(part.args, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Agent Task Card for multi-agent execution
function AgentTaskCard({ task }: { task: ParsedTask }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusColor = () => {
    switch (task.type) {
      case "completed":
        return "border-l-emerald-500 bg-emerald-500/5";
      case "failed":
        return "border-l-red-500 bg-red-500/5";
      case "running":
        return "border-l-blue-500 bg-blue-500/5";
      case "delegated":
        return "border-l-violet-500 bg-violet-500/5";
      default:
        return "border-l-slate-400 bg-slate-500/5";
    }
  };

  const getStatusIcon = () => {
    switch (task.type) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "running":
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case "delegated":
        return <ArrowRight className="w-4 h-4 text-violet-500" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`rounded-lg border border-l-4 ${getStatusColor()} overflow-hidden`}
    >
      <button
        onClick={() => task.result && setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2.5 flex items-center gap-3 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        disabled={!task.result}
      >
        {/* Status Icon */}
        <div className="shrink-0">{getStatusIcon()}</div>

        {/* Task Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-4 font-medium bg-background"
            >
              <Users className="w-2.5 h-2.5 mr-1" />
              {task.agent}
            </Badge>
            <span className="text-[10px] text-muted-foreground capitalize">
              {task.type}
            </span>
          </div>
          <p className="text-xs font-medium truncate">{task.task}</p>
        </div>

        {/* Expand Arrow */}
        {task.result && (
          <div className="shrink-0">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        )}
      </button>

      {/* Expanded Result */}
      <AnimatePresence>
        {isExpanded && task.result && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-200 dark:border-slate-700/50"
          >
            <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900/50">
              <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap">
                {task.result}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Task Execution Timeline
function TaskExecutionTimeline({ tasks }: { tasks: ParsedTask[] }) {
  if (tasks.length === 0) return null;

  return (
    <div className="my-3 space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="w-4 h-4 text-violet-500" />
        <span className="text-xs font-semibold text-foreground">
          Task Execution
        </span>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
          {tasks.length} task{tasks.length !== 1 ? "s" : ""}
        </Badge>
      </div>
      <div className="space-y-1.5">
        {tasks.map((task, idx) => (
          <AgentTaskCard key={idx} task={task} />
        ))}
      </div>
    </div>
  );
}

// Reasoning Block
function ReasoningBlock({ text }: { text: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="my-2 rounded-lg border border-violet-200 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-950/20 overflow-hidden"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-violet-100/50 dark:hover:bg-violet-900/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-violet-500" />
          <span className="text-xs font-medium text-violet-700 dark:text-violet-300">
            Thinking...
          </span>
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
            <p className="px-3 py-2 text-[11px] text-violet-600 dark:text-violet-300 italic leading-relaxed">
              {text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Artifact Card
function ArtifactCard({
  part,
}: {
  part: XChatPart & { type: "artifact" };
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="my-2 rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20 overflow-hidden"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-emerald-100/50 dark:hover:bg-emerald-900/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-emerald-500/15 flex items-center justify-center">
            <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {part.title || "Artifact"}
              </span>
              {part.version && (
                <Badge
                  variant="outline"
                  className="text-[9px] px-1 py-0 h-4 bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                >
                  v{part.version}
                </Badge>
              )}
            </div>
            {part.preview && (
              <p className="text-[10px] text-muted-foreground line-clamp-1">
                {part.preview}
              </p>
            )}
          </div>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
    </motion.div>
  );
}

// Render a single message part
function MessagePart({ part, isUser }: { part: XChatPart; isUser?: boolean }) {
  switch (part.type) {
    case "text":
      if (!part.text) return null;
      return (
        <div
          className={
            isUser ? "text-primary-foreground **:text-primary-foreground" : ""
          }
        >
          <Markdown>{part.text}</Markdown>
        </div>
      );

    case "tool-call":
      return <ToolCallCard part={part} isUser={isUser} />;

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

  // Parse task execution from content
  const { tasks, remainingContent } = parseTasksFromContent(displayText);
  const hasTaskExecution = tasks.length > 0;

  // Filter out tool-call parts to render separately
  const toolCallParts =
    message.parts?.filter((p) => p.type === "tool-call") || [];
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
      <div className={`flex-1 ${isUser ? "text-right" : "max-w-[85%]"}`}>
        {/* Agent Name Header */}
        {!isUser && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-foreground">
              {message.agentName || "Assistant"}
            </span>
            {!!message.metadata?.delegationType && (
              <Badge
                variant="outline"
                className="text-[9px] px-1.5 py-0 h-4 font-normal"
              >
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
              : "bg-muted/50 rounded-2xl rounded-bl-md px-4 py-3 w-full"
          }`}
        >
          {/* Task Execution Timeline (for multi-agent) */}
          {hasTaskExecution && !isUser && (
            <TaskExecutionTimeline tasks={tasks} />
          )}

          {/* Tool Calls Section */}
          {toolCallParts.length > 0 && !isUser && (
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="w-3.5 h-3.5 text-violet-500" />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Tool Calls
                </span>
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
          ) : remainingContent ? (
            <div
              className={
                isUser
                  ? "text-primary-foreground **:text-primary-foreground"
                  : ""
              }
            >
              <Markdown>{remainingContent}</Markdown>
            </div>
          ) : !hasTaskExecution ? (
            <span
              className={`text-sm ${isUser ? "text-primary-foreground" : "text-muted-foreground"} italic`}
            >
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
