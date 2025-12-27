import type {
  WorkflowDSL,
  ExecuteWorkflowRequest,
  ExecuteWorkflowResponse,
} from "@flowit/shared";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export interface ValidateResponse {
  valid: boolean;
  errors: string[];
}

export async function validateWorkflow(
  workflow: WorkflowDSL
): Promise<ValidateResponse> {
  const response = await fetch(`${API_BASE_URL}/validate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ workflow }),
  });

  if (!response.ok) {
    throw new Error(`Validation failed: ${response.statusText}`);
  }

  return response.json();
}

export async function executeWorkflow(
  request: ExecuteWorkflowRequest
): Promise<ExecuteWorkflowResponse> {
  const response = await fetch(`${API_BASE_URL}/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

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
