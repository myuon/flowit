import { defineNode, io, param } from "../defineNode";

/**
 * Text Input Node
 * Provides text input from workflow parameters
 */
export const textInputNode = defineNode({
  id: "text-input",
  displayName: "Text Input",
  description: "Provides a text value as input to the workflow",
  inputs: {},
  outputs: {
    value: io.string({ description: "The text value" }),
  },
  paramsSchema: {
    text: param.string("Text", {
      description: "The text to output",
      placeholder: "Enter text...",
      multiline: true,
      default: "",
    }),
  },
  display: {
    icon: "📝",
    color: "#4CAF50",
    category: "input",
    tags: ["input", "text"],
  },
  async run({ params }) {
    return { value: params.text };
  },
});

/**
 * Number Input Node
 */
export const numberInputNode = defineNode({
  id: "number-input",
  displayName: "Number Input",
  description: "Provides a number value as input to the workflow",
  inputs: {},
  outputs: {
    value: io.number({ description: "The number value" }),
  },
  paramsSchema: {
    number: param.number("Number", {
      description: "The number to output",
      default: 0,
    }),
  },
  display: {
    icon: "🔢",
    color: "#2196F3",
    category: "input",
    tags: ["input", "number"],
  },
  async run({ params }) {
    return { value: params.number };
  },
});

/**
 * JSON Input Node
 */
export const jsonInputNode = defineNode({
  id: "json-input",
  displayName: "JSON Input",
  description: "Provides a JSON object as input to the workflow",
  inputs: {},
  outputs: {
    value: io.any({ description: "The JSON value" }),
  },
  paramsSchema: {
    json: param.json("JSON", {
      description: "The JSON value to output",
      default: {},
    }),
  },
  display: {
    icon: "📋",
    color: "#FF9800",
    category: "input",
    tags: ["input", "json"],
  },
  async run({ params }) {
    return { value: params.json };
  },
});
