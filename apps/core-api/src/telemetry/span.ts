import { SpanStatusCode, trace } from "@opentelemetry/api";

/**
 * Unconfigured is a supported state. Locally and in tests there is no
 * connection string, no OpenTelemetry provider is registered, and
 * `recordException` does nothing.
 */
export const telemetryEnabled = Boolean(
  process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
);

/**
 * Attaches the error to the active request span, which is what Application
 * Insights renders as an exception. The span comes from the auto-instrumented
 * HTTP server, so this only reports when `telemetry/start.ts` ran as a
 * preload.
 */
export function recordException(error: Error): void {
  const span = trace.getActiveSpan();
  if (!span) return;

  span.recordException(error);
  span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
}
