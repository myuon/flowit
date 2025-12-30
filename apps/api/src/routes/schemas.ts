import { z } from "zod";
import type { WorkflowDSL } from "@flowit/shared";

// ============================================
// Common Schemas
// ============================================

// IOSchema is a recursive type, so we use a more permissive schema
const ioSchemaSchema = z.object({
  type: z.enum(["string", "number", "boolean", "object", "array", "any"]),
  description: z.string().optional(),
  required: z.boolean().optional(),
  default: z.unknown().optional(),
  items: z.any().optional(),
  properties: z.record(z.string(), z.any()).optional(),
});

const paramValueSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("static"), value: z.unknown() }),
  z.object({ type: z.literal("secret"), ref: z.string() }),
  z.object({ type: z.literal("input"), path: z.string() }),
]);

const workflowNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  label: z.string().optional(),
  params: z.record(z.string(), paramValueSchema),
  inputs: z.record(z.string(), ioSchemaSchema),
  outputs: z.record(z.string(), ioSchemaSchema),
});

const workflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string(),
  targetHandle: z.string(),
});

const workflowMetaSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  version: z.string(),
  status: z.enum(["draft", "published"]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const secretRefSchema = z.object({
  key: z.string(),
  env: z.string().optional(),
});

// WorkflowDSL schema - validates structure but returns as WorkflowDSL type
const workflowDSLSchemaBase = z.object({
  dslVersion: z.literal("0.1.0"),
  meta: workflowMetaSchema,
  inputs: z.record(z.string(), ioSchemaSchema),
  outputs: z.record(z.string(), ioSchemaSchema),
  secrets: z.array(secretRefSchema),
  nodes: z.array(workflowNodeSchema),
  edges: z.array(workflowEdgeSchema),
});

// Transform to ensure proper typing
export const workflowDSLSchema = workflowDSLSchemaBase.transform(
  (val) => val as unknown as WorkflowDSL
);

// ============================================
// Workflow Route Schemas
// ============================================

export const validateWorkflowSchema = z.object({
  workflow: workflowDSLSchema,
});

export const createWorkflowSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  dsl: workflowDSLSchema.optional(),
});

export const updateWorkflowSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  dsl: workflowDSLSchema.optional(),
});

export const publishWorkflowSchema = z.object({
  dsl: workflowDSLSchema,
  changelog: z.string().optional(),
});

export const executeWorkflowSchema = z
  .object({
    workflow: workflowDSLSchema,
    inputs: z.record(z.string(), z.unknown()),
    secrets: z.record(z.string(), z.string()).optional(),
  })
  .transform((val) => ({
    workflow: val.workflow,
    inputs: val.inputs as Record<string, unknown>,
    secrets: val.secrets as Record<string, string> | undefined,
  }));

// ============================================
// GAS Route Schemas
// ============================================

export const validateGasDeploymentSchema = z.object({
  deploymentId: z.string().min(1, "Deployment ID is required"),
});

// ============================================
// Admin Route Schemas
// ============================================

export const updateSettingsSchema = z.object({
  language: z.enum(["en", "ja"]).optional(),
  anthropicApiKey: z.string().optional(),
});

// ============================================
// Query Schemas
// ============================================

export const logsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(1000).default(100),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const executeQuerySchema = z.object({
  sse: z
    .enum(["true", "false"])
    .default("false")
    .transform((val) => val === "true"),
});
