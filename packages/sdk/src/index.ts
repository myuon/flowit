import type { FlowNode } from "@flowit/shared";

// Node definition types
export interface NodeInput {
  name: string;
  type: string;
  required?: boolean;
}

export interface NodeOutput {
  name: string;
  type: string;
}

export interface NodeDefinition {
  type: string;
  label: string;
  description?: string;
  inputs: NodeInput[];
  outputs: NodeOutput[];
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
export function createNodeData(definition: NodeDefinition): FlowNode["data"] {
  return {
    label: definition.label,
    inputs: definition.inputs,
    outputs: definition.outputs,
  };
}
