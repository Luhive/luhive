import { Result } from "@luhive/domain";
import type { Context } from "hono";
import type { AppEnv } from "../context";
import type { AppLogger } from "../lib/logger";
import { respond } from "../lib/respond";
import { recordException } from "../telemetry/span";

type CoreContext = Context<AppEnv>;

export function errorHandler(logger: AppLogger) {
  return (error: Error, c: CoreContext) => {
    recordException(error);

    logger.error(
      {
        event: "unhandled_error",
        request_id: c.get("requestId"),
        method: c.req.method,
        path: c.req.path,
        err: error,
      },
      "unhandled request error",
    );

    return respond(c, Result.failure("internal_error"));
  };
}
