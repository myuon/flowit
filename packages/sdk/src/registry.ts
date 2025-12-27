import type { ReactFlowNodeData, ParamValue } from "@flowit/shared";
import type { DefinedNode, NodeCategory } from "./defineNode";

// ============================================
// Node Registry
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDefinedNode = DefinedNode<any, any, any>;

const nodeRegistry = new Map<string, AnyDefinedNode>();

export function registerNode(node: AnyDefinedNode): void {
  if (nodeRegistry.has(node.id)) {
    console.warn(`Node "${node.id}" is already registered. Overwriting.`);
  }
  nodeRegistry.set(node.id, node);
}

export function getNode(id: string): AnyDefinedNode | undefined {
  return nodeRegistry.get(id);
}

export function getAllNodes(): AnyDefinedNode[] {
  return Array.from(nodeRegistry.values());
}

export function getNodesByCategory(category: NodeCategory): AnyDefinedNode[] {
  return getAllNodes().filter((node) => node.display.category === category);
}

export function getNodesByTag(tag: string): AnyDefinedNode[] {
  return getAllNodes().filter((node) => node.display.tags?.includes(tag));
}

export function hasNode(id: string): boolean {
  return nodeRegistry.has(id);
}

export function unregisterNode(id: string): boolean {
  return nodeRegistry.delete(id);
}

export function clearRegistry(): void {
  nodeRegistry.clear();
}

// ============================================
// Utility Functions
// ============================================

/**
 * Create React Flow node data from a defined node
 */
export function createNodeData(
  node: AnyDefinedNode,
  params?: Record<string, ParamValue>
): ReactFlowNodeData {
  return {
    label: node.displayName,
    nodeType: node.id,
    params: params ?? node.getDefaultParams(),
    inputs: node.inputs,
    outputs: node.outputs,
  };
}

/**
 * Get a catalog of all registered nodes for UI display
 */
export interface NodeCatalogItem {
  id: string;
  displayName: string;
  description?: string;
  category: NodeCategory;
  icon?: string;
  color?: string;
  tags?: string[];
  inputCount: number;
  outputCount: number;
}

export function getNodeCatalog(): NodeCatalogItem[] {
  return getAllNodes().map((node) => ({
    id: node.id,
    displayName: node.displayName,
    description: node.description,
    category: node.display.category,
    icon: node.display.icon,
    color: node.display.color,
    tags: node.display.tags,
    inputCount: Object.keys(node.inputs).length,
    outputCount: Object.keys(node.outputs).length,
  }));
}

/**
 * Get grouped catalog by category
 */
export function getGroupedCatalog(): Record<NodeCategory, NodeCatalogItem[]> {
  const catalog = getNodeCatalog();
  const grouped: Record<NodeCategory, NodeCatalogItem[]> = {
    input: [],
    output: [],
    ai: [],
    transform: [],
    control: [],
    integration: [],
    utility: [],
  };

  for (const item of catalog) {
    grouped[item.category].push(item);
  }

  return grouped;
}
