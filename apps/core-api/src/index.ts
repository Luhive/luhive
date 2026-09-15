import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { createContainer } from "./container";
import { parseEnv } from "./env";
// Telemetry itself is started by `src/telemetry/start.ts`, preloaded ahead of
// this entry. This import only reports whether that happened.
import { telemetryEnabled } from "./telemetry/span";

const env = parseEnv();
const container = createContainer(env);
const app = createApp({
  verifyToken: container.verifyToken,
  logger: container.logger,
});

const server = serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  ({ port }) => {
    container.logger.info(
      { event: "server_started", port, telemetry: telemetryEnabled },
      "core API listening",
    );
  },
);

let shuttingDown = false;

async function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) return;
  shuttingDown = true;

  container.logger.info({ event: "shutdown_started", signal }, "shutting down");

  try {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    await container.close();
    container.logger.info({ event: "shutdown_completed" }, "shutdown complete");
  } catch (error) {
    container.logger.error(
      { event: "shutdown_failed", err: error },
      "shutdown failed",
    );
    process.exitCode = 1;
  }
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
