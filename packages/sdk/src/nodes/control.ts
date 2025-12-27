import { defineNode, io, param } from "../defineNode";

/**
 * If Condition Node
 * Evaluates a condition and routes to true or false branch
 */
export const ifConditionNode = defineNode({
  id: "if-condition",
  displayName: "If Condition",
  description: "Evaluates a condition and routes execution to true or false branch",
  inputs: {
    value: io.any({ description: "Value to evaluate", required: true }),
    context: io.object({}, { description: "Additional context for condition" }),
  },
  outputs: {
    result: io.boolean({ description: "Condition result (true/false)" }),
    value: io.any({ description: "Pass-through of input value" }),
  },
  paramsSchema: {
    conditionType: param.select(
      "Condition Type",
      [
        { label: "Truthy", value: "truthy" },
        { label: "Equals", value: "equals" },
        { label: "Not Equals", value: "not_equals" },
        { label: "Greater Than", value: "gt" },
        { label: "Less Than", value: "lt" },
        { label: "Contains", value: "contains" },
        { label: "Custom Expression", value: "expression" },
      ],
      { default: "truthy" }
    ),
    compareValue: param.string("Compare Value", {
      description: "Value to compare against (for equals, gt, lt, contains)",
      placeholder: "value to compare",
    }),
    expression: param.string("Expression", {
      description: "JavaScript expression. Use `value` and `ctx` variables.",
      placeholder: "value > 10 && ctx.enabled",
      multiline: true,
    }),
  },
  display: {
    icon: "🔀",
    color: "#FF9800",
    category: "control",
    tags: ["condition", "if", "branch", "routing"],
  },
  async run({ inputs, params, context }) {
    const value = inputs.value;
    const ctx = inputs.context || {};
    let result: boolean;

    switch (params.conditionType) {
      case "truthy":
        result = Boolean(value);
        break;

      case "equals":
        result = String(value) === params.compareValue;
        break;

      case "not_equals":
        result = String(value) !== params.compareValue;
        break;

      case "gt":
        result = Number(value) > Number(params.compareValue);
        break;

      case "lt":
        result = Number(value) < Number(params.compareValue);
        break;

      case "contains":
        if (typeof value === "string") {
          result = value.includes(params.compareValue || "");
        } else if (Array.isArray(value)) {
          result = value.includes(params.compareValue);
        } else {
          result = false;
        }
        break;

      case "expression":
        try {
          const fn = new Function(
            "value",
            "ctx",
            `"use strict"; return Boolean(${params.expression});`
          );
          result = fn(value, ctx);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`Expression error: ${message}`);
        }
        break;

      default:
        result = Boolean(value);
    }

    context.log(`Condition evaluated to: ${result}`);

    return { result, value };
  },
});

/**
 * Switch Node
 * Routes execution based on a value matching multiple cases
 */
export const switchNode = defineNode({
  id: "switch",
  displayName: "Switch",
  description: "Routes execution based on matching a value to multiple cases",
  inputs: {
    value: io.any({ description: "Value to match against cases", required: true }),
  },
  outputs: {
    matchedCase: io.string({ description: "The case that matched" }),
    value: io.any({ description: "Pass-through of input value" }),
  },
  paramsSchema: {
    cases: param.json("Cases", {
      description: 'JSON array of case values, e.g., ["case1", "case2", "default"]',
      default: ["default"],
    }),
    matchPath: param.string("Match Path", {
      description: "Path to value for matching (dot notation), leave empty to use value directly",
      placeholder: "status.code",
    }),
  },
  display: {
    icon: "🔃",
    color: "#795548",
    category: "control",
    tags: ["switch", "case", "routing"],
  },
  async run({ inputs, params, context }) {
    let matchValue = inputs.value;

    // Extract nested value if path is specified
    if (params.matchPath) {
      const parts = params.matchPath.split(".");
      for (const part of parts) {
        if (matchValue == null) break;
        matchValue = (matchValue as Record<string, unknown>)[part];
      }
    }

    const cases = params.cases as string[];
    const stringValue = String(matchValue);

    // Find matching case
    let matchedCase = "default";
    for (const c of cases) {
      if (c === stringValue) {
        matchedCase = c;
        break;
      }
    }

    // If no match and "default" is in cases, use default
    if (matchedCase === "default" && !cases.includes("default")) {
      matchedCase = cases[cases.length - 1]; // Use last case as fallback
    }

    context.log(`Switch matched case: ${matchedCase}`);

    return { matchedCase, value: inputs.value };
  },
});

/**
 * Merge Node
 * Merges multiple inputs into a single output (for rejoining branches)
 */
export const mergeNode = defineNode({
  id: "merge",
  displayName: "Merge",
  description: "Merges multiple branch inputs into a single output",
  inputs: {
    input1: io.any({ description: "First input" }),
    input2: io.any({ description: "Second input" }),
    input3: io.any({ description: "Third input (optional)" }),
    input4: io.any({ description: "Fourth input (optional)" }),
  },
  outputs: {
    result: io.any({ description: "First non-null input value" }),
    all: io.array(io.any(), { description: "All non-null input values" }),
  },
  paramsSchema: {
    strategy: param.select(
      "Merge Strategy",
      [
        { label: "First Non-Null", value: "first" },
        { label: "Last Non-Null", value: "last" },
        { label: "Merge Objects", value: "merge" },
        { label: "Array of All", value: "array" },
      ],
      { default: "first" }
    ),
  },
  display: {
    icon: "🔗",
    color: "#607D8B",
    category: "control",
    tags: ["merge", "join", "combine"],
  },
  async run({ inputs, params }) {
    const values = [inputs.input1, inputs.input2, inputs.input3, inputs.input4].filter(
      (v) => v !== undefined && v !== null
    );

    let result: unknown;

    switch (params.strategy) {
      case "first":
        result = values[0];
        break;

      case "last":
        result = values[values.length - 1];
        break;

      case "merge":
        result = values.reduce((acc, val) => {
          if (typeof val === "object" && val !== null && !Array.isArray(val)) {
            return { ...(acc as object), ...(val as object) };
          }
          return val;
        }, {});
        break;

      case "array":
        result = values;
        break;

      default:
        result = values[0];
    }

    return { result, all: values };
  },
});
