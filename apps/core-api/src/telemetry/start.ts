import { register } from "node:module";
import { telemetryEnabled } from "./span";

/**
 * Application Insights export, and the only file that knows Azure exists at
 * runtime. `src/env.ts` stays a plain environment reader.
 *
 * **This is a preload, not an import.** It runs via
 * `node --import ./dist/telemetry/start.js dist/index.js`. OpenTelemetry
 * instruments `pg` and `node:http` by patching them as they load, and a
 * bundled ESM entry evaluates every external import before any of its own
 * body — so importing this from `index.ts` would initialise telemetry after
 * the modules it needs to patch, and instrument nothing while appearing to
 * work.
 *
 * Reads `process.env` directly because it runs before `parseEnv()` exists.
 */
if (telemetryEnabled) {
  // The distro takes the service name from the environment; passing it
  // directly would mean owning the OpenTelemetry Resource and its packages.
  process.env.OTEL_SERVICE_NAME ??= "core-api";

  // OpenTelemetry patches modules through a CommonJS `require` hook, which an
  // `import` of a built-in bypasses entirely. Without this there is no server
  // span for a request, so `recordException` has nothing to attach to and
  // reports nothing. Pinned to the distro's own instrumentation version: a
  // second copy registers a second hook.
  register("@opentelemetry/instrumentation/hook.mjs", import.meta.url);

  // Imported here so an unconfigured process does not pay to load the distro.
  const { useAzureMonitor } = await import("@azure/monitor-opentelemetry");

  useAzureMonitor({
    azureMonitorExporterOptions: {
      connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
    },
    // Sampling is what a spend limit looks like for telemetry. Keep every
    // trace while the volume is this low and revisit it with real numbers.
    samplingRatio: 1,
    // Required for `samplingRatio` to be read at all. The distro picks its
    // sampler by precedence and a positive `tracesPerSecond` wins, so its
    // default of 5 would silently rate-limit everything and leave spans
    // non-recording — which makes `recordException` a no-op.
    tracesPerSecond: 0,
  });
}
