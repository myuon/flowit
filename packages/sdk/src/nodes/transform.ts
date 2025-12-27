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
      result = result.replace(new RegExp(`{{\\s*${key}\\s*}}`, "g"), String(value));
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
    object: io.any({ description: "The object to get property from", required: true }),
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
