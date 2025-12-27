// Input nodes
export { textInputNode, numberInputNode, jsonInputNode } from "./input";

// Output nodes
export { outputNode, debugNode } from "./output";

// Transform nodes
export {
  templateNode,
  jsonParseNode,
  jsonStringifyNode,
  getPropertyNode,
} from "./transform";

// AI nodes
export { llmNode, promptBuilderNode } from "./ai";

// All built-in nodes
import { textInputNode, numberInputNode, jsonInputNode } from "./input";
import { outputNode, debugNode } from "./output";
import {
  templateNode,
  jsonParseNode,
  jsonStringifyNode,
  getPropertyNode,
} from "./transform";
import { llmNode, promptBuilderNode } from "./ai";
import { registerNode } from "../registry";

export const builtinNodes = [
  // Input
  textInputNode,
  numberInputNode,
  jsonInputNode,
  // Output
  outputNode,
  debugNode,
  // Transform
  templateNode,
  jsonParseNode,
  jsonStringifyNode,
  getPropertyNode,
  // AI
  llmNode,
  promptBuilderNode,
];

/**
 * Register all built-in nodes
 */
export function registerBuiltinNodes(): void {
  for (const node of builtinNodes) {
    registerNode(node);
  }
}
