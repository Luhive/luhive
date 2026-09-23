# Core API logging and telemetry

The Core API uses three complementary pieces:

- **Pino** writes structured application events to stdout.
- **OpenTelemetry** provides vendor-neutral tracing APIs, context propagation
  and automatic Node/PostgreSQL instrumentation.
- **Azure Monitor OpenTelemetry** configures the OpenTelemetry SDK and exports
  its data to Azure Application Insights.

OpenTelemetry and Azure Monitor are not competing telemetry systems. Application
code uses the OpenTelemetry standard; Azure Monitor is the current storage and
visualisation backend. Changing vendors later should mostly replace startup and
export configuration rather than business code.

```text
Application events
  → Pino
  → stdout
  → Container Apps / Log Analytics

Node HTTP + PostgreSQL operations
  → OpenTelemetry auto-instrumentation
  → request and dependency spans
  → Azure Monitor exporter
  → Application Insights

Unhandled exception
  → Hono app.onError
  → recordException(error)
  → active OpenTelemetry request span
  → Application Insights failure and exception views
```

## Startup

Production starts the built service with telemetry preloaded:

```json
"start": "node --import ./dist/telemetry/start.js dist/index.js"
```

The preload is `apps/core-api/src/telemetry/start.ts`. It:

1. Registers the OpenTelemetry ESM instrumentation hook.
2. Loads `@azure/monitor-opentelemetry` only when
   `APPLICATIONINSIGHTS_CONNECTION_STRING` exists.
3. Configures Azure Monitor as the exporter.
4. Keeps every trace at the current low traffic level.

The initialiser must run before the application imports `node:http` and `pg`.
OpenTelemetry patches those modules as they load; importing the initialiser
normally from `index.ts` would run too late and silently produce no useful
instrumentation.

The ESM hook is also required. OpenTelemetry normally patches through a
CommonJS `require` hook, which an ESM import of a built-in bypasses. Without:

```ts
register("@opentelemetry/instrumentation/hook.mjs", import.meta.url);
```

there is no server span for a request and therefore nothing for
`recordException` to attach to.

`tracesPerSecond: 0` is intentional. The Azure distro chooses its sampler by
precedence, and its positive default wins over `samplingRatio`. Setting it to
zero hands control to `samplingRatio: 1`.

## Request and dependency traces

Auto-instrumentation creates a server span for an incoming request and child
dependency spans for PostgreSQL work:

```text
HTTP POST /people
├── pg.connect
├── INSERT people
└── INSERT person_events
```

All spans share one trace ID, allowing Application Insights to display the
operation as one timeline. This answers:

- Which operations are slow or failing?
- Is time spent in application code, acquiring a connection, or executing SQL?
- Which dependency failed?
- What happened immediately before an exception?

## Exception flow and grouping

Unhandled errors reach `apps/core-api/src/middleware/error.ts`. The handler:

1. Calls `recordException(error)`.
2. Writes a structured Pino error.
3. Returns the safe shared `internal_error` response.

`recordException` is in `apps/core-api/src/telemetry/span.ts`. It attaches the
exception type, message and stack to the active request span and marks that span
failed.

Application Insights generally groups repeated failures using the exception
type and originating stack location. A bug repeatedly thrown from the same
service method should appear as one problem with:

- an occurrence count
- first and last timestamps
- affected operations
- sample stack traces
- the surrounding request and dependency spans

The exact grouping algorithm belongs to Application Insights. Dynamic messages
or materially different stacks can split one conceptual bug into multiple
groups.

Expected failures do not become exception groups unless explicitly recorded:
authentication rejection, validation errors, `not_found`, and business
conflicts represented as `Result.failure` are normal outcomes rather than
crashes.

## Structured request logs

`apps/core-api/src/lib/logger.ts` configures Pino with the service name,
environment, log level and authorization-header redaction.

`apps/core-api/src/middleware/request-log.ts` emits one `http_request` event at
the end of every request containing:

- `request_id`
- method and path
- status
- total `duration_ms`
- aggregate SQL execution time as `db_ms`
- SQL query count as `db_queries`

Kysely invokes the database log callback with `queryDurationMillis`.
`apps/core-api/src/lib/db-usage.ts` uses `AsyncLocalStorage` to add each query
to the correct request without passing a metrics object through every service.

This makes different latency causes visible:

```text
duration_ms: 290, db_ms: 4, db_queries: 1
```

The query was fast and roughly 286 ms was spent elsewhere, potentially
acquiring a cold connection.

```text
duration_ms: 310, db_ms: 280, db_queries: 12
```

Database work dominates, and the query count is itself a likely problem.

Kysely's duration covers execution on an already-acquired connection. It does
not include pool wait or connection setup. PostgreSQL OpenTelemetry spans are
the more direct view of connection latency.

## Correlation boundary

Pino and OpenTelemetry currently use different identifiers:

- Pino logs carry the application-generated `request_id`.
- Application Insights traces carry OpenTelemetry trace and span IDs.

They can be matched manually by path and timestamp. Add `trace_id` and
`span_id` to Pino request/error events if that becomes painful.

## Privacy and operational boundaries

- The production `start` command preloads telemetry; the current `dev` command
  does not. Local `pnpm dev` has Pino logging but no OpenTelemetry
  instrumentation.
- PostgreSQL auto-instrumentation exports `db.query.text` **unconditionally**;
  it is not gated behind `enhancedDatabaseReporting`. Parameter *values* are
  gated, and that flag defaults to false, so values are not exported. Verified
  against `@opentelemetry/instrumentation-pg@0.73.0`.

  The practical consequence: because Kysely parameterises interpolated values,
  the exported text reads `… where email = $1` rather than the address. The
  only way personal data reaches a span is `sql.raw` or `sql.lit` inlining a
  literal. **Treat that as a rule rather than a review item** — never put
  personal data through `sql.raw` or `sql.lit`. `sql.id` is for identifiers
  and is fine.
- The Kysely request logger records duration only, never SQL or parameters.
- Local verification proved that a configured request receives a recording
  span. It did not prove Azure ingestion, retention or portal grouping. Verify
  the final mile with one controlled exception after the real connection string
  is attached.
