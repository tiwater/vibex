"use client";

import { motion } from "framer-motion";
import { Bot } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex gap-3"
    >
      <Avatar className="w-8 h-8 bg-linear-to-br from-violet-500 to-purple-600">
        <AvatarFallback>
          <Bot className="w-4 h-4 shrink-0 text-white" />
        </AvatarFallback>
      </Avatar>
      <div className="bg-muted p-4 rounded-2xl rounded-bl-sm">
        <div className="flex gap-1">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
            className="w-2 h-2 bg-muted-foreground/50 rounded-full"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
            className="w-2 h-2 bg-muted-foreground/50 rounded-full"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
            className="w-2 h-2 bg-muted-foreground/50 rounded-full"
          />
        </div>
      </div>
    </motion.div>
  );
}
