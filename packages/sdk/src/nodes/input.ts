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

/**
 * Webhook Trigger Node
 * Triggers workflow when external webhook is called
 */
export const webhookTriggerNode = defineNode({
  id: "webhook-trigger",
  displayName: "Webhook Trigger",
  description: "Triggers workflow when an external HTTP request is received",
  inputs: {},
  outputs: {
    body: io.any({ description: "The request body" }),
    headers: io.object({}, { description: "The request headers" }),
    query: io.object({}, { description: "The query parameters" }),
    method: io.string({ description: "The HTTP method used" }),
  },
  paramsSchema: {
    name: param.string("Name", {
      description: "Unique identifier for this webhook within the workflow",
      placeholder: "my-webhook",
      required: true,
    }),
    method: param.select(
      "Allowed Method",
      [
        { label: "GET", value: "GET" },
        { label: "POST", value: "POST" },
      ],
      {
        description: "The HTTP method this webhook accepts",
        default: "POST",
      }
    ),
    executionType: param.select(
      "Execution Type",
      [
        { label: "Sync", value: "sync" },
        { label: "Async", value: "async" },
      ],
      {
        description: "Sync waits for result (up to 30s), Async returns immediately",
        default: "sync",
      }
    ),
  },
  display: {
    icon: "🔗",
    color: "#9C27B0",
    category: "input",
    tags: ["input", "webhook", "trigger", "http"],
  },
  async run({ params, context }) {
    // When triggered by actual webhook, data comes from workflowInputs._webhook
    const webhookData = context.workflowInputs?._webhook as
      | {
          body?: unknown;
          headers?: Record<string, string>;
          query?: Record<string, string>;
          method?: string;
        }
      | undefined;

    if (webhookData) {
      context.log(`Webhook trigger received (${webhookData.method})`);
      return {
        body: webhookData.body ?? {},
        headers: webhookData.headers ?? {},
        query: webhookData.query ?? {},
        method: webhookData.method ?? params.method,
      };
    }

    // For manual execution, return placeholder data
    context.log(
      `Webhook trigger (${params.method}) - waiting for external request`
    );
    return {
      body: {},
      headers: {},
      query: {},
      method: params.method,
    };
  },
});
