import { Result } from "@luhive/domain";
import { Hono } from "hono";
import type { AppEnv } from "./context";
import type { AppLogger } from "./lib/logger";
import { respond } from "./lib/respond";
import { errorHandler } from "./middleware/error";
import { requestLogger } from "./middleware/request-log";
import {
  sessionMiddleware,
  type TokenVerifier,
} from "./middleware/session";

export type AppDependencies = {
  verifyToken: TokenVerifier;
  logger: AppLogger;
};

export function createApp(deps: AppDependencies) {
  const app = new Hono<AppEnv>();

  app.use("*", requestLogger(deps.logger));

  // Container Apps uses this as a liveness probe. Database connectivity is a
  // separate deployment check so health probes never consume pool capacity.
  app.get("/health", (c) => c.json({ status: "ok" }));

  app.use("*", sessionMiddleware(deps.verifyToken));

  // Feature routes are mounted here with app.route(). `slices/people` is not
  // mounted yet: it needs a credential that resolves to one community, and the
  // integration-to-core service credential arrives in Stage 3.

  app.notFound((c) => respond(c, Result.failure("not_found")));
  app.onError(errorHandler(deps.logger));

  return app;
}

export type CoreApp = ReturnType<typeof createApp>;
