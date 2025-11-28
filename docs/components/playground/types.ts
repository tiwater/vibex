import { type ElementType } from "react";

// Re-export core types from vibex when available
export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: Date;
  agent?: string;
}

export interface Space {
  id: string;
  name: string;
  goal: string;
  createdAt: number;
  updatedAt: number;
  messageCount?: number;
  status: "active" | "completed" | "archived";
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  icon: ElementType;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  status: "pending" | "running" | "completed" | "failed";
  assignedTo?: string;
  progress?: number;
}

export interface Artifact {
  id: string;
  name: string;
  type: "document" | "code" | "data" | "image";
  size?: string;
  content?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface Tool {
  name: string;
  description: string;
  category: string;
}
