"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bot, User, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import ReactMarkdown from "react-markdown";
import type { Message } from "./types";
import { formatTime } from "./utils";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
    >
      <Avatar
        className={`w-8 h-8 shrink-0 ${
          message.role === "user"
            ? "bg-slate-200 dark:bg-slate-700"
            : "bg-gradient-to-br from-violet-500 to-purple-600"
        }`}
      >
        <AvatarFallback>
          {message.role === "user" ? (
            <User className="w-4 h-4 shrink-0" />
          ) : (
            <Bot className="w-4 h-4 shrink-0 text-white" />
          )}
        </AvatarFallback>
      </Avatar>
      <div
        className={`flex-1 max-w-[80%] ${message.role === "user" ? "text-right" : ""}`}
      >
        {message.agent && message.role === "assistant" && (
          <span className="text-xs text-muted-foreground mb-1 block">
            {message.agent}
          </span>
        )}
        <div
          className={`inline-block p-4 rounded-2xl ${
            message.role === "user"
              ? "bg-violet-600 text-white rounded-br-sm"
              : "bg-slate-100 dark:bg-slate-800 rounded-bl-sm"
          }`}
        >
          <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                pre: ({ children }) => (
                  <div className="relative my-2">
                    <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg text-xs overflow-x-auto">
                      {children}
                    </pre>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={() => {
                        const code = (children as React.ReactElement)?.props?.children;
                        if (typeof code === "string") handleCopy(code);
                      }}
                    >
                      {copied ? (
                        <Check className="w-3 h-3 shrink-0" />
                      ) : (
                        <Copy className="w-3 h-3 shrink-0" />
                      )}
                    </Button>
                  </div>
                ),
                code: ({ className, children, ...props }) => {
                  const isInline = !className;
                  if (isInline) {
                    return (
                      <code className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-xs" {...props}>
                        {children}
                      </code>
                    );
                  }
                  return <code {...props}>{children}</code>;
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground mt-1 block">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </motion.div>
  );
}

