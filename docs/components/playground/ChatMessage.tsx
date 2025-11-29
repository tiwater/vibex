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
  const baseClass = "text-[9px] px-1 py-0 h-4 shrink-0";
  switch (status) {
    case "completed":
      return (
        <Badge
          variant="secondary"
          className={`${baseClass} bg-green-500/10 text-green-600 border-green-500/20`}
        >
          <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
          Done
        </Badge>
      );
    case "failed":
      return (
        <Badge
          variant="secondary"
          className={`${baseClass} bg-red-500/10 text-red-600 border-red-500/20`}
        >
          <XCircle className="w-2.5 h-2.5 mr-0.5" />
          Fail
        </Badge>
      );
    case "running":
      return (
        <Badge
          variant="secondary"
          className={`${baseClass} bg-blue-500/10 text-blue-600 border-blue-500/20`}
        >
          <Loader2 className="w-2.5 h-2.5 mr-0.5 animate-spin" />
          Run
        </Badge>
      );
    case "pending-approval":
      return (
        <Badge
          variant="secondary"
          className={`${baseClass} bg-amber-500/10 text-amber-600 border-amber-500/20`}
        >
          <Clock className="w-2.5 h-2.5 mr-0.5" />
          Wait
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className={baseClass}>
          <Clock className="w-2.5 h-2.5 mr-0.5" />
          ...
        </Badge>
      );
  }
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
      return (
        <div
          className={`my-1 px-2 py-1.5 rounded-md border text-xs ${
            isUser
              ? "bg-primary-foreground/10 border-primary-foreground/20"
              : "bg-muted/30 border-border/50"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Wrench
                className={`w-3 h-3 shrink-0 ${isUser ? "text-primary-foreground" : "text-violet-500"}`}
              />
              <span
                className={`font-medium truncate ${isUser ? "text-primary-foreground" : ""}`}
              >
                {part.toolName}
              </span>
            </div>
            <ToolStatusBadge status={part.status} />
          </div>
          {part.args && Object.keys(part.args).length > 0 && (
            <details className="text-[10px] mt-1">
              <summary
                className={`cursor-pointer ${isUser ? "text-primary-foreground/80 hover:text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                args
              </summary>
              <pre
                className={`mt-1 p-1.5 rounded text-[10px] overflow-x-auto max-h-20 ${
                  isUser
                    ? "bg-primary-foreground/5 text-primary-foreground"
                    : "bg-background"
                }`}
              >
                {JSON.stringify(part.args, null, 2)}
              </pre>
            </details>
          )}
        </div>
      );

    case "reasoning":
      return (
        <div className="my-1 px-2 py-1.5 bg-violet-500/5 rounded-md border border-violet-500/20">
          <div className="flex items-center gap-1.5">
            <Brain className="w-3 h-3 shrink-0 text-violet-500" />
            <span className="text-[10px] font-medium text-violet-600 dark:text-violet-400">
              Reasoning
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground italic mt-0.5 leading-tight">
            {part.text}
          </p>
        </div>
      );

    case "artifact":
      return (
        <div className="my-1 px-2 py-1.5 bg-emerald-500/5 rounded-md border border-emerald-500/20">
          <div className="flex items-center gap-1.5">
            <FileText className="w-3 h-3 shrink-0 text-emerald-500" />
            <span className="font-medium text-xs truncate">
              {part.title || "Artifact"}
            </span>
            {part.version && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5">
                v{part.version}
              </Badge>
            )}
          </div>
          {part.preview && (
            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`flex gap-2 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <Avatar
        className={`w-6 h-6 shrink-0 ${
          isUser ? "bg-muted" : "bg-linear-to-br from-violet-500 to-purple-600"
        }`}
      >
        <AvatarFallback>
          {isUser ? (
            <User className="w-3 h-3 shrink-0" />
          ) : (
            <Bot className="w-3 h-3 shrink-0 text-white" />
          )}
        </AvatarFallback>
      </Avatar>
      <div className={`flex-1 max-w-[85%] ${isUser ? "text-right" : ""}`}>
        {!isUser && (
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[11px] text-muted-foreground">
              {message.agentName || "X"}
            </span>
            {!!message.metadata?.delegationType && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                {String(message.metadata.delegationType)}
              </Badge>
            )}
          </div>
        )}
        <div
          className={`inline-block px-3 py-2 rounded-xl ${
            isUser
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-muted rounded-bl-sm"
          }`}
        >
          {/* Render parts if available, otherwise render content */}
          {hasParts ? (
            message.parts!.map((part, idx) => (
              <MessagePart key={idx} part={part} isUser={isUser} />
            ))
          ) : displayText ? (
            <div
              className={
                isUser
                  ? "text-primary-foreground **:text-primary-foreground"
                  : ""
              }
            >
              <Markdown>{displayText}</Markdown>
            </div>
          ) : (
            <span
              className={`text-sm ${isUser ? "text-primary-foreground" : "text-muted-foreground"} italic`}
            >
              Generating response...
            </span>
          )}
        </div>
        <span className="text-[9px] text-muted-foreground/70 mt-0.5 block">
          {formatTime(message.createdAt)}
        </span>
      </div>
    </motion.div>
  );
}
