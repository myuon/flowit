import { defineNode, io, param } from "../defineNode";

/**
 * LLM Node (placeholder - actual implementation requires API integration)
 */
export const llmNode = defineNode({
  id: "llm",
  displayName: "LLM",
  description: "Calls a Large Language Model API",
  inputs: {
    prompt: io.string({ description: "The prompt to send", required: true }),
    systemPrompt: io.string({ description: "System prompt (optional)" }),
  },
  outputs: {
    response: io.string({ description: "The LLM response" }),
    usage: io.object(
      {
        promptTokens: { type: "number" },
        completionTokens: { type: "number" },
        totalTokens: { type: "number" },
      },
      { description: "Token usage" }
    ),
  },
  paramsSchema: {
    model: param.select(
      "Model",
      [
        { label: "GPT-4", value: "gpt-4" },
        { label: "GPT-4 Turbo", value: "gpt-4-turbo" },
        { label: "GPT-3.5 Turbo", value: "gpt-3.5-turbo" },
        { label: "Claude 3 Opus", value: "claude-3-opus" },
        { label: "Claude 3 Sonnet", value: "claude-3-sonnet" },
      ],
      { default: "gpt-4", description: "The model to use" }
    ),
    apiKey: param.secret("API Key", {
      description: "API key for the LLM provider",
    }),
    temperature: param.number("Temperature", {
      description: "Sampling temperature (0-2)",
      min: 0,
      max: 2,
      step: 0.1,
      default: 0.7,
    }),
    maxTokens: param.number("Max Tokens", {
      description: "Maximum tokens in response",
      min: 1,
      max: 4096,
      default: 1024,
    }),
  },
  display: {
    icon: "🤖",
    color: "#00BCD4",
    category: "ai",
    tags: ["llm", "ai", "gpt", "claude"],
  },
  async run({ inputs, params, context }) {
    // Placeholder implementation - actual API call would go here
    context.log(`Calling LLM: ${params.model}`);

    // This is a mock response - real implementation would call the API
    return {
      response: `[Mock LLM Response for model ${params.model}]\nPrompt: ${inputs.prompt}`,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
    };
  },
});

/**
 * Prompt Builder Node
 */
export const promptBuilderNode = defineNode({
  id: "prompt-builder",
  displayName: "Prompt Builder",
  description: "Builds a prompt from components",
  inputs: {
    context: io.string({ description: "Context information" }),
    userInput: io.string({ description: "User input", required: true }),
    examples: io.array(io.string(), { description: "Few-shot examples" }),
  },
  outputs: {
    prompt: io.string({ description: "The constructed prompt" }),
  },
  paramsSchema: {
    systemTemplate: param.string("System Template", {
      description: "System prompt template",
      multiline: true,
      default: "You are a helpful assistant.",
    }),
    includeContext: param.boolean("Include Context", {
      description: "Include context in prompt",
      default: true,
    }),
  },
  display: {
    icon: "✍️",
    color: "#3F51B5",
    category: "ai",
    tags: ["prompt", "ai"],
  },
  async run({ inputs, params }) {
    const parts: string[] = [];

    if (params.systemTemplate) {
      parts.push(`System: ${params.systemTemplate}`);
    }

    if (params.includeContext && inputs.context) {
      parts.push(`Context: ${inputs.context}`);
    }

    const examples = inputs.examples as string[] | undefined;
    if (examples && examples.length > 0) {
      parts.push(`Examples:\n${examples.join("\n")}`);
    }

    parts.push(`User: ${inputs.userInput}`);

    return { prompt: parts.join("\n\n") };
  },
});
