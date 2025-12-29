import { defineNode, io, param } from "../defineNode";

interface DriveFile {
  id: string;
  name: string;
}

interface DriveFilesResponse {
  files: DriveFile[];
  nextPageToken?: string;
}

interface Deployment {
  deploymentId: string;
  deploymentConfig?: {
    scriptId?: string;
    versionNumber?: number;
    description?: string;
  };
}

interface DeploymentsResponse {
  deployments?: Deployment[];
}

/**
 * Find the script ID that contains the given deployment ID
 */
async function findScriptIdForDeployment(
  deploymentId: string,
  accessToken: string,
  signal?: AbortSignal
): Promise<{ scriptId: string; scriptName: string } | null> {
  // First, list all Apps Script files using Drive API
  const driveUrl = new URL("https://www.googleapis.com/drive/v3/files");
  driveUrl.searchParams.set(
    "q",
    "mimeType='application/vnd.google-apps.script'"
  );
  driveUrl.searchParams.set("fields", "files(id,name),nextPageToken");
  driveUrl.searchParams.set("pageSize", "100");

  const driveResponse = await fetch(driveUrl.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    signal,
  });

  if (!driveResponse.ok) {
    if (driveResponse.status === 401) {
      throw new Error(
        "Access token is invalid or expired. Please re-authenticate with Google."
      );
    }
    throw new Error(
      `Failed to list Apps Script files: ${driveResponse.status} ${driveResponse.statusText}`
    );
  }

  const driveData = (await driveResponse.json()) as DriveFilesResponse;
  const scriptFiles = driveData.files || [];

  if (scriptFiles.length === 0) {
    throw new Error(
      "No Apps Script files found in your Google Drive. Please make sure you have access to the script containing this deployment."
    );
  }

  // Check each script for the deployment
  for (const file of scriptFiles) {
    const deploymentsUrl = `https://script.googleapis.com/v1/projects/${file.id}/deployments`;

    const deploymentsResponse = await fetch(deploymentsUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal,
    });

    if (!deploymentsResponse.ok) {
      // Skip scripts we can't access
      continue;
    }

    const deploymentsData =
      (await deploymentsResponse.json()) as DeploymentsResponse;
    const deployments = deploymentsData.deployments || [];

    const found = deployments.find((d) => d.deploymentId === deploymentId);
    if (found) {
      return { scriptId: file.id, scriptName: file.name };
    }
  }

  return null;
}

/**
 * Google Apps Script Node
 * Executes a deployed Google Apps Script web app
 */
export const gasNode = defineNode({
  id: "gas",
  displayName: "Google Apps Script",
  description: "Executes a deployed Google Apps Script web app",
  inputs: {
    parameters: io.any({
      description: "Parameters to pass to the GAS function (sent as JSON body)",
    }),
  },
  outputs: {
    result: io.any({ description: "Return value from the GAS function" }),
  },
  paramsSchema: {
    deploymentId: param.string("Deployment ID", {
      description: "The deployment ID of the GAS web app",
      placeholder: "AKfycb...xyz",
      required: true,
    }),
    accessToken: param.secret("Access Token", {
      description: "Google OAuth access token (use _google_access_token)",
    }),
  },
  display: {
    icon: "📜",
    color: "#4285F4",
    category: "integration",
    tags: ["google", "apps-script", "gas", "automation"],
  },
  async run({ inputs, params, context }) {
    if (!params.accessToken) {
      throw new Error(
        "Google access token is required. Please authenticate with Google first."
      );
    }

    if (!params.deploymentId) {
      throw new Error("Deployment ID is required");
    }

    context.log(`Validating deployment: ${params.deploymentId}`);

    // Validate that the deployment exists and is accessible
    const scriptInfo = await findScriptIdForDeployment(
      params.deploymentId,
      params.accessToken,
      context.signal
    );

    if (!scriptInfo) {
      throw new Error(
        `Deployment not found: ${params.deploymentId}. ` +
          "Please verify that:\n" +
          "1. The deployment ID is correct\n" +
          "2. You have access to the script containing this deployment\n" +
          "3. The script is deployed as a Web App"
      );
    }

    context.log(
      `Found script: ${scriptInfo.scriptName} (${scriptInfo.scriptId})`
    );

    // Build the Web App URL
    const url = `https://script.google.com/macros/s/${params.deploymentId}/exec`;

    context.log(`Executing GAS web app`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(inputs.parameters ?? {}),
      signal: context.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `GAS execution failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    // Try to parse as JSON, fall back to text
    const contentType = response.headers.get("content-type") || "";
    let result: unknown;

    if (contentType.includes("application/json")) {
      result = await response.json();
    } else {
      result = await response.text();
    }

    context.log("GAS execution completed");

    return {
      result,
    };
  },
});
