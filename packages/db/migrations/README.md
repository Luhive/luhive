# Migrations

## The squash boundary

`0000_baseline.sql` is the whole story up to Stage 0 task #8: a
`pg_dump --schema-only` of production's `public` schema, sanitised so Postgres
can execute it, and the starting point for any new database.

**It is a fixed historical snapshot — never regenerate it.** The tooling that
produced it, and the tooling that proved a fresh database matched production,
were one-time utilities and were removed once #8 closed. From here the file only
changes if the snapshot itself was wrong, and every real schema change is a new
migration on top of it.

`archive/` holds the SQL that produced that state: `archive/web/` is the former
`supabase/migrations/`, `archive/integration-api/` is the former
`apps/integration-api/db/`. Those files are kept byte-for-byte as history and
are **never executed** — the migration provider only reads `.sql` files in this
folder's root, so nothing under `archive/` can run.

Every future migration is hand-written SQL at this folder's root, named so it
sorts after the baseline (`0001_…`, `0002_…`).

## What the baseline deliberately omits

- **Supabase dashboard webhook triggers.** Production has none today — the one
  that existed, `event_published_webhook` on `public.events`, was dropped in
  Stage 0 task #8 because its endpoint was retired. Worth knowing if one is ever
  added: such a trigger's definition embeds the destination URL and its bearer
  token, so dumping one commits a working credential, and it depends on
  `supabase_functions`, a schema that only exists where webhooks are enabled.
- **`public.rls_auto_enable()`**, Supabase platform code backing the `ensure_rls`
  event trigger. Every project already has it, so re-creating it fails.
- **Kysely's own `kysely_migration` / `kysely_migration_lock` tables.**
- **`auth`, `storage`, `realtime`, `vault` and extension-owned schemas.**
  The baseline still *references* `auth.users`, `auth.uid()` and `auth.role()`,
  which every Supabase project provides.

## Running them

Migrations only ever target `VALIDATION_DATABASE_URL`, a disposable project.
There is no command that can point at production — the config refuses to connect
if that variable matches `PRODUCTION_DATABASE_URL` by string or by project ref:

```sh
pnpm --filter @luhive/db migrate:validation   # apply
pnpm --filter @luhive/db migrate:list         # inspect
```

`PRODUCTION_DATABASE_URL` is read-only to this tooling; its one use is `pnpm
--filter @luhive/db codegen`, which regenerates `src/db.types.ts` and
`src/supabase.types.ts` after a migration reaches production.

Production is changed by the manual run documented in `../README.md`, and both
databases record what has been applied in `public.kysely_migration`. Kysely reads
only that table to decide what is pending, so a database that already has a
migration's objects is baselined by inserting the row rather than running the
file.
