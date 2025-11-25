/**
 * Workflow Types
 * Defines the structure for advanced agentic workflows
 */

import { AgentConfig } from "../config";

export type WorkflowStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

export interface WorkflowContext {
  id: string;
  workflowId: string;
  variables: Record<string, any>;
  history: any[];
  currentStepId?: string;
  status: WorkflowStatus;
  input: any;
  output?: any;
  error?: any;
}

export type StepType =
  | "start"
  | "end"
  | "agent"
  | "tool"
  | "condition"
  | "human_input"
  | "parallel"
  | "subworkflow";

export interface WorkflowStep {
  id: string;
  type: StepType;
  name: string;
  description?: string;
  next?: string | string[]; // Next step ID(s)

  // Configuration specific to step type
  config?: any;

  // Metadata for UI/Tracking
  metadata?: Record<string, any>;
}

export interface AgentStep extends WorkflowStep {
  type: "agent";
  config: {
    agentId: string;
    agentConfig?: Partial<AgentConfig>;
    prompt: string; // Template string using {{variables}}
    system?: string;
    temperature?: number;
  };
}

export interface ToolStep extends WorkflowStep {
  type: "tool";
  config: {
    toolName: string;
    arguments: Record<string, any>; // Can use {{variables}}
  };
}

export interface ConditionStep extends WorkflowStep {
  type: "condition";
  config: {
    expression: string; // e.g. "variables.score > 0.5"
    yes: string; // Step ID
    no: string; // Step ID
  };
}

export interface HumanInputStep extends WorkflowStep {
  type: "human_input";
  config: {
    prompt: string;
    timeout?: number;
    requiredFields?: { name: string; type: string; description: string }[];
  };
}

export interface ParallelStep extends WorkflowStep {
  type: "parallel";
  config: {
    branches: string[]; // Start Step IDs of parallel branches
    mode: "wait_all" | "race";
  };
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  version: string;

  steps: WorkflowStep[];

  // Initial variables/defaults
  variables?: Record<string, any>;

  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExecutionStepResult {
  stepId: string;
  status: "completed" | "failed" | "skipped";
  output?: any;
  error?: any;
  startTime: Date;
  endTime: Date;
  logs?: string[];
}
