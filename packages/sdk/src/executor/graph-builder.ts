import type { WorkflowDSL, WorkflowNode } from "@flowit/shared";
import { getNode } from "../registry";
import type { ExecutionState, WriteLogFn, OnNodeStartFn, OnNodeCompleteFn } from "./types";
import {
  resolveParams,
  resolveNodeInputs,
  buildExecutionOrder,
} from "./resolver";

/**
 * Simple workflow executor that runs nodes in topological order
 * Supports sequential execution and conditional branching
 */
export class WorkflowExecutor {
  private workflow: WorkflowDSL;
  private state: ExecutionState;
  private nodeMap: Map<string, WorkflowNode>;

  constructor(
    workflow: WorkflowDSL,
    inputs: Record<string, unknown>,
    secrets: Record<string, string>,
    executionId: string,
    workflowId?: string,
    writeLog?: WriteLogFn,
    onNodeStart?: OnNodeStartFn,
    onNodeComplete?: OnNodeCompleteFn
  ) {
    this.workflow = workflow;
    this.nodeMap = new Map(workflow.nodes.map((n) => [n.id, n]));
    this.state = {
      outputs: {},
      inputs,
      secrets,
      executionId,
      workflowId,
      logs: [],
      writeLog,
      onNodeStart,
      onNodeComplete,
    };
  }

  /**
   * Execute a single node
   */
  private async executeNode(nodeId: string): Promise<void> {
    const workflowNode = this.nodeMap.get(nodeId);
    if (!workflowNode) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    const nodeDef = getNode(workflowNode.type);
    if (!nodeDef) {
      throw new Error(`Unknown node type: ${workflowNode.type}`);
    }

    this.state.currentNode = nodeId;
    this.log(`Executing ${workflowNode.type}`);

    // Call onNodeStart callback if provided
    if (this.state.onNodeStart) {
      this.state.onNodeStart(nodeId, workflowNode.type);
    }

    // Resolve inputs from connected edges
    const inputs = resolveNodeInputs(
      workflowNode,
      this.workflow.edges,
      this.state
    );

    // Resolve parameters
    const params = resolveParams(workflowNode.params, this.state);

    // Build writeLog function for this node
    const nodeWriteLog =
      this.state.writeLog && this.state.workflowId
        ? async (data: unknown) => {
            await this.state.writeLog!(
              this.state.workflowId!,
              this.state.executionId,
              workflowNode.id,
              data
            );
          }
        : undefined;

    // Execute the node
    const result = await nodeDef.run({
      inputs,
      params,
      context: {
        nodeId: workflowNode.id,
        executionId: this.state.executionId,
        workflowId: this.state.workflowId,
        workflowInputs: this.state.inputs,
        log: (msg: string) => this.log(msg),
        writeLog: nodeWriteLog,
      },
    });

    // Store outputs
    this.state.outputs[nodeId] = result;
    this.log(`Completed`);

    // Call onNodeComplete callback if provided
    if (this.state.onNodeComplete) {
      this.state.onNodeComplete(nodeId, workflowNode.type);
    }
  }

  /**
   * Log a message
   */
  private log(message: string): void {
    const nodeId = this.state.currentNode || "executor";
    this.state.logs.push(`[${nodeId}] ${message}`);
  }

  /**
   * Get the next nodes to execute after a conditional node
   */
  private getConditionalNextNodes(nodeId: string): string[] {
    const output = this.state.outputs[nodeId];
    const conditionResult = output?.result as boolean | undefined;

    // Find edges from this node
    const outgoingEdges = this.workflow.edges.filter(
      (e) => e.source === nodeId
    );

    // For if-condition, route based on true/false handles
    if (conditionResult === true) {
      const trueEdge = outgoingEdges.find((e) => e.sourceHandle === "true");
      return trueEdge ? [trueEdge.target] : [];
    } else if (conditionResult === false) {
      const falseEdge = outgoingEdges.find((e) => e.sourceHandle === "false");
      return falseEdge ? [falseEdge.target] : [];
    }

    // Default: follow all edges
    return outgoingEdges.map((e) => e.target);
  }

  /**
   * Check if all dependencies of a node have been executed
   */
  private areDependenciesMet(nodeId: string): boolean {
    const dependencies = this.workflow.edges
      .filter((e) => e.target === nodeId)
      .map((e) => e.source);

    return dependencies.every((dep) => this.state.outputs[dep] !== undefined);
  }

  /**
   * Execute the workflow
   */
  async execute(): Promise<ExecutionState> {
    try {
      // Get execution order
      const executionOrder = buildExecutionOrder(
        this.workflow.nodes,
        this.workflow.edges
      );

      // Track which nodes have been executed
      const executed = new Set<string>();
      // Track which nodes should be skipped (due to conditional branching)
      const skipped = new Set<string>();

      // Execute nodes in order
      for (const nodeId of executionOrder) {
        // Skip if already executed or marked for skipping
        if (executed.has(nodeId) || skipped.has(nodeId)) {
          continue;
        }

        // Check if dependencies are met
        if (!this.areDependenciesMet(nodeId)) {
          // This node's dependencies weren't executed (conditional branch not taken)
          skipped.add(nodeId);
          continue;
        }

        // Execute the node
        await this.executeNode(nodeId);
        executed.add(nodeId);

        // Handle conditional nodes
        const node = this.nodeMap.get(nodeId)!;
        if (node.type === "if-condition" || node.type === "switch") {
          // Get the nodes that should be executed next
          const nextNodes = this.getConditionalNextNodes(nodeId);

          // Mark other branches as skipped
          const allOutgoing = this.workflow.edges
            .filter((e) => e.source === nodeId)
            .map((e) => e.target);

          for (const target of allOutgoing) {
            if (!nextNodes.includes(target)) {
              this.markBranchAsSkipped(target, skipped, executed);
            }
          }
        }
      }

      return this.state;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.state.error = message;
      this.log(`Error: ${message}`);
      return this.state;
    }
  }

  /**
   * Recursively mark a branch as skipped
   */
  private markBranchAsSkipped(
    nodeId: string,
    skipped: Set<string>,
    executed: Set<string>
  ): void {
    if (skipped.has(nodeId) || executed.has(nodeId)) {
      return;
    }

    skipped.add(nodeId);

    // Mark all downstream nodes as skipped too
    const downstream = this.workflow.edges
      .filter((e) => e.source === nodeId)
      .map((e) => e.target);

    for (const next of downstream) {
      this.markBranchAsSkipped(next, skipped, executed);
    }
  }
}

/**
 * Build and execute a workflow
 */
export async function executeWorkflow(
  workflow: WorkflowDSL,
  inputs: Record<string, unknown>,
  secrets: Record<string, string>,
  executionId: string,
  workflowId?: string,
  writeLog?: WriteLogFn,
  onNodeStart?: OnNodeStartFn,
  onNodeComplete?: OnNodeCompleteFn
): Promise<ExecutionState> {
  const executor = new WorkflowExecutor(
    workflow,
    inputs,
    secrets,
    executionId,
    workflowId,
    writeLog,
    onNodeStart,
    onNodeComplete
  );
  return executor.execute();
}

/**
 * Create initial state (for compatibility)
 */
export function createInitialState(
  inputs: Record<string, unknown>,
  secrets: Record<string, string>,
  executionId: string
): ExecutionState {
  return {
    outputs: {},
    inputs,
    secrets,
    executionId,
    logs: [],
  };
}
