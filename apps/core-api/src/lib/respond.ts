import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ErrorCode, Result as ResultType } from "@luhive/domain";

const ERROR_STATUS: Record<ErrorCode, ContentfulStatusCode> = {
  unauthorized: 401,
  forbidden: 403,
  insufficient_scope: 403,
  invalid_query: 400,
  not_found: 404,
  conflict: 409,
  internal_error: 500,
};

export function respond<T>(
  c: Context,
  result: ResultType<T>,
  successStatus: ContentfulStatusCode = 200,
) {
  if (result.ok) {
    return c.json(result, successStatus);
  } else {
    return c.json(result, ERROR_STATUS[result.error.code]);
  }
}
