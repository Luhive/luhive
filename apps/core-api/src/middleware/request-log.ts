import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../context";
import { trackDbUsage } from "../lib/db-usage";
import type { AppLogger } from "../lib/logger";

const hundredths = (value: number) => Math.round(value * 100) / 100;

export function requestLogger(logger: AppLogger) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const requestId = crypto.randomUUID();
    const startedAt = performance.now();

    c.set("requestId", requestId);
    c.header("x-request-id", requestId);

    await trackDbUsage(async (usage) => {
      // `db_ms` is the cross-cloud number from Stage 1 #1, per request rather
      // than as a one-off measurement. It covers query execution only, so a
      // request whose `duration_ms` far exceeds it spent that time elsewhere —
      // most likely establishing a connection on a cold pool.
      const logCompleted = (status: number) => {
        logger.info(
          {
            event: "http_request",
            request_id: requestId,
            method: c.req.method,
            path: c.req.path,
            status,
            duration_ms: hundredths(performance.now() - startedAt),
            db_ms: hundredths(usage.ms),
            db_queries: usage.queries,
          },
          "request completed",
        );
      };

      try {
        await next();
      } catch (error) {
        // errorHandler always maps unhandled throws to internal_error (500).
        // Do not read c.res.status here: Hono's getter lazily creates a 200
        // Response when none has been set yet.
        logCompleted(500);
        throw error;
      }

      logCompleted(c.res.status);
    });
  });
}
