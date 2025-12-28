import type { WorkflowDSL } from "@flowit/shared";
import type {
  Workflow as DbWorkflow,
  WorkflowVersion as DbWorkflowVersion,
} from "../db/schema";

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
// Conversion Functions from DB Entities
// ============================================

export function workflowFromDb(dbWorkflow: DbWorkflow): Workflow {
  return {
    id: dbWorkflow.id,
    name: dbWorkflow.name,
    description: dbWorkflow.description,
    createdAt: dbWorkflow.createdAt,
    updatedAt: dbWorkflow.updatedAt,
  };
}

export function workflowVersionFromDb(
  dbVersion: DbWorkflowVersion
): WorkflowVersion {
  return {
    id: dbVersion.id,
    workflowId: dbVersion.workflowId,
    version: dbVersion.version,
    dsl: dbVersion.dsl as WorkflowDSL,
    changelog: dbVersion.changelog,
    createdAt: dbVersion.createdAt,
  };
}

export function workflowWithVersionsFromDb(
  dbWorkflow: DbWorkflow,
  dbVersions: DbWorkflowVersion[]
): WorkflowWithVersions {
  const versions = dbVersions.map(workflowVersionFromDb);
  const currentVersion =
    versions.length > 0
      ? versions.reduce((latest, v) => (v.version > latest.version ? v : latest))
      : null;

  return {
    ...workflowFromDb(dbWorkflow),
    versions,
    currentVersion,
  };
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
