# Core API

Private backend for `apps/web`. Not versioned. Public customer API lives in `apps/integration-api`.

## Why these three files

**`app.ts`** — the HTTP app. Middleware order, `/health`, and where slices get mounted. Tests call `createApp` with fakes; they never start a real server.

**`container.ts`** — builds the real things the process needs: logger, database, Supabase. Called once at startup. `app.ts` does not construct these itself, so tests can skip them.

**`context.ts`** — the per-request bag. Today: `requestId` and `userId`. Anything a handler reads with `c.get(...)` is declared here.

`index.ts` is the process: parse env, build the container, create the app, listen, shut down.

## Tests

Two suites, because one of them needs a database and the other must stay fast.

```sh
pnpm test      # unit and route tests, no connection string needed
pnpm test:db   # *.db.test.ts, real SQL against the validation project
```

`test:db` needs `VALIDATION_DATABASE_URL` and refuses to run against anything
named `DATABASE_URL` or `PRODUCTION_DATABASE_URL`. Every test runs inside
`inRolledBackTx` from `test/support/database.ts`, so nothing is ever committed.

Validation is one shared database and CI runs are not serialised beyond a
queue, so derive fixture emails and external ids from
`test/support/fixtures.ts` rather than hardcoding literals — two runs
otherwise contend on the unique indexes over `(community_id, email)` and
`(community_id, external_id)`.

## Telemetry

`src/telemetry/start.ts` is **preloaded**, not imported:

```sh
node --import ./dist/telemetry/start.js dist/index.js
```

OpenTelemetry instruments `pg` and `node:http` by patching them as they load,
and a bundled ESM entry evaluates all of its external imports before any of its
own body. Importing the initialiser from `index.ts` would therefore run it too
late and instrument nothing, while appearing to work.

Two other settings in that file are load-bearing for the same reason — each one
leaves a process that looks healthy and reports nothing:

- `register("@opentelemetry/instrumentation/hook.mjs", …)`, because
  OpenTelemetry patches through a CommonJS `require` hook that an `import` of a
  built-in bypasses. Without it there is no server span and therefore nothing
  for `recordException` to attach to.
- `tracesPerSecond: 0`, because the distro picks its sampler by precedence and
  a positive `tracesPerSecond` beats `samplingRatio`. Its default of 5 leaves
  every span non-recording.

Without `APPLICATIONINSIGHTS_CONNECTION_STRING` nothing is exported, the distro
is never even loaded, and `recordException` is a no-op. The startup log line
reports which state the process is in as `telemetry: true | false`.

## What the request log carries

One `http_request` line per request, including `duration_ms`, `db_ms` and
`db_queries`. `db_ms` is Kysely's query execution time, so it excludes pool
wait and connection setup — a request whose `duration_ms` far exceeds its
`db_ms` most likely paid to establish a connection on a cold pool. Query text
and parameters are deliberately not logged; they carry personal data.
