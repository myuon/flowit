import type { WorkflowDSL } from "@flowit/shared";

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  dsl: WorkflowDSL;
  positions: { id: string; position: { x: number; y: number } }[];
}

export const workflowTemplates: WorkflowTemplate[] = [
  {
    id: "http-transform-slack",
    name: "API → Transform → Slack",
    description: "Fetch data from an API, transform it, and send to Slack",
    icon: "🌐",
    category: "Notifications",
    dsl: {
      dslVersion: "0.1.0",
      meta: {
        name: "API to Slack",
        version: "1.0.0",
        status: "draft",
      },
      inputs: {},
      outputs: {},
      secrets: [],
      nodes: [
        {
          id: "http-1",
          type: "http-request",
          label: "Fetch API",
          params: {
            url: { type: "static", value: "https://api.example.com/data" },
            method: { type: "static", value: "GET" },
            contentType: { type: "static", value: "application/json" },
            authType: { type: "static", value: "none" },
            timeout: { type: "static", value: 30000 },
          },
          inputs: {
            body: { type: "any" },
            headers: { type: "object" },
            queryParams: { type: "object" },
          },
          outputs: {
            data: { type: "any" },
            status: { type: "number" },
            headers: { type: "object" },
          },
        },
        {
          id: "transform-1",
          type: "js-transform",
          label: "Transform Data",
          params: {
            expression: {
              type: "static",
              value: "`API returned: ${JSON.stringify(data)}`",
            },
          },
          inputs: {
            data: { type: "any", required: true },
            context: { type: "object" },
          },
          outputs: {
            result: { type: "any" },
          },
        },
        {
          id: "slack-1",
          type: "slack-message",
          label: "Send to Slack",
          params: {
            method: { type: "static", value: "webhook" },
            webhookUrl: { type: "static", value: "" },
            unfurlLinks: { type: "static", value: true },
          },
          inputs: {
            text: { type: "string", required: true },
            blocks: { type: "array" },
          },
          outputs: {
            success: { type: "boolean" },
            response: { type: "any" },
          },
        },
      ],
      edges: [
        {
          id: "e1",
          source: "http-1",
          target: "transform-1",
          sourceHandle: "data",
          targetHandle: "data",
        },
        {
          id: "e2",
          source: "transform-1",
          target: "slack-1",
          sourceHandle: "result",
          targetHandle: "text",
        },
      ],
    },
    positions: [
      { id: "http-1", position: { x: 100, y: 150 } },
      { id: "transform-1", position: { x: 350, y: 150 } },
      { id: "slack-1", position: { x: 600, y: 150 } },
    ],
  },
  {
    id: "llm-chat",
    name: "LLM Chat",
    description: "Simple LLM conversation with text input and output",
    icon: "🤖",
    category: "AI",
    dsl: {
      dslVersion: "0.1.0",
      meta: {
        name: "LLM Chat",
        version: "1.0.0",
        status: "draft",
      },
      inputs: {},
      outputs: {},
      secrets: [],
      nodes: [
        {
          id: "input-1",
          type: "text-input",
          label: "User Input",
          params: {
            value: { type: "static", value: "Hello, how are you?" },
          },
          inputs: {},
          outputs: {
            value: { type: "string" },
          },
        },
        {
          id: "llm-1",
          type: "llm",
          label: "AI Response",
          params: {
            model: { type: "static", value: "gpt-4o-mini" },
            systemPrompt: {
              type: "static",
              value: "You are a helpful assistant.",
            },
            temperature: { type: "static", value: 0.7 },
            maxTokens: { type: "static", value: 1000 },
          },
          inputs: {
            prompt: { type: "string", required: true },
            context: { type: "object" },
          },
          outputs: {
            response: { type: "string" },
            usage: { type: "object" },
          },
        },
        {
          id: "output-1",
          type: "output",
          label: "Result",
          params: {
            name: { type: "static", value: "response" },
          },
          inputs: {
            value: { type: "any", required: true },
          },
          outputs: {},
        },
      ],
      edges: [
        {
          id: "e1",
          source: "input-1",
          target: "llm-1",
          sourceHandle: "value",
          targetHandle: "prompt",
        },
        {
          id: "e2",
          source: "llm-1",
          target: "output-1",
          sourceHandle: "response",
          targetHandle: "value",
        },
      ],
    },
    positions: [
      { id: "input-1", position: { x: 100, y: 150 } },
      { id: "llm-1", position: { x: 350, y: 150 } },
      { id: "output-1", position: { x: 600, y: 150 } },
    ],
  },
  {
    id: "json-template-debug",
    name: "JSON → Template → Debug",
    description: "Process JSON data with a template and output for debugging",
    icon: "📝",
    category: "Data Processing",
    dsl: {
      dslVersion: "0.1.0",
      meta: {
        name: "JSON Template",
        version: "1.0.0",
        status: "draft",
      },
      inputs: {},
      outputs: {},
      secrets: [],
      nodes: [
        {
          id: "json-1",
          type: "json-input",
          label: "JSON Data",
          params: {
            value: { type: "static", value: { name: "World", count: 42 } },
          },
          inputs: {},
          outputs: {
            value: { type: "any" },
          },
        },
        {
          id: "template-1",
          type: "template",
          label: "Format Message",
          params: {
            template: {
              type: "static",
              value: "Hello, {{name}}! Count is {{count}}.",
            },
          },
          inputs: {
            variables: { type: "object" },
          },
          outputs: {
            result: { type: "string" },
          },
        },
        {
          id: "debug-1",
          type: "debug",
          label: "Debug Output",
          params: {
            label: { type: "static", value: "Result" },
          },
          inputs: {
            value: { type: "any", required: true },
          },
          outputs: {
            value: { type: "any" },
          },
        },
      ],
      edges: [
        {
          id: "e1",
          source: "json-1",
          target: "template-1",
          sourceHandle: "value",
          targetHandle: "variables",
        },
        {
          id: "e2",
          source: "template-1",
          target: "debug-1",
          sourceHandle: "result",
          targetHandle: "value",
        },
      ],
    },
    positions: [
      { id: "json-1", position: { x: 100, y: 150 } },
      { id: "template-1", position: { x: 350, y: 150 } },
      { id: "debug-1", position: { x: 600, y: 150 } },
    ],
  },
  {
    id: "conditional-flow",
    name: "Conditional Branch",
    description: "Branch workflow based on a condition",
    icon: "🔀",
    category: "Control Flow",
    dsl: {
      dslVersion: "0.1.0",
      meta: {
        name: "Conditional Flow",
        version: "1.0.0",
        status: "draft",
      },
      inputs: {},
      outputs: {},
      secrets: [],
      nodes: [
        {
          id: "number-1",
          type: "number-input",
          label: "Input Value",
          params: {
            value: { type: "static", value: 50 },
          },
          inputs: {},
          outputs: {
            value: { type: "number" },
          },
        },
        {
          id: "if-1",
          type: "if-condition",
          label: "Check Value",
          params: {
            condition: { type: "static", value: "value > 10" },
          },
          inputs: {
            value: { type: "any", required: true },
          },
          outputs: {
            true: { type: "any" },
            false: { type: "any" },
          },
        },
        {
          id: "debug-true",
          type: "debug",
          label: "Value > 10",
          params: {
            label: { type: "static", value: "Large" },
          },
          inputs: {
            value: { type: "any", required: true },
          },
          outputs: {
            value: { type: "any" },
          },
        },
        {
          id: "debug-false",
          type: "debug",
          label: "Value <= 10",
          params: {
            label: { type: "static", value: "Small" },
          },
          inputs: {
            value: { type: "any", required: true },
          },
          outputs: {
            value: { type: "any" },
          },
        },
      ],
      edges: [
        {
          id: "e1",
          source: "number-1",
          target: "if-1",
          sourceHandle: "value",
          targetHandle: "value",
        },
        {
          id: "e2",
          source: "if-1",
          target: "debug-true",
          sourceHandle: "true",
          targetHandle: "value",
        },
        {
          id: "e3",
          source: "if-1",
          target: "debug-false",
          sourceHandle: "false",
          targetHandle: "value",
        },
      ],
    },
    positions: [
      { id: "number-1", position: { x: 100, y: 200 } },
      { id: "if-1", position: { x: 350, y: 200 } },
      { id: "debug-true", position: { x: 600, y: 100 } },
      { id: "debug-false", position: { x: 600, y: 300 } },
    ],
  },
];

export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return workflowTemplates.find((t) => t.id === id);
}

export function getTemplatesByCategory(): Record<string, WorkflowTemplate[]> {
  return workflowTemplates.reduce(
    (acc, template) => {
      if (!acc[template.category]) {
        acc[template.category] = [];
      }
      acc[template.category].push(template);
      return acc;
    },
    {} as Record<string, WorkflowTemplate[]>
  );
}
