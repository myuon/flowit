import type { WorkflowNode, WorkflowEdge, ParamValue } from "@flowit/shared";
import type { ExecutionState, ResolvedParams } from "./types";

/**
 * Resolve parameter values from static, secret, or input references
 */
export function resolveParams(
  params: Record<string, ParamValue>,
  state: ExecutionState
): ResolvedParams {
  const resolved: ResolvedParams = {};

  for (const [key, param] of Object.entries(params)) {
    resolved[key] = resolveParamValue(param, state);
  }

  return resolved;
}

/**
 * Resolve a single parameter value
 */
export function resolveParamValue(
  param: ParamValue,
  state: ExecutionState
): unknown {
  switch (param.type) {
    case "static":
      return param.value;

    case "secret": {
      const value = state.secrets[param.ref];
      if (value === undefined) {
        throw new Error(`Secret not found: ${param.ref}`);
      }
      return value;
    }

    case "input": {
      // Support dot notation for nested access: "user.name"
      return getNestedValue(state.inputs, param.path);
    }

    default:
      throw new Error(`Unknown param type: ${(param as ParamValue).type}`);
  }
}

/**
 * Get nested value from an object using dot notation
 */
function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current == null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Resolve inputs for a node from connected edges
 */
export function resolveNodeInputs(
  node: WorkflowNode,
  edges: WorkflowEdge[],
  state: ExecutionState
): Record<string, unknown> {
  const inputs: Record<string, unknown> = {};

  // Find all edges targeting this node
  const incomingEdges = edges.filter((edge) => edge.target === node.id);

  for (const edge of incomingEdges) {
    const sourceOutputs = state.outputs[edge.source];
    if (sourceOutputs) {
      const value = sourceOutputs[edge.sourceHandle];
      inputs[edge.targetHandle] = value;
    }
  }

  return inputs;
}

/**
 * Build execution order from DSL (topological sort)
 */
export function buildExecutionOrder(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): string[] {
  // Build adjacency list and in-degree count
  const inDegree: Record<string, number> = {};
  const adjacency: Record<string, string[]> = {};

  for (const node of nodes) {
    inDegree[node.id] = 0;
    adjacency[node.id] = [];
  }

  for (const edge of edges) {
    adjacency[edge.source].push(edge.target);
    inDegree[edge.target]++;
  }

  // Kahn's algorithm for topological sort
  const queue: string[] = [];
  const order: string[] = [];

  // Start with nodes that have no incoming edges
  for (const node of nodes) {
    if (inDegree[node.id] === 0) {
      queue.push(node.id);
    }
  }

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    order.push(nodeId);

    for (const neighbor of adjacency[nodeId]) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) {
        queue.push(neighbor);
      }
    }
  }

  // Check for cycles
  if (order.length !== nodes.length) {
    throw new Error("Workflow contains cycles");
  }

  return order;
}

/**
 * Find nodes that depend on a given node
 */
export function findDependentNodes(
  nodeId: string,
  edges: WorkflowEdge[]
): string[] {
  return edges
    .filter((edge) => edge.source === nodeId)
    .map((edge) => edge.target);
}

/**
 * Find nodes that a given node depends on
 */
export function findDependencies(
  nodeId: string,
  edges: WorkflowEdge[]
): string[] {
  return edges
    .filter((edge) => edge.target === nodeId)
    .map((edge) => edge.source);
}
