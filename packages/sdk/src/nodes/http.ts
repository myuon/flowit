import { defineNode, io, param } from "../defineNode";

/**
 * HTTP Request Node
 * Makes HTTP requests to external APIs
 */
export const httpRequestNode = defineNode({
  id: "http-request",
  displayName: "HTTP Request",
  description: "Makes an HTTP request to an external API",
  inputs: {
    body: io.any({ description: "Request body (for POST/PUT/PATCH)" }),
    headers: io.object({}, { description: "Additional headers to include" }),
    queryParams: io.object({}, { description: "Query parameters" }),
  },
  outputs: {
    data: io.any({ description: "Response data (parsed JSON or text)" }),
    status: io.number({ description: "HTTP status code" }),
    headers: io.object({}, { description: "Response headers" }),
  },
  paramsSchema: {
    url: param.string("URL", {
      description: "The URL to request",
      placeholder: "https://api.example.com/endpoint",
      required: true,
    }),
    method: param.select(
      "Method",
      [
        { label: "GET", value: "GET" },
        { label: "POST", value: "POST" },
        { label: "PUT", value: "PUT" },
        { label: "PATCH", value: "PATCH" },
        { label: "DELETE", value: "DELETE" },
      ],
      { default: "GET" }
    ),
    contentType: param.select(
      "Content-Type",
      [
        { label: "JSON", value: "application/json" },
        { label: "Form", value: "application/x-www-form-urlencoded" },
        { label: "Text", value: "text/plain" },
        { label: "None", value: "" },
      ],
      { default: "application/json" }
    ),
    authType: param.select(
      "Auth Type",
      [
        { label: "None", value: "none" },
        { label: "Bearer Token", value: "bearer" },
        { label: "Basic Auth", value: "basic" },
        { label: "API Key Header", value: "api-key" },
      ],
      { default: "none" }
    ),
    authValue: param.secret("Auth Value", {
      description: "Token, password, or API key",
    }),
    authUsername: param.string("Username", {
      description: "Username for Basic Auth",
    }),
    apiKeyHeader: param.string("API Key Header", {
      description: "Header name for API key (e.g., X-API-Key)",
      default: "X-API-Key",
    }),
    timeout: param.number("Timeout (ms)", {
      description: "Request timeout in milliseconds",
      default: 30000,
      min: 1000,
      max: 120000,
    }),
  },
  display: {
    icon: "🌐",
    color: "#2196F3",
    category: "integration",
    tags: ["http", "api", "request", "fetch"],
  },
  async run({ inputs, params, context }) {
    // Build URL with query params
    let url = params.url;
    const queryParams = inputs.queryParams as Record<string, string> | undefined;
    if (queryParams && Object.keys(queryParams).length > 0) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(queryParams)) {
        searchParams.append(key, String(value));
      }
      url += (url.includes("?") ? "&" : "?") + searchParams.toString();
    }

    // Build headers
    const headers: Record<string, string> = {};

    if (params.contentType) {
      headers["Content-Type"] = params.contentType;
    }

    // Add auth headers
    if (params.authType === "bearer" && params.authValue) {
      headers["Authorization"] = `Bearer ${params.authValue}`;
    } else if (params.authType === "basic" && params.authUsername && params.authValue) {
      const encoded = Buffer.from(`${params.authUsername}:${params.authValue}`).toString("base64");
      headers["Authorization"] = `Basic ${encoded}`;
    } else if (params.authType === "api-key" && params.authValue) {
      headers[params.apiKeyHeader || "X-API-Key"] = params.authValue;
    }

    // Merge with input headers
    const inputHeaders = inputs.headers as Record<string, string> | undefined;
    if (inputHeaders) {
      Object.assign(headers, inputHeaders);
    }

    // Prepare request options
    const options: RequestInit = {
      method: params.method,
      headers,
      signal: context.signal,
    };

    // Add body for non-GET requests
    if (params.method !== "GET" && inputs.body !== undefined) {
      if (params.contentType === "application/json") {
        options.body = JSON.stringify(inputs.body);
      } else if (params.contentType === "application/x-www-form-urlencoded") {
        const formData = new URLSearchParams();
        for (const [key, value] of Object.entries(inputs.body as Record<string, unknown>)) {
          formData.append(key, String(value));
        }
        options.body = formData.toString();
      } else {
        options.body = String(inputs.body);
      }
    }

    context.log(`HTTP ${params.method} ${url}`);

    // Make request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), params.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse response
      const contentType = response.headers.get("content-type") || "";
      let data: unknown;

      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // Convert headers to object
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      context.log(`Response: ${response.status}`);

      return {
        data,
        status: response.status,
        headers: responseHeaders,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  },
});
