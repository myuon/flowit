import type { WorkflowDSL } from "@flowit/shared";

// Re-export conversion functions from db
export {
  workflowFromDb,
  workflowVersionFromDb,
  workflowWithVersionsFromDb,
} from "../db/workflow";

// ============================================
// Domain Models
// ============================================

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowVersion {
  id: string;
  workflowId: string;
  version: number;
  dsl: WorkflowDSL;
  changelog: string | null;
  createdAt: string;
}

export interface WorkflowWithVersions extends Workflow {
  versions: WorkflowVersion[];
  currentVersion: WorkflowVersion | null;
}

// ============================================
// Conversion Functions from Request
// ============================================

export interface CreateWorkflowInput {
  name: string;
  description?: string;
  dsl?: WorkflowDSL;
}

export interface UpdateWorkflowInput {
  name?: string;
  description?: string;
  dsl?: WorkflowDSL;
}

export interface PublishWorkflowInput {
  dsl: WorkflowDSL;
  changelog?: string;
}

export function createWorkflowInputFromRequest(body: {
  name: string;
  description?: string;
  dsl?: WorkflowDSL;
}): CreateWorkflowInput {
  return {
    name: body.name,
    description: body.description,
    dsl: body.dsl,
  };
}

export function updateWorkflowInputFromRequest(body: {
  name?: string;
  description?: string;
  dsl?: WorkflowDSL;
}): UpdateWorkflowInput {
  return {
    name: body.name,
    description: body.description,
    dsl: body.dsl,
  };
}

export function publishWorkflowInputFromRequest(body: {
  dsl: WorkflowDSL;
  changelog?: string;
}): PublishWorkflowInput {
  return {
    dsl: body.dsl,
    changelog: body.changelog,
  };
}
