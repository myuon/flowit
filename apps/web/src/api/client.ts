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
 * Create headers with auth token
 */
function getAuthHeaders(): HeadersInit {
  const token = getAccessToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

export interface ValidateResponse {
  valid: boolean;
  errors: string[];
}

export async function validateWorkflow(
  workflow: WorkflowDSL
): Promise<ValidateResponse> {
  const headers = getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}/api/validate`, {
    method: "POST",
    headers,
    body: JSON.stringify({ workflow }),
  });

  if (response.status === 401) {
    throw new Error("Authentication required");
  }

  if (!response.ok) {
    throw new Error(`Validation failed: ${response.statusText}`);
  }

  return response.json();
}

export async function executeWorkflow(
  request: ExecuteWorkflowRequest
): Promise<ExecuteWorkflowResponse> {
  const headers = getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}/api/execute`, {
    method: "POST",
    headers,
    body: JSON.stringify(request),
  });

  if (response.status === 401) {
    throw new Error("Authentication required");
  }

  const data = await response.json();

  if (!response.ok && !data.error) {
    throw new Error(`Execution failed: ${response.statusText}`);
  }

  return data;
}

export async function healthCheck(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE_URL}/health`);
  return response.json();
}

/**
 * Get current authenticated user from API
 */
export async function getCurrentUser(): Promise<{ user: AuthUser; isAdmin: boolean }> {
  const headers = getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers,
  });

  if (response.status === 401) {
    throw new Error("Not authenticated");
  }

  if (!response.ok) {
    throw new Error(`Failed to get user: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get app settings (public endpoint)
 */
export async function getAppSettings(): Promise<AppSettings> {
  const response = await fetch(`${API_BASE_URL}/config/settings`);

  if (!response.ok) {
    throw new Error(`Failed to get settings: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Update app settings (admin only)
 */
export async function updateAppSettings(
  settings: Partial<AppSettings>
): Promise<AppSettings> {
  const headers = getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}/admin/settings`, {
    method: "PUT",
    headers,
    body: JSON.stringify(settings),
  });

  if (response.status === 401) {
    throw new Error("Authentication required");
  }

  if (response.status === 403) {
    throw new Error("Admin access required");
  }

  if (!response.ok) {
    throw new Error(`Failed to update settings: ${response.statusText}`);
  }

  return response.json();
}

// ============================================
// Workflow API
// ============================================

export interface WorkflowListItem {
  id: string;
  name: string;
  description: string | null;
  currentVersionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowWithVersions extends WorkflowListItem {
  versions: Array<{
    id: string;
    workflowId: string;
    version: number;
    dsl: WorkflowDSL & { meta?: WorkflowMeta };
    changelog: string | null;
    createdAt: string;
  }>;
}

/**
 * List all workflows
 */
export async function listWorkflows(): Promise<{ workflows: WorkflowListItem[] }> {
  const headers = getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}/api/workflows`, {
    headers,
  });

  if (response.status === 401) {
    throw new Error("Authentication required");
  }

  if (!response.ok) {
    throw new Error(`Failed to list workflows: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get a single workflow with its versions
 */
export async function getWorkflow(id: string): Promise<{ workflow: WorkflowWithVersions }> {
  const headers = getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}/api/workflows/${id}`, {
    headers,
  });

  if (response.status === 401) {
    throw new Error("Authentication required");
  }

  if (response.status === 404) {
    throw new Error("Workflow not found");
  }

  if (!response.ok) {
    throw new Error(`Failed to get workflow: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Create a new workflow
 */
export async function createWorkflow(data: {
  name: string;
  description?: string;
  dsl?: WorkflowDSL;
}): Promise<{ workflow: WorkflowListItem }> {
  const headers = getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}/api/workflows`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });

  if (response.status === 401) {
    throw new Error("Authentication required");
  }

  if (!response.ok) {
    throw new Error(`Failed to create workflow: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Update a workflow
 */
export async function updateWorkflow(
  id: string,
  data: { name?: string; description?: string; dsl?: WorkflowDSL }
): Promise<{ workflow: WorkflowListItem }> {
  const headers = getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}/api/workflows/${id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(data),
  });

  if (response.status === 401) {
    throw new Error("Authentication required");
  }

  if (response.status === 404) {
    throw new Error("Workflow not found");
  }

  if (!response.ok) {
    throw new Error(`Failed to update workflow: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Delete a workflow
 */
export async function deleteWorkflow(id: string): Promise<void> {
  const headers = getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}/api/workflows/${id}`, {
    method: "DELETE",
    headers,
  });

  if (response.status === 401) {
    throw new Error("Authentication required");
  }

  if (response.status === 404) {
    throw new Error("Workflow not found");
  }

  if (!response.ok) {
    throw new Error(`Failed to delete workflow: ${response.statusText}`);
  }
}

// ============================================
// Execution Logs API
// ============================================

export interface ExecutionLogItem {
  id: string;
  workflowId: string;
  executionId: string;
  nodeId: string;
  data: unknown;
  createdAt: string;
}

/**
 * Get execution logs for a workflow
 */
export async function getExecutionLogs(
  workflowId: string,
  limit = 100,
  offset = 0
): Promise<{ logs: ExecutionLogItem[] }> {
  const headers = getAuthHeaders();

  const response = await fetch(
    `${API_BASE_URL}/api/workflows/${workflowId}/logs?limit=${limit}&offset=${offset}`,
    { headers }
  );

  if (response.status === 401) {
    throw new Error("Authentication required");
  }

  if (response.status === 404) {
    throw new Error("Workflow not found");
  }

  if (!response.ok) {
    throw new Error(`Failed to get execution logs: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Delete execution logs for a workflow
 */
export async function deleteExecutionLogs(
  workflowId: string
): Promise<{ deleted: number }> {
  const headers = getAuthHeaders();

  const response = await fetch(
    `${API_BASE_URL}/api/workflows/${workflowId}/logs`,
    {
      method: "DELETE",
      headers,
    }
  );

  if (response.status === 401) {
    throw new Error("Authentication required");
  }

  if (response.status === 404) {
    throw new Error("Workflow not found");
  }

  if (!response.ok) {
    throw new Error(`Failed to delete execution logs: ${response.statusText}`);
  }

  return response.json();
}
