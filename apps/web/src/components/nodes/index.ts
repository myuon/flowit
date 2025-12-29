import {
  WorkflowNode,
  type WorkflowNodeData,
  type WorkflowNodeType,
} from "./WorkflowNode";

export const nodeTypes = {
  workflow: WorkflowNode,
};

export type { WorkflowNodeData, WorkflowNodeType };
export { WorkflowNode };
