import type { ReactFlowNode, IOSchema } from "@flowit/shared";

// Re-export converter
export * from "./converter";

// Node definition types
export interface NodeDefinition {
  type: string;
  label: string;
  description?: string;
  inputs: Record<string, IOSchema>;
  outputs: Record<string, IOSchema>;
  execute: (
    inputs: Record<string, unknown>
  ) => Promise<Record<string, unknown>>;
}

// Node registry
const nodeRegistry = new Map<string, NodeDefinition>();

export function registerNode(definition: NodeDefinition): void {
  nodeRegistry.set(definition.type, definition);
}

export function getNodeDefinition(type: string): NodeDefinition | undefined {
  return nodeRegistry.get(type);
}

export function getAllNodeDefinitions(): NodeDefinition[] {
  return Array.from(nodeRegistry.values());
}

// Utility to create a node instance
export function createNodeData(
  definition: NodeDefinition
): ReactFlowNode["data"] {
  return {
    label: definition.label,
    nodeType: definition.type,
    params: {},
    inputs: definition.inputs,
    outputs: definition.outputs,
  };
}
