import type { WorkflowDSL } from "@flowit/shared";

// Re-export types and conversion functions from @flowit/db
export type { Workflow, WorkflowVersion, WorkflowWithVersions } from "@flowit/db";
export {
  workflowFromDb,
  workflowVersionFromDb,
  workflowWithVersionsFromDb,
} from "@flowit/db";

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
