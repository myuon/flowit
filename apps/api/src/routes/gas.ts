import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { AuthVariables } from "../auth";
import { userTokenRepository } from "../db/repository";
import { validateGasDeploymentSchema } from "./schemas";

export function createGasRoutes() {
  const router = new Hono<{ Variables: AuthVariables }>();

  // Validate GAS deployment
  router.post(
    "/validate-deployment",
    zValidator("json", validateGasDeploymentSchema),
    async (c) => {
      const user = c.get("user");
      const { deploymentId } = c.req.valid("json");

      // Get user's Google access token
      const googleToken = await userTokenRepository.findByUserAndProvider(
        user.sub,
        "google"
      );
      if (!googleToken) {
        return c.json(
          { error: "Google authentication required. Please re-login." },
          401
        );
      }

      const accessToken = googleToken.accessToken;

      try {
        // List all Apps Script files using Drive API
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
        });

        if (!driveResponse.ok) {
          if (driveResponse.status === 401) {
            return c.json({
              valid: false,
              error:
                "Access token is invalid or expired. Please re-authenticate with Google.",
            });
          }
          return c.json({
            valid: false,
            error: `Failed to list Apps Script files: ${driveResponse.status} ${driveResponse.statusText}`,
          });
        }

        const driveData = (await driveResponse.json()) as {
          files?: Array<{ id: string; name: string }>;
        };
        const scriptFiles = driveData.files || [];

        if (scriptFiles.length === 0) {
          return c.json({
            valid: false,
            error: "No Apps Script files found in your Google Drive.",
          });
        }

        // Check each script for the deployment
        const checkedScripts: string[] = [];
        const skippedScripts: string[] = [];

        for (const file of scriptFiles) {
          const deploymentsUrl = `https://script.googleapis.com/v1/projects/${file.id}/deployments`;

          const deploymentsResponse = await fetch(deploymentsUrl, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (!deploymentsResponse.ok) {
            skippedScripts.push(`${file.name} (${deploymentsResponse.status})`);
            continue;
          }

          checkedScripts.push(file.name);

          const deploymentsData = (await deploymentsResponse.json()) as {
            deployments?: Array<{ deploymentId: string }>;
          };
          const deployments = deploymentsData.deployments || [];

          const found = deployments.find(
            (d) => d.deploymentId === deploymentId
          );
          if (found) {
            return c.json({
              valid: true,
              scriptId: file.id,
              scriptName: file.name,
            });
          }
        }

        // Build detailed error message
        let errorMsg = `Deployment not found: ${deploymentId}\n`;
        errorMsg += `Checked ${checkedScripts.length} scripts: ${checkedScripts.join(", ") || "(none)"}\n`;
        if (skippedScripts.length > 0) {
          errorMsg += `Skipped ${skippedScripts.length} scripts (no permission): ${skippedScripts.join(", ")}`;
        }

        return c.json({
          valid: false,
          error: errorMsg,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return c.json({ valid: false, error: errorMessage });
      }
    }
  );

  return router;
}
