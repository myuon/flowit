// Flow types
export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface FlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

// API types
export interface ExecuteFlowRequest {
  graph: FlowGraph;
  inputs: Record<string, unknown>;
}

export interface ExecuteFlowResponse {
  outputs: Record<string, unknown>;
  executionId: string;
}
