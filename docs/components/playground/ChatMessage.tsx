"use client";

import React from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  // Try to get text from parts first
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
  // Fallback to content
  return message.content || "";
}

// Tool call status badge
function ToolStatusBadge({ status }: { status?: string }) {
  switch (status) {
    case "completed":
      return (
        <Badge
          variant="secondary"
          className="text-xs bg-green-500/10 text-green-600 border-green-500/20"
        >
          <CheckCircle className="w-3 h-3 mr-1" />
          Completed
        </Badge>
      );
    case "failed":
      return (
        <Badge
          variant="secondary"
          className="text-xs bg-red-500/10 text-red-600 border-red-500/20"
        >
          <XCircle className="w-3 h-3 mr-1" />
          Failed
        </Badge>
      );
    case "running":
      return (
        <Badge
          variant="secondary"
          className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20"
        >
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Running
        </Badge>
      );
    case "pending-approval":
      return (
        <Badge
          variant="secondary"
          className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20"
        >
          <Clock className="w-3 h-3 mr-1" />
          Awaiting Approval
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="text-xs">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
  }
}

// Render a single message part
function MessagePart({ part }: { part: XChatPart }) {
  switch (part.type) {
    case "text":
      if (!part.text) return null;
      return <Markdown>{part.text}</Markdown>;

    case "tool-call":
      return (
        <div className="my-2 p-3 bg-muted/50 rounded-lg border border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 shrink-0 text-violet-500" />
              <span className="font-medium text-sm">{part.toolName}</span>
            </div>
            <ToolStatusBadge status={part.status} />
          </div>
          {part.args && Object.keys(part.args).length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                View arguments
              </summary>
              <pre className="mt-2 p-2 bg-background rounded text-xs overflow-x-auto">
                {JSON.stringify(part.args, null, 2)}
              </pre>
            </details>
          )}
        </div>
      );

    case "reasoning":
      return (
        <div className="my-2 p-3 bg-violet-500/5 rounded-lg border border-violet-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4 shrink-0 text-violet-500" />
            <span className="text-xs font-medium text-violet-600 dark:text-violet-400">
              Agent Reasoning
            </span>
          </div>
          <p className="text-xs text-muted-foreground italic">{part.text}</p>
        </div>
      );

    case "artifact":
      return (
        <div className="my-2 p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 shrink-0 text-emerald-500" />
            <span className="font-medium text-sm">
              {part.title || "Artifact"}
            </span>
            {part.version && (
              <Badge variant="outline" className="text-xs">
                v{part.version}
              </Badge>
            )}
          </div>
          {part.preview && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {part.preview}
            </p>
          )}
        </div>
      );

    default:
      return null;
  }
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const displayText = getDisplayText(message);
  const hasParts = message.parts && message.parts.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <Avatar
        className={`w-8 h-8 shrink-0 ${
          isUser ? "bg-muted" : "bg-linear-to-br from-violet-500 to-purple-600"
        }`}
      >
        <AvatarFallback>
          {isUser ? (
            <User className="w-4 h-4 shrink-0" />
          ) : (
            <Bot className="w-4 h-4 shrink-0 text-white" />
          )}
        </AvatarFallback>
      </Avatar>
      <div className={`flex-1 max-w-[80%] ${isUser ? "text-right" : ""}`}>
        {!isUser && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-muted-foreground">
              {message.agentName || "X"}
            </span>
            {!!message.metadata?.delegationType && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {String(message.metadata.delegationType)}
              </Badge>
            )}
          </div>
        )}
        <div
          className={`inline-block p-4 rounded-2xl ${
            isUser
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-muted rounded-bl-sm"
          }`}
        >
          {/* Render parts if available, otherwise render content */}
          {hasParts ? (
            message.parts!.map((part, idx) => (
              <MessagePart key={idx} part={part} />
            ))
          ) : displayText ? (
            <Markdown>{displayText}</Markdown>
          ) : (
            <span className="text-sm text-muted-foreground italic">
              Generating response...
            </span>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground mt-1 block">
          {formatTime(message.createdAt)}
        </span>
      </div>
    </motion.div>
  );
}
