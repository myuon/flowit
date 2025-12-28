import { defineNode, io } from "../defineNode";

/**
 * Log Node
 * Logs the input value to the execution log database and passes it through
 */
export const logNode = defineNode({
  id: "log",
  displayName: "Log",
  description: "Logs the value to execution logs and passes it through",
  inputs: {
    value: io.any({ description: "The value to log", required: true }),
  },
  outputs: {
    value: io.any({ description: "Pass-through value" }),
  },
  paramsSchema: {},
  display: {
    icon: "📝",
    color: "#4CAF50",
    category: "utility",
    tags: ["log", "logging", "debug"],
  },
  async run({ inputs, context }) {
    // Log to console
    context.log(`[Log ${context.nodeId}]: ${JSON.stringify(inputs.value)}`);

    // Write to execution log database if available
    if (context.writeLog) {
      await context.writeLog(inputs.value);
    }

    // Pass through the value
    return { value: inputs.value };
  },
});
