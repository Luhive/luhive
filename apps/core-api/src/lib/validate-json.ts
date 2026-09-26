import { zValidator } from "@hono/zod-validator";
import { Result } from "@luhive/domain";
import type { ZodType } from "zod";
import { respond } from "./respond";

/** A body that fails the schema gets the shared `invalid_query` envelope, not zod's raw error. */
export function validateJson<T extends ZodType>(schema: T) {
  return zValidator("json", schema, (validation, c) => {
    if (validation.success) return;

    const fields = validation.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    return respond(c, Result.failure("invalid_query", { fields }));
  });
}
