import { defineNode, io } from "../defineNode";

/**
 * Output Node
 * Captures the final output of the workflow
 */
export const outputNode = defineNode({
  id: "output",
  displayName: "Output",
  description: "Marks the output of the workflow",
  inputs: {
    value: io.any({ description: "The value to output", required: true }),
  },
  outputs: {
    result: io.any({ description: "The output value" }),
  },
  paramsSchema: {},
  display: {
    icon: "📤",
    color: "#9C27B0",
    category: "output",
    tags: ["output"],
  },
  async run({ inputs }) {
    return { result: inputs.value };
  },
});

/**
 * Debug Output Node
 * Logs value to console and passes through
 */
export const debugNode = defineNode({
  id: "debug",
  displayName: "Debug",
  description: "Logs the value and passes it through",
  inputs: {
    value: io.any({ description: "The value to debug", required: true }),
  },
  outputs: {
    value: io.any({ description: "Pass-through value" }),
  },
  paramsSchema: {},
  display: {
    icon: "🐛",
    color: "#607D8B",
    category: "output",
    tags: ["debug", "logging"],
  },
  async run({ inputs, context }) {
    context.log(`[Debug ${context.nodeId}]: ${JSON.stringify(inputs.value)}`);
    return { value: inputs.value };
  },
});
