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
  jsTransformNode,
  mapNode,
  filterNode,
} from "./transform";

// AI nodes
export { llmNode, promptBuilderNode } from "./ai";

// Integration nodes
export { httpRequestNode } from "./http";
export { slackMessageNode, slackBlockBuilderNode } from "./slack";

// All built-in nodes
import { textInputNode, numberInputNode, jsonInputNode } from "./input";
import { outputNode, debugNode } from "./output";
import {
  templateNode,
  jsonParseNode,
  jsonStringifyNode,
  getPropertyNode,
  jsTransformNode,
  mapNode,
  filterNode,
} from "./transform";
import { llmNode, promptBuilderNode } from "./ai";
import { httpRequestNode } from "./http";
import { slackMessageNode, slackBlockBuilderNode } from "./slack";
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
  jsTransformNode,
  mapNode,
  filterNode,
  // AI
  llmNode,
  promptBuilderNode,
  // Integration
  httpRequestNode,
  slackMessageNode,
  slackBlockBuilderNode,
];

/**
 * Register all built-in nodes
 */
export function registerBuiltinNodes(): void {
  for (const node of builtinNodes) {
    registerNode(node);
  }
}
