// One JSON line per hackathon action, so production logs in Azure Log Analytics
// (ContainerAppConsoleLogs_CL) can be filtered with `pnpm prod-logs`. A plain
// console.error spreads a stack over one row per line; this keeps it in one.
//
// Levels:
//   info  — something happened (team created, joined, removed, decided)
//   warn  — refused with a message the person saw ("This team is full.")
//   error — something broke; worth looking at right away
//
// Ids only, never emails or names.

export type HackathonLogLevel = "info" | "warn" | "error";

const MAX_STACK = 3000;

function describeError(error: unknown) {
  if (error instanceof Error) {
    return {
      error: error.message,
      errorType: error.name,
      stack: error.stack?.split("\n").map((line) => line.trim()).join(" | ").slice(0, MAX_STACK),
    };
  }
  if (error && typeof error === "object") {
    // Supabase/Postgres errors are plain objects with message, code, details.
    const { message, code, details, hint } = error as Record<string, unknown>;
    return { error: String(message ?? JSON.stringify(error)), code, details, hint };
  }
  return error === undefined ? {} : { error: String(error) };
}

export function logHackathon(
  level: HackathonLogLevel,
  action: string,
  fields: Record<string, unknown> = {},
  error?: unknown,
) {
  const line = JSON.stringify({
    source: "hackathon",
    level,
    action,
    ...fields,
    ...describeError(error),
    at: new Date().toISOString(),
  });
  if (level === "error") console.error(line);
  else console.log(line);
}

/** Logs the outcome of a hackathon API response: info on success, warn with the message on refusal. */
export async function logHackathonResponse(
  action: string,
  fields: Record<string, unknown>,
  response: Response,
) {
  if (response.ok) {
    logHackathon("info", action, { ...fields, status: response.status });
    return;
  }
  let message: unknown = null;
  try {
    const body = (await response.clone().json()) as { error?: unknown };
    message = body?.error ?? null;
  } catch {
    message = null;
  }
  logHackathon(response.status >= 500 ? "error" : "warn", action, {
    ...fields,
    status: response.status,
    message,
  });
}
