/**
 * Execution Engine (Internal)
 *
 * Runtime for executing complex agentic workflows.
 * This is an internal component - users work with Mission → Plan → Task.
 *
 * The engine handles:
 * - Execution graph traversal
 * - Parallel execution
 * - Conditional branching
 * - Human-in-the-loop pausing
 */

import {
  ExecutionGraph,
  ExecutionContext,
  ExecutionNode,
  ExecutionStatus,
  AgentExecutionNode,
  ToolExecutionNode,
  ConditionNode,
  // Legacy aliases for backward compatibility
  Workflow,
} from "./types";
import { EventEmitter } from "events";
import { v4 as uuidv4 } from "uuid";
import { Agent } from "../runtime/agent";
import type { AgentConfig } from "../config";
import { buildToolMap } from "../runtime/tool";
import type { XMessage } from "../space/message";
import jsonLogic from "json-logic-js";

export class WorkflowEngine extends EventEmitter {
  private graphs: Map<string, ExecutionGraph> = new Map();
  private contexts: Map<string, ExecutionContext> = new Map();

  constructor() {
    super();
  }

  /**
   * Register an execution graph (workflow definition)
   */
  registerWorkflow(graph: ExecutionGraph | Workflow): void {
    // Handle legacy Workflow type with 'steps' instead of 'nodes'
    const normalizedGraph = this.normalizeGraph(graph);
    this.graphs.set(normalizedGraph.id, normalizedGraph);
  }

  /**
   * Normalize legacy Workflow to ExecutionGraph
   */
  private normalizeGraph(input: ExecutionGraph | Workflow): ExecutionGraph {
    if ("nodes" in input && input.nodes) {
      return input as ExecutionGraph;
    }
    // Legacy format with 'steps'
    const legacy = input as unknown as { steps?: ExecutionNode[] };
    return {
      ...input,
      nodes: legacy.steps || [],
    } as ExecutionGraph;
  }

  /**
   * Start workflow execution
   */
  async startWorkflow(
    graphId: string,
    input: Record<string, unknown> = {}
  ): Promise<string> {
    const graph = this.graphs.get(graphId);
    if (!graph) throw new Error(`Execution graph ${graphId} not found`);

    const contextId = uuidv4();
    const context: ExecutionContext = {
      id: contextId,
      missionId: graphId, // Link to mission if applicable
      variables: { ...graph.variables, ...input },
      history: [],
      status: "running",
      input,
    };

    this.contexts.set(contextId, context);

    // Find start node (first node or explicitly marked)
    const startNode = graph.nodes[0];
    if (startNode) {
      await this.executeNode(contextId, startNode.id);
    }

    return contextId;
  }

  /**
   * Execute a specific node in the graph
   */
  private async executeNode(contextId: string, nodeId: string): Promise<void> {
    const context = this.contexts.get(contextId);
    if (!context) return;

    const graph = this.graphs.get(context.missionId);
    if (!graph) return;

    const node = graph.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    context.currentNodeId = nodeId;
    this.emit("nodeStart", { contextId, node });

    try {
      let result: unknown;

      switch (node.type) {
        case "agent":
          result = await this.executeAgentNode(context, node);
          break;
        case "tool":
          result = await this.executeToolNode(context, node);
          break;
        case "human_input":
          // Pause execution and wait for input
          context.status = "paused";
          this.emit("executionPaused", {
            contextId,
            reason: "human_input",
            node,
          });
          return; // Stop execution loop
        case "condition":
          const nextNodeId = this.evaluateCondition(context, node);
          if (nextNodeId) {
            await this.executeNode(contextId, nextNodeId);
          }
          return;
        case "parallel":
          await this.executeParallelNode(context, node);
          return;
        case "start":
        case "end":
          // Control nodes - just proceed
          break;
      }

      // Update variables with result
      if (result && typeof result === "object") {
        context.variables = {
          ...context.variables,
          ...(result as Record<string, unknown>),
        };
      }

      context.history.push({
        nodeId,
        result,
        timestamp: new Date().toISOString(),
      });

      this.emit("nodeComplete", { contextId, node, result });

      // Move to next node
      if (node.next) {
        const nextId = Array.isArray(node.next) ? node.next[0] : node.next;
        await this.executeNode(contextId, nextId);
      } else {
        context.status = "completed";
        context.output = context.variables;
        this.emit("executionComplete", { contextId, output: context.output });
      }
    } catch (error) {
      context.status = "failed";
      context.error = error;
      this.emit("executionFailed", { contextId, error });
    }
  }

  /**
   * Resume a paused execution (e.g. after human input)
   */
  async resumeWorkflow(
    contextId: string,
    input: Record<string, unknown>
  ): Promise<void> {
    const context = this.contexts.get(contextId);
    if (!context || context.status !== "paused") {
      throw new Error(`Execution context ${contextId} is not paused`);
    }

    // Update variables with input
    context.variables = { ...context.variables, ...input };
    context.status = "running";

    const graph = this.graphs.get(context.missionId);
    const node = graph?.nodes.find((n) => n.id === context.currentNodeId);

    if (node && node.next) {
      const nextId = Array.isArray(node.next) ? node.next[0] : node.next;
      await this.executeNode(contextId, nextId);
    }
  }

  /**
   * Get current execution status
   */
  getStatus(contextId: string): ExecutionStatus | undefined {
    return this.contexts.get(contextId)?.status;
  }

  /**
   * Get execution context
   */
  getContext(contextId: string): ExecutionContext | undefined {
    return this.contexts.get(contextId);
  }

  /**
   * Cancel an execution
   */
  cancelExecution(contextId: string): void {
    const context = this.contexts.get(contextId);
    if (context && context.status === "running") {
      context.status = "cancelled";
      this.emit("executionCancelled", { contextId });
    }
  }

  // Node execution implementations
  private async executeAgentNode(
    context: ExecutionContext,
    node: ExecutionNode
  ): Promise<Record<string, unknown>> {
    const agentNode = node as AgentExecutionNode;
    const config = agentNode.config;

    if (!config?.agentConfig) {
      throw new Error(
        `[WorkflowEngine] Agent node ${node.id} is missing agentConfig`
      );
    }

    const agentConfig: AgentConfig = {
      id: config.agentConfig.id || config.agentId || node.id,
      name: config.agentConfig.name || config.agentId || node.name,
      description:
        config.agentConfig.description ||
        node.description ||
        `Workflow agent ${config.agentId}`,
      ...config.agentConfig,
    };

    // Ensure required LLM configuration is present
    if (!agentConfig.llm && (!agentConfig.provider || !agentConfig.model)) {
      throw new Error(
        `[WorkflowEngine] Agent node ${node.id} missing provider/model configuration`
      );
    }

    const agent = new Agent(agentConfig);
    const prompt = config.prompt
      ? this.replaceVariables(config.prompt, context.variables)
      : "";

    const messages: XMessage[] = [
      {
        role: "user",
        content: prompt,
      },
    ];

    const response = await agent.generateText({
      messages,
      system: config.system,
      spaceId: this.getSpaceIdFromContext(context),
      metadata: {
        workflowContextId: context.id,
        nodeId: node.id,
      },
      temperature: config.temperature,
    });

    return {
      [`${config.agentId || node.id}_output`]: response.text,
      [`${config.agentId || node.id}_toolCalls`]: response.toolCalls,
      [`${config.agentId || node.id}_metadata`]: response.metadata,
    };
  }

  private async executeToolNode(
    context: ExecutionContext,
    node: ExecutionNode
  ): Promise<Record<string, unknown>> {
    const toolNode = node as ToolExecutionNode;
    const config = toolNode.config;

    if (!config?.toolName) {
      throw new Error(
        `[WorkflowEngine] Tool node ${node.id} missing toolName configuration`
      );
    }

    const toolMap = await buildToolMap([config.toolName]);
    const tool = toolMap[config.toolName];

    if (!tool) {
      throw new Error(
        `[WorkflowEngine] Tool ${config.toolName} not found in registry`
      );
    }

    const resolvedArgs = this.resolveArguments(
      config.arguments || {},
      context.variables
    );

    const result = await tool.execute(resolvedArgs, {
      workflowContextId: context.id,
      nodeId: node.id,
    });

    return {
      [`${config.toolName}_result`]: result,
    };
  }

  private async executeParallelNode(
    context: ExecutionContext,
    node: ExecutionNode
  ): Promise<void> {
    const config = node.config as
      | { branches?: string[]; mode?: "wait_all" | "race" }
      | undefined;
    const branches = config?.branches || [];
    const mode = config?.mode || "wait_all";

    if (mode === "wait_all") {
      await Promise.all(
        branches.map((branchId) => this.executeNode(context.id, branchId))
      );
    } else {
      await Promise.race(
        branches.map((branchId) => this.executeNode(context.id, branchId))
      );
    }
  }

  private evaluateCondition(
    context: ExecutionContext,
    node: ExecutionNode
  ): string {
    const conditionNode = node as ConditionNode;
    const config = conditionNode.config;
    if (!config?.expression) {
      return config?.yes || "";
    }

    try {
      const replaced = this.replaceVariables(
        config.expression,
        context.variables
      );
      const expression = JSON.parse(replaced);
      const result = jsonLogic.apply(expression, context.variables);
      return result ? config.yes : config.no;
    } catch (error) {
      console.warn(
        `[WorkflowEngine] Failed to evaluate condition for node ${node.id}:`,
        error
      );
      return config.no || "";
    }
  }

  private replaceVariables(
    template: string,
    variables: Record<string, unknown>
  ): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
      const value = variables[key.trim()];
      return value !== undefined ? String(value) : "";
    });
  }

  private resolveArguments(
    value: unknown,
    variables: Record<string, unknown>
  ): unknown {
    if (typeof value === "string") {
      return this.replaceVariables(value, variables);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.resolveArguments(item, variables));
    }

    if (value && typeof value === "object") {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(
        value as Record<string, unknown>
      )) {
        result[key] = this.resolveArguments(val, variables);
      }
      return result;
    }

    return value;
  }

  private getSpaceIdFromContext(context: ExecutionContext): string | undefined {
    const spaceId = context.variables?.spaceId;
    return typeof spaceId === "string" ? spaceId : undefined;
  }

  // Legacy aliases for backward compatibility
  /** @deprecated Use registerWorkflow */
  registerGraph(graph: ExecutionGraph): void {
    this.registerWorkflow(graph);
  }

  /** @deprecated Use startWorkflow */
  async startGraph(
    graphId: string,
    input: Record<string, unknown> = {}
  ): Promise<string> {
    return this.startWorkflow(graphId, input);
  }
}

// Legacy export for backward compatibility
export { WorkflowEngine as ExecutionEngine };
