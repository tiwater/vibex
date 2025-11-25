/**
 * Workflow Engine
 * Runtime for executing agentic workflows
 */

import {
  Workflow,
  WorkflowContext,
} from "./types";
import { EventEmitter } from "events";
import { v4 as uuidv4 } from "uuid";

export class WorkflowEngine extends EventEmitter {
  private workflows: Map<string, Workflow> = new Map();
  private contexts: Map<string, WorkflowContext> = new Map();

  constructor() {
    super();
  }

  /**
   * Register a workflow definition
   */
  registerWorkflow(workflow: Workflow): void {
    this.workflows.set(workflow.id, workflow);
  }

  /**
   * Start a workflow instance
   */
  async startWorkflow(workflowId: string, input: any = {}): Promise<string> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) throw new Error(`Workflow ${workflowId} not found`);

    const contextId = uuidv4();
    const context: WorkflowContext = {
      id: contextId,
      workflowId,
      variables: { ...workflow.variables, ...input },
      history: [],
      status: "running",
      input,
    };

    this.contexts.set(contextId, context);

    // Find start step (assuming first step or explicitly marked)
    const startStep = workflow.steps[0]; // Simple default
    if (startStep) {
      this.executeStep(contextId, startStep.id);
    }

    return contextId;
  }

  /**
   * Execute a specific step
   */
  private async executeStep(contextId: string, stepId: string): Promise<void> {
    const context = this.contexts.get(contextId);
    if (!context) return;

    const workflow = this.workflows.get(context.workflowId);
    if (!workflow) return;

    const step = workflow.steps.find((s) => s.id === stepId);
    if (!step) return;

    context.currentStepId = stepId;
    this.emit("stepStart", { contextId, step });

    try {
      let result: any;

      switch (step.type) {
        case "agent":
          result = await this.executeAgentStep(context, step as any);
          break;
        case "human_input":
          // Pause execution and wait for input
          context.status = "paused";
          this.emit("workflowPaused", {
            contextId,
            reason: "human_input",
            step,
          });
          return; // Stop execution loop
        case "condition":
          const nextStepId = this.evaluateCondition(context, step as any);
          if (nextStepId) {
            await this.executeStep(contextId, nextStepId);
          }
          return;
        // ... other types
      }

      // Update variables with result
      if (result) {
        context.variables = { ...context.variables, ...result };
      }

      this.emit("stepComplete", { contextId, step, result });

      // Move to next step
      if (step.next) {
        const nextId = Array.isArray(step.next) ? step.next[0] : step.next;
        await this.executeStep(contextId, nextId);
      } else {
        context.status = "completed";
        context.output = context.variables; // Default output behavior
        this.emit("workflowComplete", { contextId, output: context.output });
      }
    } catch (error) {
      context.status = "failed";
      context.error = error;
      this.emit("workflowFailed", { contextId, error });
    }
  }

  /**
   * Resume a paused workflow (e.g. after human input)
   */
  async resumeWorkflow(contextId: string, input: any): Promise<void> {
    const context = this.contexts.get(contextId);
    if (!context || context.status !== "paused") {
      throw new Error(`Workflow context ${contextId} is not paused`);
    }

    // Update variables with input
    context.variables = { ...context.variables, ...input };
    context.status = "running";

    const workflow = this.workflows.get(context.workflowId);
    const step = workflow?.steps.find((s) => s.id === context.currentStepId);

    if (step && step.next) {
      const nextId = Array.isArray(step.next) ? step.next[0] : step.next;
      await this.executeStep(contextId, nextId);
    }
  }

  // Implementation details...
  private async executeAgentStep(
    context: WorkflowContext,
    step: { id: string; config: { prompt: string } }
  ): Promise<Record<string, string>> {
    // Placeholder for actual agent execution logic
    // Replace variables in prompt
    const prompt = this.replaceVariables(step.config.prompt, context.variables);
    return { [step.id]: `Executed agent with prompt: ${prompt}` };
  }

  private evaluateCondition(context: WorkflowContext, step: { config: { yes: string } }): string {
    // Secure evaluation logic needed here (maybe json-logic-js)
    // For now, simple mock - context available for future use
    void context; // Placeholder for future condition evaluation
    return step.config.yes;
  }

  private replaceVariables(
    template: string,
    variables: Record<string, any>
  ): string {
    return template.replace(
      /\{\{([^}]+)\}\}/g,
      (_, key) => variables[key.trim()] || ""
    );
  }
}
