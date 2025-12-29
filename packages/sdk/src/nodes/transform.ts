import { defineNode, io, param } from "../defineNode";

/**
 * Template Node
 * Renders a template string with variables
 */
export const templateNode = defineNode({
  id: "template",
  displayName: "Template",
  description: "Renders a template string with variable substitution",
  inputs: {
    variables: io.object({}, { description: "Variables to substitute" }),
  },
  outputs: {
    result: io.string({ description: "The rendered template" }),
  },
  paramsSchema: {
    template: param.string("Template", {
      description: "Template string with {{variable}} placeholders",
      placeholder: "Hello, {{name}}!",
      multiline: true,
      default: "",
    }),
  },
  display: {
    icon: "📝",
    color: "#673AB7",
    category: "transform",
    tags: ["template", "string"],
  },
  async run({ inputs, params }) {
    let result = params.template;
    const vars = inputs.variables as Record<string, unknown>;
    for (const [key, value] of Object.entries(vars)) {
      result = result.replace(
        new RegExp(`{{\\s*${key}\\s*}}`, "g"),
        String(value)
      );
    }
    return { result };
  },
});

/**
 * JSON Parse Node
 */
export const jsonParseNode = defineNode({
  id: "json-parse",
  displayName: "JSON Parse",
  description: "Parses a JSON string into an object",
  inputs: {
    text: io.string({ description: "JSON string to parse", required: true }),
  },
  outputs: {
    value: io.any({ description: "Parsed JSON value" }),
  },
  paramsSchema: {},
  display: {
    icon: "🔄",
    color: "#FF5722",
    category: "transform",
    tags: ["json", "parse"],
  },
  async run({ inputs }) {
    return { value: JSON.parse(inputs.text as string) };
  },
});

/**
 * JSON Stringify Node
 */
export const jsonStringifyNode = defineNode({
  id: "json-stringify",
  displayName: "JSON Stringify",
  description: "Converts a value to a JSON string",
  inputs: {
    value: io.any({ description: "Value to stringify", required: true }),
  },
  outputs: {
    text: io.string({ description: "JSON string" }),
  },
  paramsSchema: {
    pretty: param.boolean("Pretty Print", {
      description: "Format with indentation",
      default: false,
    }),
  },
  display: {
    icon: "📄",
    color: "#FF5722",
    category: "transform",
    tags: ["json", "stringify"],
  },
  async run({ inputs, params }) {
    const text = params.pretty
      ? JSON.stringify(inputs.value, null, 2)
      : JSON.stringify(inputs.value);
    return { text };
  },
});

/**
 * Object Get Property Node
 */
export const getPropertyNode = defineNode({
  id: "get-property",
  displayName: "Get Property",
  description: "Gets a property from an object using a path",
  inputs: {
    object: io.any({
      description: "The object to get property from",
      required: true,
    }),
  },
  outputs: {
    value: io.any({ description: "The property value" }),
  },
  paramsSchema: {
    path: param.string("Path", {
      description: "Property path (e.g., 'user.name' or 'items[0].id')",
      placeholder: "property.path",
      default: "",
    }),
  },
  display: {
    icon: "🔍",
    color: "#795548",
    category: "transform",
    tags: ["object", "property"],
  },
  async run({ inputs, params }) {
    const path = params.path.split(/[.[\]]+/).filter(Boolean);
    let value: unknown = inputs.object;
    for (const key of path) {
      if (value == null) break;
      value = (value as Record<string, unknown>)[key];
    }
    return { value };
  },
});

/**
 * JavaScript Transform Node
 * Transforms data using a JavaScript expression
 */
export const jsTransformNode = defineNode({
  id: "js-transform",
  displayName: "JS Transform",
  description: "Transforms data using a JavaScript expression",
  inputs: {
    data: io.any({
      description: "Input data (available as `data`)",
      required: true,
    }),
    context: io.object(
      {},
      { description: "Additional context (available as `ctx`)" }
    ),
  },
  outputs: {
    result: io.any({ description: "Transformed result" }),
  },
  paramsSchema: {
    expression: param.string("Expression", {
      description:
        "JavaScript expression. Use `data` for input, `ctx` for context. Example: `data.items.map(x => x.name)`",
      placeholder: "data.items.filter(x => x.active)",
      multiline: true,
      required: true,
    }),
  },
  display: {
    icon: "⚡",
    color: "#FFC107",
    category: "transform",
    tags: ["javascript", "transform", "map", "filter"],
  },
  async run({ inputs, params, context }) {
    const data = inputs.data;
    const ctx = inputs.context || {};

    // Create a safe evaluation context
    const evalContext = {
      data,
      ctx,
      // Common utilities
      JSON,
      Math,
      Date,
      Array,
      Object,
      String,
      Number,
      Boolean,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
    };

    try {
      // Create function from expression
      const keys = Object.keys(evalContext);
      const values = Object.values(evalContext);
      const fn = new Function(
        ...keys,
        `"use strict"; return (${params.expression});`
      );
      const result = fn(...values);

      context.log(`Transform completed`);
      return { result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Transform error: ${message}`);
    }
  },
});

/**
 * Map Node
 * Maps over an array and transforms each element
 */
export const mapNode = defineNode({
  id: "map",
  displayName: "Map",
  description: "Maps over an array and transforms each element",
  inputs: {
    array: io.array(io.any(), {
      description: "Array to map over",
      required: true,
    }),
  },
  outputs: {
    result: io.array(io.any(), { description: "Mapped array" }),
  },
  paramsSchema: {
    expression: param.string("Expression", {
      description:
        "JavaScript expression for each item. Use `item` for current element, `index` for position.",
      placeholder: "item.name",
      multiline: true,
      required: true,
    }),
  },
  display: {
    icon: "🔁",
    color: "#9C27B0",
    category: "transform",
    tags: ["array", "map", "transform"],
  },
  async run({ inputs, params }) {
    const array = inputs.array as unknown[];
    const fn = new Function(
      "item",
      "index",
      "array",
      `"use strict"; return (${params.expression});`
    );

    const result = array.map((item, index, arr) => fn(item, index, arr));
    return { result };
  },
});

/**
 * Filter Node
 * Filters an array based on a condition
 */
export const filterNode = defineNode({
  id: "filter",
  displayName: "Filter",
  description: "Filters an array based on a condition",
  inputs: {
    array: io.array(io.any(), {
      description: "Array to filter",
      required: true,
    }),
  },
  outputs: {
    result: io.array(io.any(), { description: "Filtered array" }),
    count: io.number({ description: "Number of items after filtering" }),
  },
  paramsSchema: {
    condition: param.string("Condition", {
      description:
        "JavaScript condition for each item. Use `item` for current element. Return truthy to keep.",
      placeholder: "item.active === true",
      multiline: true,
      required: true,
    }),
  },
  display: {
    icon: "🔎",
    color: "#E91E63",
    category: "transform",
    tags: ["array", "filter"],
  },
  async run({ inputs, params }) {
    const array = inputs.array as unknown[];
    const fn = new Function(
      "item",
      "index",
      "array",
      `"use strict"; return (${params.condition});`
    );

    const result = array.filter((item, index, arr) => fn(item, index, arr));
    return { result, count: result.length };
  },
});
