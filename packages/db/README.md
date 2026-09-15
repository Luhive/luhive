# `@luhive/db`

Shared database schema types, clients, and SQL migrations.

## The rule

**Schema changes are hand-written SQL migrations. Codegen never changes a
database; it only updates TypeScript types to match a database.**

Do not edit:

- `migrations/0000_baseline.sql` — fixed production snapshot
- `migrations/archive/` — pre-baseline history, never executed
- `src/db.types.ts` or `src/supabase.types.ts` — generated files

## Changing the schema

1. Add the next lexical migration at the root of `migrations/`, for example
   `0001_add_event_category.sql`.
2. Write the SQL explicitly (`CREATE TABLE`, `ALTER TABLE`, `DROP COLUMN`,
   indexes, constraints, and so on). Keep one coherent change per file.
3. Put production and a disposable Supabase project in `.env`:
   `PRODUCTION_DATABASE_URL` and `VALIDATION_DATABASE_URL`.
4. Apply and inspect the migration on validation:

   ```sh
   pnpm --filter @luhive/db migrate:validation
   pnpm --filter @luhive/db migrate:list
   ```

5. Review the result, then apply the **same reviewed SQL file** to production by
   the manual run below. There is deliberately no production migration command;
   never point `VALIDATION_DATABASE_URL` at it.
6. After production has the new schema, regenerate and commit both type files.
   `codegen:supabase` uses `--project-id` derived from `PRODUCTION_DATABASE_URL`
   (a one-time `supabase login`, no Docker):

   ```sh
   pnpm --filter @luhive/db codegen
   pnpm --filter @luhive/db typecheck
   pnpm --filter @luhive/db test
   ```

For destructive changes, prefer two migrations/deploys: stop using a column or
table first, then remove it after old application versions can no longer reach
it. Never edit an already-applied migration.

## Applying a migration to production

A deliberate manual run, so every production schema change is something a person
decided to do. Four steps, from `packages/db/`.

1. Confirm the target is production and that the migration is not already there:

   ```sh
   psql "$PRODUCTION_DATABASE_URL" -c "select current_database();"
   psql "$PRODUCTION_DATABASE_URL" -c "select name from public.kysely_migration order by name;"
   ```

2. Apply the reviewed file byte-for-byte as it sits in git, in one transaction so
   a failure leaves nothing behind:

   ```sh
   psql "$PRODUCTION_DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction \
     -f migrations/0001_add_people_schema.sql
   ```

3. Record it, so the ledger answers "what is applied to production":

   ```sql
   INSERT INTO public.kysely_migration (name, "timestamp")
   VALUES ('0001_add_people_schema',
           to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
   ```

4. Verify the objects exist and RLS is where you expect, then run `codegen`.

If step 2 fails nothing was applied: fix the SQL, re-validate, and start over
with a new attempt at the same file.

### Two ways production differs from validation

**Production auto-enables RLS.** It has an `ensure_rls` event trigger that fires
on `CREATE TABLE` in `public` and enables row level security. The validation
project has no such trigger. A migration creating a table that must not have RLS
has to `DISABLE ROW LEVEL SECURITY` *after* the `CREATE TABLE`, and that line
will look like a no-op when you test it on validation.

**Default privileges are permissive.** `public` grants all on new tables to
`anon` and `authenticated`, so a new table is reachable through PostgREST unless
the migration revokes them.

### Baselining a database that already has the schema

Kysely decides what to run purely from `public.kysely_migration`; it has no
command to mark a migration as already applied. For a database that already
contains a migration's objects — a long-lived development database, or
production before it was tracked — insert the row by hand instead of running the
file. The `name` is the filename without `.sql`:

```sql
INSERT INTO public.kysely_migration (name, "timestamp")
VALUES ('0000_baseline',
        to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
```

## Type exports

- `@luhive/db` — Kysely/`pg` schema types (`Date` timestamps)
- `@luhive/db/supabase` — supabase-js/PostgREST types (ISO string timestamps)
- `@luhive/db/node` — Node-only Kysely client
- `@luhive/db/http` — Workers-safe Supabase client

See `migrations/README.md` for the baseline and archive boundary.
