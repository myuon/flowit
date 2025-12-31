import type { WorkflowDSL } from "@flowit/shared";

// ============================================
// Workflow Types
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
// Execution Types
// ============================================
export interface Execution {
  id: string;
  workflowId: string;
  versionId: string;
  status: "pending" | "running" | "success" | "error" | "cancelled";
  inputs: unknown;
  outputs: unknown;
  error: string | null;
  workerId: string | null;
  scheduledAt: string;
  retryCount: number;
  maxRetries: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface ExecutionLog {
  id: string;
  workflowId: string;
  executionId: string;
  nodeId: string;
  data: unknown;
  createdAt: string;
}

// ============================================
// User Types
// ============================================
export interface User {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
}

export interface UserToken {
  id: string;
  userId: string;
  provider: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// App Config Types
// ============================================
export interface AppConfig {
  key: string;
  value: string;
  updatedAt: string;
}
