import type { IOSchema, ParamValue } from "@flowit/shared";

// ============================================
// Parameter Schema Types
// ============================================

export type ParamSchemaType =
  | "string"
  | "number"
  | "boolean"
  | "select"
  | "secret"
  | "json";

export interface ParamSchemaBase {
  type: ParamSchemaType;
  label: string;
  description?: string;
  required?: boolean;
  default?: unknown;
}

export interface StringParamSchema extends ParamSchemaBase {
  type: "string";
  placeholder?: string;
  multiline?: boolean;
  default?: string;
}

export interface NumberParamSchema extends ParamSchemaBase {
  type: "number";
  min?: number;
  max?: number;
  step?: number;
  default?: number;
}

export interface BooleanParamSchema extends ParamSchemaBase {
  type: "boolean";
  default?: boolean;
}

export interface SelectParamSchema extends ParamSchemaBase {
  type: "select";
  options: Array<{ label: string; value: string }>;
  default?: string;
}

export interface SecretParamSchema extends ParamSchemaBase {
  type: "secret";
  placeholder?: string;
}

export interface JsonParamSchema extends ParamSchemaBase {
  type: "json";
  default?: unknown;
}

export type ParamSchema =
  | StringParamSchema
  | NumberParamSchema
  | BooleanParamSchema
  | SelectParamSchema
  | SecretParamSchema
  | JsonParamSchema;

// ============================================
// Node Display Metadata
// ============================================

export type NodeCategory =
  | "input"
  | "output"
  | "ai"
  | "transform"
  | "control"
  | "integration"
  | "utility";

export interface NodeDisplayMeta {
  icon?: string; // Icon name or emoji
  color?: string; // Hex color for node header
  category: NodeCategory;
  tags?: string[];
  docsUrl?: string;
}

// ============================================
// Node Definition Types
// ============================================

// Infer TypeScript types from IOSchema
type InferSchemaType<S extends IOSchema> = S["type"] extends "string"
  ? string
  : S["type"] extends "number"
    ? number
    : S["type"] extends "boolean"
      ? boolean
      : S["type"] extends "array"
        ? unknown[]
        : S["type"] extends "object"
          ? Record<string, unknown>
          : unknown;

// Infer input/output types from schema record
type InferIOTypes<T extends Record<string, IOSchema>> = {
  [K in keyof T]: InferSchemaType<T[K]>;
};

// Infer param types from param schema record
type InferParamType<S extends ParamSchema> = S["type"] extends "string"
  ? string
  : S["type"] extends "number"
    ? number
    : S["type"] extends "boolean"
      ? boolean
      : S["type"] extends "select"
        ? string
        : S["type"] extends "secret"
          ? string
          : S["type"] extends "json"
            ? unknown
            : unknown;

type InferParamTypes<T extends Record<string, ParamSchema>> = {
  [K in keyof T]: InferParamType<T[K]>;
};

// Node execution context
export interface NodeContext {
  nodeId: string;
  executionId: string;
  workflowId?: string;
  signal?: AbortSignal;
  log: (message: string) => void;
  /** Write a log entry to the execution log database */
  writeLog?: (data: unknown) => Promise<void>;
  /** Workflow-level inputs (e.g., _webhook data) */
  workflowInputs?: Record<string, unknown>;
}

// Node definition configuration
export interface NodeDefConfig<
  TInputs extends Record<string, IOSchema>,
  TOutputs extends Record<string, IOSchema>,
  TParams extends Record<string, ParamSchema>,
> {
  id: string;
  displayName: string;
  description?: string;
  inputs: TInputs;
  outputs: TOutputs;
  paramsSchema: TParams;
  display: NodeDisplayMeta;
  run: (args: {
    inputs: InferIOTypes<TInputs>;
    params: InferParamTypes<TParams>;
    context: NodeContext;
  }) => Promise<InferIOTypes<TOutputs>>;
}

// Defined node instance
export interface DefinedNode<
  TInputs extends Record<string, IOSchema> = Record<string, IOSchema>,
  TOutputs extends Record<string, IOSchema> = Record<string, IOSchema>,
  TParams extends Record<string, ParamSchema> = Record<string, ParamSchema>,
> {
  id: string;
  displayName: string;
  description?: string;
  inputs: TInputs;
  outputs: TOutputs;
  paramsSchema: TParams;
  display: NodeDisplayMeta;
  run: (args: {
    inputs: InferIOTypes<TInputs>;
    params: InferParamTypes<TParams>;
    context: NodeContext;
  }) => Promise<InferIOTypes<TOutputs>>;
  // Utility methods
  getDefaultParams: () => Record<string, ParamValue>;
  toIOSchemas: () => { inputs: TInputs; outputs: TOutputs };
}

// ============================================
// defineNode Function
// ============================================

export function defineNode<
  TInputs extends Record<string, IOSchema>,
  TOutputs extends Record<string, IOSchema>,
  TParams extends Record<string, ParamSchema>,
>(
  config: NodeDefConfig<TInputs, TOutputs, TParams>
): DefinedNode<TInputs, TOutputs, TParams> {
  return {
    ...config,
    getDefaultParams() {
      const defaults: Record<string, ParamValue> = {};
      for (const [key, schema] of Object.entries(config.paramsSchema)) {
        if (schema.type === "secret") {
          defaults[key] = { type: "secret", ref: "" };
        } else if (schema.default !== undefined) {
          defaults[key] = { type: "static", value: schema.default };
        }
      }
      return defaults;
    },
    toIOSchemas() {
      return {
        inputs: config.inputs,
        outputs: config.outputs,
      };
    },
  };
}

// ============================================
// Sample Node Schema Builder (Fluent API)
// ============================================

export const io = {
  string(options?: Partial<Omit<IOSchema, "type">>): IOSchema {
    return { type: "string", ...options };
  },
  number(options?: Partial<Omit<IOSchema, "type">>): IOSchema {
    return { type: "number", ...options };
  },
  boolean(options?: Partial<Omit<IOSchema, "type">>): IOSchema {
    return { type: "boolean", ...options };
  },
  array(items: IOSchema, options?: Partial<Omit<IOSchema, "type" | "items">>): IOSchema {
    return { type: "array", items, ...options };
  },
  object(
    properties: Record<string, IOSchema>,
    options?: Partial<Omit<IOSchema, "type" | "properties">>
  ): IOSchema {
    return { type: "object", properties, ...options };
  },
  any(options?: Partial<Omit<IOSchema, "type">>): IOSchema {
    return { type: "any", ...options };
  },
};

export const param = {
  string(
    label: string,
    options?: Partial<Omit<StringParamSchema, "type" | "label">>
  ): StringParamSchema {
    return { type: "string", label, ...options };
  },
  number(
    label: string,
    options?: Partial<Omit<NumberParamSchema, "type" | "label">>
  ): NumberParamSchema {
    return { type: "number", label, ...options };
  },
  boolean(
    label: string,
    options?: Partial<Omit<BooleanParamSchema, "type" | "label">>
  ): BooleanParamSchema {
    return { type: "boolean", label, ...options };
  },
  select(
    label: string,
    options: Array<{ label: string; value: string }>,
    extra?: Partial<Omit<SelectParamSchema, "type" | "label" | "options">>
  ): SelectParamSchema {
    return { type: "select", label, options, ...extra };
  },
  secret(
    label: string,
    options?: Partial<Omit<SecretParamSchema, "type" | "label">>
  ): SecretParamSchema {
    return { type: "secret", label, ...options };
  },
  json(
    label: string,
    options?: Partial<Omit<JsonParamSchema, "type" | "label">>
  ): JsonParamSchema {
    return { type: "json", label, ...options };
  },
};
