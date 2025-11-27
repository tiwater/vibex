/**
 * Execution Types (Internal)
 *
 * These types support the internal execution engine. They are NOT part of
 * the user-facing API. Users work with Mission → Plan → Task.
 *
 * The execution engine uses these types to:
 * - Track execution state
 * - Support complex execution patterns (parallel, conditional)
 * - Enable pause/resume of long-running operations
 *
 * Note: "steps" in AI SDK refers to multi-turn tool execution loops.
 * Our "ExecutionNode" is different - it's an internal graph node.
 */

import { AgentConfig } from "../config";

// Execution status (internal tracking)
export type ExecutionStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * Execution context - runtime state for an execution
 */
export interface ExecutionContext {
  id: string;
  missionId: string;
  taskId?: string;
  variables: Record<string, unknown>;
  history: unknown[];
  currentNodeId?: string;
  status: ExecutionStatus;
  input: unknown;
  output?: unknown;
  error?: unknown;
}

/**
 * Node types in the execution graph
 */
export type ExecutionNodeType =
  | "start"
  | "end"
  | "agent"
  | "tool"
  | "condition"
  | "human_input"
  | "parallel";

/**
 * Base execution node (internal)
 */
export interface ExecutionNode {
  id: string;
  type: ExecutionNodeType;
  name: string;
  description?: string;
  next?: string | string[];
  config?: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * Agent execution node
 */
export interface AgentExecutionNode extends ExecutionNode {
  type: "agent";
  config: {
    agentId: string;
    agentConfig?: Partial<AgentConfig>;
    prompt: string;
    system?: string;
    temperature?: number;
  };
}

/**
 * Tool execution node
 */
export interface ToolExecutionNode extends ExecutionNode {
  type: "tool";
  config: {
    toolName: string;
    arguments: Record<string, unknown>;
  };
}

/**
 * Condition node for branching
 */
export interface ConditionNode extends ExecutionNode {
  type: "condition";
  config: {
    expression: string;
    yes: string;
    no: string;
  };
}

/**
 * Human input node (pause for user)
 */
export interface HumanInputNode extends ExecutionNode {
  type: "human_input";
  config: {
    prompt: string;
    timeout?: number;
    requiredFields?: { name: string; type: string; description: string }[];
  };
}

/**
 * Parallel execution node
 */
export interface ParallelNode extends ExecutionNode {
  type: "parallel";
  config: {
    branches: string[];
    mode: "wait_all" | "race";
  };
}

/**
 * Execution graph (internal representation)
 */
export interface ExecutionGraph {
  id: string;
  name: string;
  description?: string;
  nodes: ExecutionNode[];
  variables?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Result of executing a single node
 */
export interface ExecutionNodeResult {
  nodeId: string;
  status: "completed" | "failed" | "skipped";
  output?: unknown;
  error?: unknown;
  startTime: Date;
  endTime: Date;
  logs?: string[];
}

// Legacy aliases for backward compatibility
// TODO: Remove these after migration
/** @deprecated Use ExecutionStatus */
export type WorkflowStatus = ExecutionStatus;
/** @deprecated Use ExecutionContext */
export type WorkflowContext = ExecutionContext;
/** @deprecated Use ExecutionNode */
export type WorkflowStep = ExecutionNode;
/** @deprecated Use ExecutionGraph */
export type Workflow = ExecutionGraph;
/** @deprecated Use ExecutionNodeResult */
export type ExecutionStepResult = ExecutionNodeResult;
