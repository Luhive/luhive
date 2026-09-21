export type ErrorCode =
  | "unauthorized"
  | "forbidden"
  | "insufficient_scope"
  | "invalid_query"
  | "not_found"
  | "conflict"
  | "internal_error";

export type FieldError = {
  path: string;
  message: string;
};

export type AppError = {
  code: ErrorCode;
  message?: string;
  fields?: FieldError[];
};

export type ResultMeta = {
  next_cursor?: string | null;
};

export type Success<T> = {
  ok: true;
  data: T;
  meta?: ResultMeta;
};

export type Failure = {
  ok: false;
  error: AppError;
};

export type Result<T> = Success<T> | Failure;

type FailureOptions = Omit<AppError, "code">;

export const Result = {
  success<T>(data: T, meta?: ResultMeta): Success<T> {
    return meta === undefined ? { ok: true, data } : { ok: true, data, meta };
  },

  failure(code: ErrorCode, options: FailureOptions = {}): Failure {
    const error: AppError = { code };

    if (options.message !== undefined) {
      error.message = options.message;
    }

    if (options.fields?.length) {
      error.fields = options.fields;
    }

    return { ok: false, error };
  },
};
