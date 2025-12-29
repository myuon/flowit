import { defineNode, io, param } from "../defineNode";

/**
 * Slack Message Node
 * Sends a message to Slack via webhook or API
 */
export const slackMessageNode = defineNode({
  id: "slack-message",
  displayName: "Slack Message",
  description: "Sends a message to a Slack channel",
  inputs: {
    text: io.string({ description: "Message text", required: true }),
    blocks: io.array(io.any(), {
      description: "Slack Block Kit blocks (optional)",
    }),
  },
  outputs: {
    success: io.boolean({
      description: "Whether the message was sent successfully",
    }),
    response: io.any({ description: "Slack API response" }),
  },
  paramsSchema: {
    method: param.select(
      "Method",
      [
        { label: "Webhook", value: "webhook" },
        { label: "Bot Token", value: "bot" },
      ],
      { default: "webhook", description: "How to send the message" }
    ),
    webhookUrl: param.secret("Webhook URL", {
      description: "Slack Incoming Webhook URL",
    }),
    botToken: param.secret("Bot Token", {
      description: "Slack Bot OAuth Token (xoxb-...)",
    }),
    channel: param.string("Channel", {
      description: "Channel ID or name (for Bot Token method)",
      placeholder: "#general or C01234567",
    }),
    username: param.string("Username", {
      description: "Override the bot username",
      placeholder: "Flowit Bot",
    }),
    iconEmoji: param.string("Icon Emoji", {
      description: "Override the bot icon with an emoji",
      placeholder: ":robot_face:",
    }),
    unfurlLinks: param.boolean("Unfurl Links", {
      description: "Enable link previews",
      default: true,
    }),
  },
  display: {
    icon: "💬",
    color: "#4A154B",
    category: "integration",
    tags: ["slack", "notification", "message", "chat"],
  },
  async run({ inputs, params, context }) {
    const text = inputs.text;
    const blocks = inputs.blocks as unknown[] | undefined;

    if (params.method === "webhook") {
      // Webhook method
      if (!params.webhookUrl) {
        throw new Error("Webhook URL is required for webhook method");
      }

      const payload: Record<string, unknown> = {
        text,
        unfurl_links: params.unfurlLinks,
      };

      if (blocks && blocks.length > 0) {
        payload.blocks = blocks;
      }

      if (params.username) {
        payload.username = params.username;
      }

      if (params.iconEmoji) {
        payload.icon_emoji = params.iconEmoji;
      }

      context.log(`Sending Slack message via webhook`);

      const response = await fetch(params.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: context.signal,
      });

      const responseText = await response.text();

      if (!response.ok || responseText !== "ok") {
        throw new Error(`Slack webhook error: ${responseText}`);
      }

      return {
        success: true,
        response: { ok: true },
      };
    } else {
      // Bot Token method
      if (!params.botToken) {
        throw new Error("Bot Token is required for bot method");
      }

      if (!params.channel) {
        throw new Error("Channel is required for bot method");
      }

      const payload: Record<string, unknown> = {
        channel: params.channel,
        text,
        unfurl_links: params.unfurlLinks,
      };

      if (blocks && blocks.length > 0) {
        payload.blocks = blocks;
      }

      if (params.username) {
        payload.username = params.username;
      }

      if (params.iconEmoji) {
        payload.icon_emoji = params.iconEmoji;
      }

      context.log(`Sending Slack message to ${params.channel}`);

      const response = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${params.botToken}`,
        },
        body: JSON.stringify(payload),
        signal: context.signal,
      });

      const data = (await response.json()) as { ok: boolean; error?: string };

      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
      }

      return {
        success: true,
        response: data,
      };
    }
  },
});

/**
 * Slack Block Builder Node
 * Builds Slack Block Kit blocks
 */
export const slackBlockBuilderNode = defineNode({
  id: "slack-block-builder",
  displayName: "Slack Blocks",
  description: "Builds Slack Block Kit blocks for rich messages",
  inputs: {
    data: io.any({ description: "Data to use in block templates" }),
  },
  outputs: {
    blocks: io.array(io.any(), { description: "Slack Block Kit blocks" }),
  },
  paramsSchema: {
    blockType: param.select(
      "Block Type",
      [
        { label: "Section", value: "section" },
        { label: "Header", value: "header" },
        { label: "Divider", value: "divider" },
        { label: "Custom JSON", value: "custom" },
      ],
      { default: "section" }
    ),
    text: param.string("Text", {
      description: "Block text (supports {{data.field}} substitution)",
      multiline: true,
      placeholder: "Hello, {{data.name}}!",
    }),
    customBlocks: param.json("Custom Blocks", {
      description: "Custom Block Kit JSON array",
      default: [],
    }),
  },
  display: {
    icon: "🧱",
    color: "#611f69",
    category: "integration",
    tags: ["slack", "blocks", "builder"],
  },
  async run({ inputs, params }) {
    if (params.blockType === "custom") {
      return { blocks: params.customBlocks as unknown[] };
    }

    if (params.blockType === "divider") {
      return { blocks: [{ type: "divider" }] };
    }

    // Process text with data substitution
    let text = params.text || "";
    const data = inputs.data as Record<string, unknown> | undefined;

    if (data) {
      const flattenData = (
        obj: Record<string, unknown>,
        prefix = ""
      ): Record<string, unknown> => {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
          const newKey = prefix ? `${prefix}.${key}` : key;
          if (value && typeof value === "object" && !Array.isArray(value)) {
            Object.assign(
              result,
              flattenData(value as Record<string, unknown>, newKey)
            );
          } else {
            result[newKey] = value;
          }
        }
        return result;
      };

      const flattened = flattenData(data);
      for (const [key, value] of Object.entries(flattened)) {
        text = text.replace(
          new RegExp(`{{\\s*data\\.${key}\\s*}}`, "g"),
          String(value)
        );
      }
    }

    if (params.blockType === "header") {
      return {
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text,
              emoji: true,
            },
          },
        ],
      };
    }

    // Section block
    return {
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text,
          },
        },
      ],
    };
  },
});
