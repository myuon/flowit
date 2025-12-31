import "dotenv/config";
import { runWorkflow, type WriteLogFn } from "@flowit/sdk";
import {
  executionRepository,
  workflowVersionRepository,
  executionLogRepository,
} from "@flowit/db";

// Configuration
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL ?? "5000", 10);
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE ?? "5", 10);

// Generate unique worker ID
const workerId = `worker-${crypto.randomUUID().slice(0, 8)}`;

// Graceful shutdown flag
let running = true;

// Create writeLog function for persisting execution logs
const writeLog: WriteLogFn = async (workflowId, executionId, nodeId, data) => {
  await executionLogRepository.create({
    workflowId,
    executionId,
    nodeId,
    data: data ?? {},
  });
};

// Sleep utility
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Process a single execution
async function processExecution(execution: Awaited<ReturnType<typeof executionRepository.findPendingExecutions>>[number]) {
  console.log(`[${workerId}] Processing execution ${execution.id}`);

  try {
    // Claim the task by marking as started
    await executionRepository.markStarted(execution.id, workerId);

    // Get workflow version DSL
    const version = await workflowVersionRepository.findById(execution.versionId);
    if (!version) {
      throw new Error(`Workflow version ${execution.versionId} not found`);
    }

    // Run the workflow
    const result = await runWorkflow({
      workflow: version.dsl,
      inputs: (execution.inputs as Record<string, unknown>) ?? {},
      secrets: {},
      workflowId: execution.workflowId,
      writeLog,
    });

    // Update status based on result
    if (result.status === "success") {
      await executionRepository.markCompleted(execution.id, result.outputs);
      console.log(`[${workerId}] Execution ${execution.id} completed successfully`);
    } else {
      await executionRepository.markFailed(execution.id, result.error ?? "Unknown error");
      console.log(`[${workerId}] Execution ${execution.id} failed: ${result.error}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await executionRepository.markFailed(execution.id, errorMessage);
    console.error(`[${workerId}] Execution ${execution.id} error:`, errorMessage);
  }
}

// Main worker loop
async function main() {
  console.log(`[${workerId}] Worker started`);
  console.log(`[${workerId}] Poll interval: ${POLL_INTERVAL}ms, Batch size: ${BATCH_SIZE}`);

  while (running) {
    try {
      // Fetch pending executions
      const pending = await executionRepository.findPendingExecutions(BATCH_SIZE);

      if (pending.length > 0) {
        console.log(`[${workerId}] Found ${pending.length} pending execution(s)`);

        // Process all executions in parallel
        await Promise.all(pending.map(processExecution));
      }
    } catch (error) {
      console.error(`[${workerId}] Error in main loop:`, error);
    }

    // Wait before next poll
    await sleep(POLL_INTERVAL);
  }

  console.log(`[${workerId}] Worker stopped`);
}

// Graceful shutdown handlers
process.on("SIGTERM", () => {
  console.log(`[${workerId}] Received SIGTERM, shutting down...`);
  running = false;
});

process.on("SIGINT", () => {
  console.log(`[${workerId}] Received SIGINT, shutting down...`);
  running = false;
});

// Start the worker
main().catch((error) => {
  console.error(`[${workerId}] Fatal error:`, error);
  process.exit(1);
});
