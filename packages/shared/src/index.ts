// ============================================
// Workflow DSL v0
// ============================================

export const WORKFLOW_DSL_VERSION = "0.1.0" as const;

// IO Schema types
export type SchemaType =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array"
  | "any";

export interface IOSchema {
  type: SchemaType;
  description?: string;
  required?: boolean;
  default?: unknown;
  items?: IOSchema; // for array type
  properties?: Record<string, IOSchema>; // for object type
}

// Secrets reference
export interface SecretRef {
  key: string; // Reference key in secrets store
  env?: string; // Optional env variable name to inject as
}

// Node parameter value (can be static or reference)
export type ParamValue =
  | { type: "static"; value: unknown }
  | { type: "secret"; ref: string }
  | { type: "input"; path: string }; // Reference to workflow input

// DSL Node definition
export interface WorkflowNode {
  id: string;
  type: string; // Node type from registry (e.g., "llm", "http", "transform")
  label?: string;
  params: Record<string, ParamValue>;
  inputs: Record<string, IOSchema>;
  outputs: Record<string, IOSchema>;
}

// DSL Edge definition
export interface WorkflowEdge {
  id: string;
  source: string; // Source node ID
  target: string; // Target node ID
  sourceHandle: string; // Output handle name
  targetHandle: string; // Input handle name
}

// Workflow metadata
export interface WorkflowMeta {
  name: string;
  description?: string;
  version: string;
  createdAt?: string;
  updatedAt?: string;
}

// Complete Workflow DSL document
export interface WorkflowDSL {
  dslVersion: typeof WORKFLOW_DSL_VERSION;
  meta: WorkflowMeta;
  inputs: Record<string, IOSchema>; // Workflow-level inputs
  outputs: Record<string, IOSchema>; // Workflow-level outputs
  secrets: SecretRef[]; // Required secrets
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

// ============================================
// React Flow types (for UI)
// ============================================

export interface ReactFlowNodeData {
  label: string;
  nodeType: string;
  params: Record<string, ParamValue>;
  inputs: Record<string, IOSchema>;
  outputs: Record<string, IOSchema>;
}

export interface ReactFlowNode {
  id: string;
  type: string; // React Flow node type (custom component)
  position: { x: number; y: number };
  data: ReactFlowNodeData;
}

export interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
}

export interface ReactFlowGraph {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
}

// ============================================
// API types
// ============================================

export interface ExecuteWorkflowRequest {
  workflow: WorkflowDSL;
  inputs: Record<string, unknown>;
  secrets?: Record<string, string>; // Runtime secrets
}

export interface ExecuteWorkflowResponse {
  outputs: Record<string, unknown>;
  executionId: string;
  status: "success" | "error";
  error?: string;
}

// ============================================
// Auth types (OIDC provider-agnostic)
// ============================================

/**
 * OIDC Provider configuration
 * Designed to work with any standard OIDC provider (Google, Auth0, Keycloak, etc.)
 */
export interface OIDCConfig {
  /** OIDC issuer URL (e.g., https://accounts.google.com) */
  issuer: string;
  /** OAuth client ID */
  clientId: string;
  /** OAuth client secret (for confidential clients, optional for public clients) */
  clientSecret?: string;
  /** OAuth scopes to request */
  scopes: string[];
  /** Redirect URI after authentication */
  redirectUri: string;
}

/**
 * Authenticated user information (provider-agnostic)
 * Uses standard OIDC claims
 */
export interface AuthUser {
  /** Subject identifier (unique user ID from provider) */
  sub: string;
  /** User's email address */
  email: string;
  /** Whether email is verified */
  emailVerified?: boolean;
  /** User's display name */
  name?: string;
  /** URL to user's profile picture */
  picture?: string;
  /** OIDC issuer that authenticated this user */
  iss: string;
}

/**
 * Token response from OIDC provider
 */
export interface TokenResponse {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
}

/**
 * Auth session stored on client
 */
export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  idToken: string;
  expiresAt: number;
}

// ============================================
// App Configuration types
// ============================================

/** Supported languages */
export type Language = "en" | "ja";

/** App configuration settings */
export interface AppSettings {
  language: Language;
}

/** Default app settings */
export const DEFAULT_APP_SETTINGS: AppSettings = {
  language: "en",
};

// Legacy types (deprecated, use new types above)
/** @deprecated Use ReactFlowNode instead */
export type FlowNode = ReactFlowNode;
/** @deprecated Use ReactFlowEdge instead */
export type FlowEdge = ReactFlowEdge;
/** @deprecated Use ReactFlowGraph instead */
export type FlowGraph = ReactFlowGraph;
/** @deprecated Use ExecuteWorkflowRequest instead */
export type ExecuteFlowRequest = ExecuteWorkflowRequest;
/** @deprecated Use ExecuteWorkflowResponse instead */
export type ExecuteFlowResponse = ExecuteWorkflowResponse;
