import { ModelMessage } from "ai";

export type { ModelMessage };

// Extend ModelMessage to include our metadata
export type XMessage = ModelMessage & {
  id?: string; // Message ID (includes agent prefix for tracking)
  metadata?: {
    agentName?: string;
    timestamp?: number;
    [key: string]: any;
  };
};

// Use XMessage as our Message type
export type Message = XMessage;
