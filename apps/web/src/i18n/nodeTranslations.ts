import type { Language } from "@flowit/shared";

export interface NodeParamTranslation {
  label?: string;
  description?: string;
  options?: Record<string, string>;
}

export interface NodeTranslation {
  displayName: string;
  description: string;
  params?: Record<string, NodeParamTranslation>;
}

export interface NodeTranslationsData {
  categories: Record<string, string>;
  nodes: Record<string, NodeTranslation>;
}

const en: NodeTranslationsData = {
  categories: {
    input: "Input",
    output: "Output",
    transform: "Transform",
    ai: "AI",
    integration: "Integration",
    control: "Control",
    utility: "Utility",
  },
  nodes: {
    // Input nodes
    "text-input": {
      displayName: "Text Input",
      description: "Provides a text value as input to the workflow",
      params: {
        text: { label: "Text", description: "The text to output" },
      },
    },
    "number-input": {
      displayName: "Number Input",
      description: "Provides a number value as input to the workflow",
      params: {
        number: { label: "Number", description: "The number to output" },
      },
    },
    "json-input": {
      displayName: "JSON Input",
      description: "Provides a JSON object as input to the workflow",
      params: {
        json: { label: "JSON", description: "The JSON value to output" },
      },
    },
    "webhook-trigger": {
      displayName: "Webhook Trigger",
      description:
        "Triggers workflow when an external HTTP request is received",
      params: {
        method: {
          label: "Allowed Method",
          description: "The HTTP method this webhook accepts",
          options: { GET: "GET", POST: "POST" },
        },
        executionType: {
          label: "Execution Type",
          description: "Sync waits for result (up to 30s), Async returns immediately",
          options: { sync: "Sync", async: "Async" },
        },
      },
    },
    // Output nodes
    output: {
      displayName: "Output",
      description: "Marks the output of the workflow",
    },
    debug: {
      displayName: "Debug",
      description: "Logs the value and passes it through",
    },
    // Transform nodes
    template: {
      displayName: "Template",
      description: "Renders a template string with variable substitution",
      params: {
        template: {
          label: "Template",
          description: "Template string with {{variable}} placeholders",
        },
      },
    },
    "json-parse": {
      displayName: "JSON Parse",
      description: "Parses a JSON string into an object",
    },
    "json-stringify": {
      displayName: "JSON Stringify",
      description: "Converts a value to a JSON string",
      params: {
        pretty: {
          label: "Pretty Print",
          description: "Format with indentation",
        },
      },
    },
    "get-property": {
      displayName: "Get Property",
      description: "Gets a property from an object using a path",
      params: {
        path: {
          label: "Path",
          description: "Property path (e.g., 'user.name' or 'items[0].id')",
        },
      },
    },
    "js-transform": {
      displayName: "JS Transform",
      description: "Transforms data using a JavaScript expression",
      params: {
        expression: {
          label: "Expression",
          description:
            "JavaScript expression. Use `data` for input, `ctx` for context.",
        },
      },
    },
    map: {
      displayName: "Map",
      description: "Maps over an array and transforms each element",
      params: {
        expression: {
          label: "Expression",
          description:
            "JavaScript expression for each item. Use `item` for current element.",
        },
      },
    },
    filter: {
      displayName: "Filter",
      description: "Filters an array based on a condition",
      params: {
        condition: {
          label: "Condition",
          description:
            "JavaScript condition for each item. Use `item` for current element.",
        },
      },
    },
    // AI nodes
    llm: {
      displayName: "LLM",
      description: "Calls a Large Language Model API",
      params: {
        model: { label: "Model", description: "The model to use" },
        apiKey: {
          label: "API Key",
          description: "API key for the LLM provider",
        },
        temperature: {
          label: "Temperature",
          description: "Sampling temperature (0-2)",
        },
        maxTokens: {
          label: "Max Tokens",
          description: "Maximum tokens in response",
        },
      },
    },
    "prompt-builder": {
      displayName: "Prompt Builder",
      description: "Builds a prompt from components",
      params: {
        systemTemplate: {
          label: "System Template",
          description: "System prompt template",
        },
        includeContext: {
          label: "Include Context",
          description: "Include context in prompt",
        },
      },
    },
    // Integration nodes
    "http-request": {
      displayName: "HTTP Request",
      description: "Makes an HTTP request to an external API",
      params: {
        url: { label: "URL", description: "The URL to request" },
        method: {
          label: "Method",
          options: {
            GET: "GET",
            POST: "POST",
            PUT: "PUT",
            PATCH: "PATCH",
            DELETE: "DELETE",
          },
        },
        contentType: {
          label: "Content-Type",
          options: {
            "application/json": "JSON",
            "application/x-www-form-urlencoded": "Form",
            "text/plain": "Text",
            "": "None",
          },
        },
        authType: {
          label: "Auth Type",
          options: {
            none: "None",
            bearer: "Bearer Token",
            basic: "Basic Auth",
            "api-key": "API Key Header",
          },
        },
        authValue: {
          label: "Auth Value",
          description: "Token, password, or API key",
        },
        authUsername: {
          label: "Username",
          description: "Username for Basic Auth",
        },
        apiKeyHeader: {
          label: "API Key Header",
          description: "Header name for API key",
        },
        timeout: {
          label: "Timeout (ms)",
          description: "Request timeout in milliseconds",
        },
      },
    },
    "slack-message": {
      displayName: "Slack Message",
      description: "Sends a message to a Slack channel",
      params: {
        method: {
          label: "Method",
          description: "How to send the message",
          options: { webhook: "Webhook", bot: "Bot Token" },
        },
        webhookUrl: {
          label: "Webhook URL",
          description: "Slack Incoming Webhook URL",
        },
        botToken: {
          label: "Bot Token",
          description: "Slack Bot OAuth Token",
        },
        channel: { label: "Channel", description: "Channel ID or name" },
        username: {
          label: "Username",
          description: "Override the bot username",
        },
        iconEmoji: {
          label: "Icon Emoji",
          description: "Override the bot icon with an emoji",
        },
        unfurlLinks: {
          label: "Unfurl Links",
          description: "Enable link previews",
        },
      },
    },
    "slack-block-builder": {
      displayName: "Slack Blocks",
      description: "Builds Slack Block Kit blocks for rich messages",
      params: {
        blockType: {
          label: "Block Type",
          options: {
            section: "Section",
            header: "Header",
            divider: "Divider",
            custom: "Custom JSON",
          },
        },
        text: { label: "Text", description: "Block text" },
        customBlocks: {
          label: "Custom Blocks",
          description: "Custom Block Kit JSON array",
        },
      },
    },
    // Control nodes
    "if-condition": {
      displayName: "If Condition",
      description:
        "Evaluates a condition and routes execution to true or false branch",
      params: {
        conditionType: {
          label: "Condition Type",
          options: {
            truthy: "Truthy",
            equals: "Equals",
            not_equals: "Not Equals",
            gt: "Greater Than",
            lt: "Less Than",
            contains: "Contains",
            expression: "Custom Expression",
          },
        },
        compareValue: {
          label: "Compare Value",
          description: "Value to compare against",
        },
        expression: {
          label: "Expression",
          description:
            "JavaScript expression. Use `value` and `ctx` variables.",
        },
      },
    },
    switch: {
      displayName: "Switch",
      description:
        "Routes execution based on matching a value to multiple cases",
      params: {
        cases: { label: "Cases", description: "JSON array of case values" },
        matchPath: {
          label: "Match Path",
          description: "Path to value for matching (dot notation)",
        },
      },
    },
    merge: {
      displayName: "Merge",
      description: "Merges multiple branch inputs into a single output",
      params: {
        strategy: {
          label: "Merge Strategy",
          options: {
            first: "First Non-Null",
            last: "Last Non-Null",
            merge: "Merge Objects",
            array: "Array of All",
          },
        },
      },
    },
    // Utility nodes
    log: {
      displayName: "Log",
      description: "Logs the value to execution logs and passes it through",
    },
  },
};

const ja: NodeTranslationsData = {
  categories: {
    input: "入力",
    output: "出力",
    transform: "変換",
    ai: "AI",
    integration: "連携",
    control: "制御",
    utility: "ユーティリティ",
  },
  nodes: {
    // Input nodes
    "text-input": {
      displayName: "テキスト入力",
      description: "ワークフローへのテキスト値を入力します",
      params: {
        text: { label: "テキスト", description: "出力するテキスト" },
      },
    },
    "number-input": {
      displayName: "数値入力",
      description: "ワークフローへの数値を入力します",
      params: {
        number: { label: "数値", description: "出力する数値" },
      },
    },
    "json-input": {
      displayName: "JSON入力",
      description: "ワークフローへのJSONオブジェクトを入力します",
      params: {
        json: { label: "JSON", description: "出力するJSON値" },
      },
    },
    "webhook-trigger": {
      displayName: "Webhookトリガー",
      description: "外部からのHTTPリクエストを受信してワークフローを起動します",
      params: {
        method: {
          label: "許可メソッド",
          description: "このWebhookが受け付けるHTTPメソッド",
          options: { GET: "GET", POST: "POST" },
        },
        executionType: {
          label: "実行タイプ",
          description: "同期は結果を待機（最大30秒）、非同期は即座に返却",
          options: { sync: "同期", async: "非同期" },
        },
      },
    },
    // Output nodes
    output: {
      displayName: "出力",
      description: "ワークフローの出力を指定します",
    },
    debug: {
      displayName: "デバッグ",
      description: "値をログに出力し、そのまま通過させます",
    },
    // Transform nodes
    template: {
      displayName: "テンプレート",
      description: "変数置換でテンプレート文字列を生成します",
      params: {
        template: {
          label: "テンプレート",
          description: "{{variable}}プレースホルダー付きのテンプレート文字列",
        },
      },
    },
    "json-parse": {
      displayName: "JSONパース",
      description: "JSON文字列をオブジェクトに変換します",
    },
    "json-stringify": {
      displayName: "JSON文字列化",
      description: "値をJSON文字列に変換します",
      params: {
        pretty: {
          label: "整形出力",
          description: "インデント付きでフォーマットする",
        },
      },
    },
    "get-property": {
      displayName: "プロパティ取得",
      description: "パスを使用してオブジェクトからプロパティを取得します",
      params: {
        path: {
          label: "パス",
          description: "プロパティパス（例: 'user.name' または 'items[0].id'）",
        },
      },
    },
    "js-transform": {
      displayName: "JS変換",
      description: "JavaScript式でデータを変換します",
      params: {
        expression: {
          label: "式",
          description:
            "JavaScript式。入力には`data`、コンテキストには`ctx`を使用",
        },
      },
    },
    map: {
      displayName: "マップ",
      description: "配列の各要素を変換します",
      params: {
        expression: {
          label: "式",
          description: "各アイテムのJavaScript式。現在の要素には`item`を使用",
        },
      },
    },
    filter: {
      displayName: "フィルター",
      description: "条件に基づいて配列をフィルタリングします",
      params: {
        condition: {
          label: "条件",
          description: "各アイテムのJavaScript条件。現在の要素には`item`を使用",
        },
      },
    },
    // AI nodes
    llm: {
      displayName: "LLM",
      description: "大規模言語モデルAPIを呼び出します",
      params: {
        model: { label: "モデル", description: "使用するモデル" },
        apiKey: { label: "APIキー", description: "LLMプロバイダーのAPIキー" },
        temperature: {
          label: "温度",
          description: "サンプリング温度（0-2）",
        },
        maxTokens: {
          label: "最大トークン数",
          description: "レスポンスの最大トークン数",
        },
      },
    },
    "prompt-builder": {
      displayName: "プロンプトビルダー",
      description: "コンポーネントからプロンプトを構築します",
      params: {
        systemTemplate: {
          label: "システムテンプレート",
          description: "システムプロンプトのテンプレート",
        },
        includeContext: {
          label: "コンテキストを含める",
          description: "プロンプトにコンテキストを含める",
        },
      },
    },
    // Integration nodes
    "http-request": {
      displayName: "HTTPリクエスト",
      description: "外部APIへHTTPリクエストを送信します",
      params: {
        url: { label: "URL", description: "リクエストするURL" },
        method: {
          label: "メソッド",
          options: {
            GET: "GET",
            POST: "POST",
            PUT: "PUT",
            PATCH: "PATCH",
            DELETE: "DELETE",
          },
        },
        contentType: {
          label: "Content-Type",
          options: {
            "application/json": "JSON",
            "application/x-www-form-urlencoded": "フォーム",
            "text/plain": "テキスト",
            "": "なし",
          },
        },
        authType: {
          label: "認証タイプ",
          options: {
            none: "なし",
            bearer: "Bearerトークン",
            basic: "Basic認証",
            "api-key": "APIキーヘッダー",
          },
        },
        authValue: {
          label: "認証値",
          description: "トークン、パスワード、またはAPIキー",
        },
        authUsername: {
          label: "ユーザー名",
          description: "Basic認証のユーザー名",
        },
        apiKeyHeader: {
          label: "APIキーヘッダー",
          description: "APIキーのヘッダー名",
        },
        timeout: {
          label: "タイムアウト (ms)",
          description: "リクエストタイムアウト（ミリ秒）",
        },
      },
    },
    "slack-message": {
      displayName: "Slackメッセージ",
      description: "Slackチャンネルにメッセージを送信します",
      params: {
        method: {
          label: "メソッド",
          description: "メッセージの送信方法",
          options: { webhook: "Webhook", bot: "Botトークン" },
        },
        webhookUrl: {
          label: "Webhook URL",
          description: "Slack Incoming Webhook URL",
        },
        botToken: {
          label: "Botトークン",
          description: "Slack Bot OAuthトークン",
        },
        channel: { label: "チャンネル", description: "チャンネルIDまたは名前" },
        username: {
          label: "ユーザー名",
          description: "Botのユーザー名を上書き",
        },
        iconEmoji: {
          label: "アイコン絵文字",
          description: "Botのアイコンを絵文字で上書き",
        },
        unfurlLinks: {
          label: "リンク展開",
          description: "リンクプレビューを有効にする",
        },
      },
    },
    "slack-block-builder": {
      displayName: "Slackブロック",
      description: "リッチメッセージ用のSlack Block Kitブロックを作成します",
      params: {
        blockType: {
          label: "ブロックタイプ",
          options: {
            section: "セクション",
            header: "ヘッダー",
            divider: "区切り線",
            custom: "カスタムJSON",
          },
        },
        text: { label: "テキスト", description: "ブロックテキスト" },
        customBlocks: {
          label: "カスタムブロック",
          description: "カスタムBlock Kit JSON配列",
        },
      },
    },
    // Control nodes
    "if-condition": {
      displayName: "条件分岐",
      description:
        "条件を評価し、trueまたはfalseの分岐に実行をルーティングします",
      params: {
        conditionType: {
          label: "条件タイプ",
          options: {
            truthy: "真偽値",
            equals: "等しい",
            not_equals: "等しくない",
            gt: "より大きい",
            lt: "より小さい",
            contains: "含む",
            expression: "カスタム式",
          },
        },
        compareValue: {
          label: "比較値",
          description: "比較する値",
        },
        expression: {
          label: "式",
          description: "JavaScript式。`value`と`ctx`変数を使用",
        },
      },
    },
    switch: {
      displayName: "スイッチ",
      description: "値を複数のケースと照合して実行をルーティングします",
      params: {
        cases: { label: "ケース", description: "ケース値のJSON配列" },
        matchPath: {
          label: "マッチパス",
          description: "照合する値へのパス（ドット記法）",
        },
      },
    },
    merge: {
      displayName: "マージ",
      description: "複数の分岐入力を単一の出力にマージします",
      params: {
        strategy: {
          label: "マージ戦略",
          options: {
            first: "最初の非null値",
            last: "最後の非null値",
            merge: "オブジェクトをマージ",
            array: "すべてを配列に",
          },
        },
      },
    },
    // Utility nodes
    log: {
      displayName: "ログ",
      description: "値を実行ログに記録し、そのまま通過させます",
    },
  },
};

const translations: Record<Language, NodeTranslationsData> = { en, ja };

export function getNodeTranslations(language: Language): NodeTranslationsData {
  return translations[language] || translations.en;
}

export function getNodeDisplayName(
  nodeId: string,
  language: Language,
  fallback?: string
): string {
  const t = getNodeTranslations(language);
  return t.nodes[nodeId]?.displayName || fallback || nodeId;
}

export function getNodeDescription(
  nodeId: string,
  language: Language,
  fallback?: string
): string {
  const t = getNodeTranslations(language);
  return t.nodes[nodeId]?.description || fallback || "";
}

export function getCategoryName(category: string, language: Language): string {
  const t = getNodeTranslations(language);
  return t.categories[category] || category;
}

export function getParamLabel(
  nodeId: string,
  paramKey: string,
  language: Language,
  fallback?: string
): string {
  const t = getNodeTranslations(language);
  return t.nodes[nodeId]?.params?.[paramKey]?.label || fallback || paramKey;
}

export function getParamDescription(
  nodeId: string,
  paramKey: string,
  language: Language,
  fallback?: string
): string {
  const t = getNodeTranslations(language);
  return t.nodes[nodeId]?.params?.[paramKey]?.description || fallback || "";
}

export function getParamOptionLabel(
  nodeId: string,
  paramKey: string,
  optionValue: string,
  language: Language,
  fallback?: string
): string {
  const t = getNodeTranslations(language);
  return (
    t.nodes[nodeId]?.params?.[paramKey]?.options?.[optionValue] ||
    fallback ||
    optionValue
  );
}
