import {
  type WorkflowDSL,
  type WorkflowNode,
  type WorkflowEdge,
  type WorkflowMeta,
  type ReactFlowGraph,
  type ReactFlowNode,
  type ReactFlowEdge,
  type IOSchema,
  type SecretRef,
  WORKFLOW_DSL_VERSION,
} from "@flowit/shared";

// ============================================
// React Flow Position Store (for round-trip)
// ============================================

export interface NodePositions {
  [nodeId: string]: { x: number; y: number };
}

// ============================================
// React Flow → DSL Conversion
// ============================================

export interface ConvertToDSLOptions {
  meta: WorkflowMeta;
  workflowInputs?: Record<string, IOSchema>;
  workflowOutputs?: Record<string, IOSchema>;
  secrets?: SecretRef[];
}

export function reactFlowToDSL(
  graph: ReactFlowGraph,
  options: ConvertToDSLOptions
): WorkflowDSL {
  const nodes: WorkflowNode[] = graph.nodes.map((rfNode) => ({
    id: rfNode.id,
    type: rfNode.data.nodeType,
    label: rfNode.data.label,
    params: rfNode.data.params,
    inputs: rfNode.data.inputs,
    outputs: rfNode.data.outputs,
  }));

  const edges: WorkflowEdge[] = graph.edges.map((rfEdge) => ({
    id: rfEdge.id,
    source: rfEdge.source,
    target: rfEdge.target,
    sourceHandle: rfEdge.sourceHandle,
    targetHandle: rfEdge.targetHandle,
  }));

  return {
    dslVersion: WORKFLOW_DSL_VERSION,
    meta: options.meta,
    inputs: options.workflowInputs ?? {},
    outputs: options.workflowOutputs ?? {},
    secrets: options.secrets ?? [],
    nodes,
    edges,
  };
}

/**
 * Extract node positions from React Flow graph for storage
 */
export function extractPositions(graph: ReactFlowGraph): NodePositions {
  const positions: NodePositions = {};
  for (const node of graph.nodes) {
    positions[node.id] = node.position;
  }
  return positions;
}

// ============================================
// DSL → React Flow Conversion
// ============================================

export interface ConvertToReactFlowOptions {
  positions?: NodePositions;
  defaultPosition?: { x: number; y: number };
  nodeTypeMapping?: Record<string, string>; // DSL type → React Flow component type
}

export function dslToReactFlow(
  dsl: WorkflowDSL,
  options: ConvertToReactFlowOptions = {}
): ReactFlowGraph {
  const {
    positions = {},
    defaultPosition = { x: 0, y: 0 },
    nodeTypeMapping = {},
  } = options;

  const nodes: ReactFlowNode[] = dsl.nodes.map((node, index) => {
    const position = positions[node.id] ?? {
      x: defaultPosition.x + index * 200,
      y: defaultPosition.y + index * 100,
    };

    return {
      id: node.id,
      type: nodeTypeMapping[node.type] ?? "default",
      position,
      data: {
        label: node.label ?? node.type,
        nodeType: node.type,
        params: node.params,
        inputs: node.inputs,
        outputs: node.outputs,
      },
    };
  });

  const edges: ReactFlowEdge[] = dsl.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
  }));

  return { nodes, edges };
}

// ============================================
// Validation
// ============================================

export interface ValidationError {
  path: string;
  message: string;
}

export function validateDSL(dsl: WorkflowDSL): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check version
  if (dsl.dslVersion !== WORKFLOW_DSL_VERSION) {
    errors.push({
      path: "dslVersion",
      message: `Unsupported DSL version: ${dsl.dslVersion}`,
    });
  }

  // Check meta
  if (!dsl.meta.name) {
    errors.push({
      path: "meta.name",
      message: "Workflow name is required",
    });
  }

  // Check for duplicate node IDs
  const nodeIds = new Set<string>();
  for (const node of dsl.nodes) {
    if (nodeIds.has(node.id)) {
      errors.push({
        path: `nodes.${node.id}`,
        message: `Duplicate node ID: ${node.id}`,
      });
    }
    nodeIds.add(node.id);
  }

  // Check edge references
  for (const edge of dsl.edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push({
        path: `edges.${edge.id}.source`,
        message: `Edge references non-existent source node: ${edge.source}`,
      });
    }
    if (!nodeIds.has(edge.target)) {
      errors.push({
        path: `edges.${edge.id}.target`,
        message: `Edge references non-existent target node: ${edge.target}`,
      });
    }
  }

  return errors;
}

// ============================================
// Utilities
// ============================================

export function createEmptyWorkflow(name: string): WorkflowDSL {
  return {
    dslVersion: WORKFLOW_DSL_VERSION,
    meta: {
      name,
      version: "1.0.0",
      createdAt: new Date().toISOString(),
    },
    inputs: {},
    outputs: {},
    secrets: [],
    nodes: [],
    edges: [],
  };
}
