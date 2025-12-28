import { hc } from "hono/client";
import type { AppType } from "@flowit/api";
import type {
  WorkflowDSL,
  ExecuteWorkflowRequest,
  ExecuteWorkflowResponse,
  AuthUser,
  AuthSession,
  AppSettings,
  WorkflowMeta,
} from "@flowit/shared";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const AUTH_STORAGE_KEY = "flowit-auth";

/**
 * Get current access token from session storage
 */
function getAccessToken(): string | null {
  try {
    const stored = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return null;

    const session = JSON.parse(stored) as AuthSession;

    // Check if expired
    if (session.expiresAt < Date.now()) {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    // Use idToken for API calls (it's a JWT that can be verified)
    // Google's access_token is opaque and cannot be verified with JWKS
    return session.idToken;
  } catch {
    return null;
  }
}

/**
 * Custom fetch that adds auth headers
 */
const authFetch: typeof fetch = (input, init) => {
  const token = getAccessToken();
  const headers = new Headers(init?.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, { ...init, headers });
};

// Create hono client with auth
const client = hc<AppType>(API_BASE_URL, { fetch: authFetch });

// ============================================
// Response Types (re-export for consumers)
// ============================================

export interface ValidateResponse {
  valid: boolean;
  errors: string[];
}

export interface WorkflowListItem {
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
  dsl: WorkflowDSL & { meta?: WorkflowMeta };
  changelog: string | null;
  createdAt: string;
}

export interface WorkflowWithVersions extends WorkflowListItem {
  versions: WorkflowVersion[];
  currentVersion: WorkflowVersion | null;
}

export interface ExecutionLogItem {
  id: string;
  workflowId: string;
  executionId: string;
  nodeId: string;
  data: unknown;
  createdAt: string;
}

export interface ValidateGasDeploymentResponse {
  valid: boolean;
  error?: string;
  scriptId?: string;
  scriptName?: string;
}

// ============================================
// API Functions
// ============================================

export async function validateWorkflow(
  workflow: WorkflowDSL
): Promise<ValidateResponse> {
  const res = await client.api.validate.$post({ json: { workflow } });

  if (res.status === 401) {
    throw new Error("Authentication required");
  }

  if (!res.ok) {
    throw new Error(`Validation failed: ${res.statusText}`);
  }

  return res.json();
}

export async function executeWorkflow(
  request: ExecuteWorkflowRequest
): Promise<ExecuteWorkflowResponse> {
  const res = await client.api.execute.$post({ json: request });

  const data = await res.json();

  if (!res.ok && !("error" in data)) {
    throw new Error(`Execution failed: ${res.statusText}`);
  }

  return data;
}

export async function healthCheck(): Promise<{ status: string }> {
  const res = await client.health.$get();
  return res.json();
}

/**
 * Get current authenticated user from API
 */
export async function getCurrentUser(): Promise<{ user: AuthUser; isAdmin: boolean }> {
  const res = await client.auth.me.$get();

  if (res.status === 401) {
    throw new Error("Not authenticated");
  }

  if (!res.ok) {
    throw new Error(`Failed to get user: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Get app settings (public endpoint)
 */
export async function getAppSettings(): Promise<AppSettings> {
  const res = await client.config.settings.$get();

  if (!res.ok) {
    throw new Error(`Failed to get settings: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Update app settings (admin only)
 */
export async function updateAppSettings(
  settings: Partial<AppSettings>
): Promise<AppSettings> {
  const res = await client.admin.settings.$put({ json: settings });

  if (res.status === 401) {
    throw new Error("Authentication required");
  }

  if (res.status === 403) {
    throw new Error("Admin access required");
  }

  if (!res.ok) {
    throw new Error(`Failed to update settings: ${res.statusText}`);
  }

  return res.json();
}

// ============================================
// Workflow API
// ============================================

/**
 * List all workflows
 */
export async function listWorkflows(): Promise<{ workflows: WorkflowListItem[] }> {
  const res = await client.api.workflows.$get();

  if (res.status === 401) {
    throw new Error("Authentication required");
  }

  if (!res.ok) {
    throw new Error(`Failed to list workflows: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Get a single workflow with its versions
 */
export async function getWorkflow(id: string): Promise<{ workflow: WorkflowWithVersions }> {
  const res = await client.api.workflows[":id"].$get({ param: { id } });

  if (res.status === 401) {
    throw new Error("Authentication required");
  }

  if (res.status === 404) {
    throw new Error("Workflow not found");
  }

  if (!res.ok) {
    throw new Error(`Failed to get workflow: ${res.statusText}`);
  }

  return res.json() as Promise<{ workflow: WorkflowWithVersions }>;
}

/**
 * Create a new workflow
 */
export async function createWorkflow(data: {
  name: string;
  description?: string;
  dsl?: WorkflowDSL;
}): Promise<{ workflow: WorkflowListItem }> {
  const res = await client.api.workflows.$post({ json: data });

  if (!res.ok) {
    throw new Error(`Failed to create workflow: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Update a workflow
 */
export async function updateWorkflow(
  id: string,
  data: { name?: string; description?: string; dsl?: WorkflowDSL }
): Promise<{ workflow: WorkflowListItem }> {
  const res = await client.api.workflows[":id"].$put({ param: { id }, json: data });

  if (res.status === 404) {
    throw new Error("Workflow not found");
  }

  if (!res.ok) {
    throw new Error(`Failed to update workflow: ${res.statusText}`);
  }

  const result = await res.json();
  if (!result.workflow) {
    throw new Error("Workflow not found");
  }

  return { workflow: result.workflow };
}

/**
 * Publish a workflow (create a new version)
 */
export async function publishWorkflow(
  id: string,
  data: { dsl: WorkflowDSL; changelog?: string }
): Promise<{
  version: {
    id: string;
    workflowId: string;
    version: number;
    createdAt: string;
  };
}> {
  const res = await client.api.workflows[":id"].publish.$post({ param: { id }, json: data });

  if (res.status === 401) {
    throw new Error("Authentication required");
  }

  if (res.status === 404) {
    throw new Error("Workflow not found");
  }

  if (!res.ok) {
    throw new Error(`Failed to publish workflow: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Delete a workflow
 */
export async function deleteWorkflow(id: string): Promise<void> {
  const res = await client.api.workflows[":id"].$delete({ param: { id } });

  if (res.status === 401) {
    throw new Error("Authentication required");
  }

  if (res.status === 404) {
    throw new Error("Workflow not found");
  }

  if (!res.ok) {
    throw new Error(`Failed to delete workflow: ${res.statusText}`);
  }
}

// ============================================
// Execution Logs API
// ============================================

/**
 * Get execution logs for a workflow
 */
export async function getExecutionLogs(
  workflowId: string,
  limit = 100,
  offset = 0
): Promise<{ logs: ExecutionLogItem[] }> {
  const res = await client.api.workflows[":id"].logs.$get({
    param: { id: workflowId },
    query: { limit: String(limit), offset: String(offset) },
  });

  if (res.status === 401) {
    throw new Error("Authentication required");
  }

  if (res.status === 404) {
    throw new Error("Workflow not found");
  }

  if (!res.ok) {
    throw new Error(`Failed to get execution logs: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Delete execution logs for a workflow
 */
export async function deleteExecutionLogs(
  workflowId: string
): Promise<{ deleted: number }> {
  const res = await client.api.workflows[":id"].logs.$delete({
    param: { id: workflowId },
  });

  if (res.status === 401) {
    throw new Error("Authentication required");
  }

  if (res.status === 404) {
    throw new Error("Workflow not found");
  }

  if (!res.ok) {
    throw new Error(`Failed to delete execution logs: ${res.statusText}`);
  }

  return res.json();
}

// ============================================
// GAS (Google Apps Script) API
// ============================================

/**
 * Validate a GAS deployment ID
 */
export async function validateGasDeployment(
  deploymentId: string
): Promise<ValidateGasDeploymentResponse> {
  const res = await client.api.gas["validate-deployment"].$post({
    json: { deploymentId },
  });

  if (res.status === 401) {
    throw new Error("Authentication required");
  }

  if (!res.ok) {
    throw new Error(`Failed to validate deployment: ${res.statusText}`);
  }

  return res.json();
}
