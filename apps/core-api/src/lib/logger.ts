import pino, { type Logger } from "pino";
import type { CoreEnv } from "../env";

export type AppLogger = Pick<Logger, "error" | "info">;

export function createLogger(env: CoreEnv): Logger {
  return pino({
    level: env.LOG_LEVEL,
    base: {
      service: "core-api",
      environment: env.NODE_ENV,
    },
    // Kept for the day a request or error log includes headers. Nothing we
    // currently log can contain these keys.
    redact: {
      paths: ["authorization", "req.headers.authorization"],
      censor: "[REDACTED]",
    },
  });
}
