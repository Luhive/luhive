import { Result } from "@luhive/domain";
import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../context";
import { respond } from "../lib/respond";

export type TokenVerifier = (token: string) => Promise<string | null>;

function readBearerToken(header: string | undefined): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(header?.trim() ?? "");
  return match?.[1] ?? null;
}

export function sessionMiddleware(verifyToken: TokenVerifier) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const token = readBearerToken(c.req.header("Authorization"));
    if (!token) {
      return respond(c, Result.failure("unauthorized"));
    }

    const userId = await verifyToken(token);
    if (!userId) {
      return respond(c, Result.failure("unauthorized"));
    }

    c.set("userId", userId);
    await next();
  });
}
