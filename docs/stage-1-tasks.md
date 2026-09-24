# Stage 1 — Core API and the first slice

Full context in `docs/spec-moc.md`; gates in `docs/spec/15 Stages and Gates.md`. Stage 0 is complete: workspace, `apps/web`, `apps/integration-api`, `@luhive/db` with a baseline migration and two generated type sets, CI.

**Goal:** the person tables exist, Enverson's pilot 50 are in them, and a real newsletter goes out through Luhive — while `apps/core-api` is stood up and deployed alongside.

**Two gates. The platform gate now comes first so the first new write path is
atomic and deployable rather than temporary logic in `apps/web`:**

1. **Platform** — `apps/core-api` deployed to Container Apps with the people
   writers and API slice live.
2. **Pilot** — 50 imported people, a segment built from their real onboarding
   attributes, a newsletter sent through Luhive, and every send recorded as a
   `person_event`.

Community join and event registration consume core immediately after the API
client lands. The OTP decomposition (#10) follows once that path is stable.

## Order

```
#5  migration 0001              done
 └─ #5b initial backfill         done: every community → person

#1  Azure setup                 done: resources live, latency measured
#2  packages/domain
 └─ #3  core-api skeleton
     └─ #4  DEPLOY hello-world  ◄── gate PASSED, ~3ms to the database
         └─ #6  lib/person + lib/person-event   done
             └─ #7  people API slice
                 └─ #8  api-client + web wiring
                     └─ #9  join + registration → core
                         └─ #9b one-time reconciliation backfill
                             └─ NEWSLETTER
                                 ├─ dogfood on Luhive first
                                 └─ Enverson import
                         └─ #10 OTP action → core

#11 CI and observability         parallel, after #4
```

**The newsletter is not scoped to one customer.** It ships for every community,
gated by `settings.features.newsletter`, so it can be dogfooded on Luhive's own
community before a paying customer sees it. The initial backfill populated
`people`; the deployed dual-write keeps it current. One reconciliation run after
the web cutover closes the gap between those two moments before any newsletter
is sent.

**Why the order changed.** A temporary implementation in `apps/web` would use
supabase-js and could not atomically commit membership/registration, person, and
person-event writes. It would also add throwaway business logic to the frozen
events module. Build and deploy core first, then add the durable Kysely writers
and consume them immediately.

**Do the connectivity spike early anyway:** run `psql` against the pooler from North Europe and time a `SELECT 1`. Fifteen minutes, tests the one genuinely unknown thing, provisions nothing permanent.

**Not from Cloud Shell.** Azure picks the Cloud Shell region for you based on where you are, so a shell in Amsterdam would measure Amsterdam-to-Dublin — about 10 ms — and you would write down a wrong number as fact. Use a throwaway Container Instance placed in North Europe explicitly, then delete it. Use the pooler in transaction mode on port `6543`, and ignore the first `SELECT` because it includes the TLS handshake.

**Contracts now lead the API work.** `Result`, error codes, `PersonRequest`, and
`PersonResponse` land in #2. Customer-specific onboarding answers remain in
`attributes` jsonb, so the export can shape data without delaying the stable
person contract.

---

## #1 · Azure setup — North Europe

`PRODUCTION_DATABASE_URL` resolves to `aws-1-eu-west-1`: **AWS Dublin**. **Azure North Europe is also Dublin.** Same metro, so the cross-cloud hop is roughly 1–3 ms rather than the 10–20 ms GCP's nearest region would have cost. The region question is settled by that fact alone.

- [x] Subscription under Microsoft for Startups; **record the credit expiry date and tiering** in `docs/spec/09`
- [x] Resource group in **North Europe**. Nothing outside that region
- [x] Azure Container Registry, admin user off — the Container App pulls with its managed identity
- [x] Key Vault for secrets — never env vars in a service definition
- [x] Application Insights (there is no error reporting anywhere since Sentry was removed in Stage 0). It must be workspace-based, so a Log Analytics workspace comes first
- [x] Container Apps environment on the **Azure-managed VNet**. No custom VNet: internal ingress already works without one, and bringing your own adds subnet sizing, NSG rules and DNS as new failure modes. It takes several minutes to create, so do it here rather than inside #4
- [x] **Subscription budget with an email alert.** Credits hide overspend by design. This also closes the open question that has been sitting in `docs/spec/16` since August

**Done 11–13 September 2026.** Resource names and the environment's default domain are recorded in `docs/spec/09`, along with the credit expiry of **1 September 2028**.

The spike measured **about 3 ms** from North Europe to the Dublin pooler in transaction mode — five `select 1` calls between 2.72 and 3.52 ms, against 102 ms for the same query from Baku. That is inside the 1–3 ms the region choice predicted, so the cross-cloud arrangement holds and the database stays on Supabase.

Three things worth knowing before #4 starts:

- The subscription is named "Azure subscription 1", which tells you nothing. Its quota ID `Sponsored_2016-01-01` is what proves it is the sponsored one
- The URL in `packages/db/.env` is the **session** pooler on port 5432. Core uses **transaction** mode on 6543 — same host and credentials, different port. The spike had to swap it, and so does the Key Vault secret in #4
- `api.luhive.com` is already taken by integration-api, so core gets `core-api.luhive.com`. Custom domains attach to a container app, not to an environment, so this can only happen once the app exists in #4

**The trap to avoid.** $100k is fifty times the previous budget, and it makes Service Bus, Cosmos DB, AKS and API Management look free. They are not free — they are deferred lock-in, and the bill arrives when the credits expire.

> Use Azure as a container host, not as a platform.

Containers plus Postgres-over-the-network stay portable. Rule 5 in `docs/spec/01` does not relax because someone else is paying.

**And do not move the database.** $100k makes "put Postgres in North Europe too and get sub-millisecond queries" tempting. It drags Supabase Auth along, which is the one migration deliberately left with no trigger — re-hashing passwords or forcing a reset for every user.

---

## #2 · `packages/domain`

No logic. Contracts and the result type only.

- [x] `@luhive/domain`, private, `exports` map with `.` and `./v1/*`
- [x] `src/result.ts` — `Result<T>` as
  `{ ok: true, data: T } | { ok: false, error: AppError }`, plus
  `Result.success` / `Result.failure` and the `ErrorCode` union
  (`unauthorized`, `forbidden`, `insufficient_scope`, `invalid_query`,
  `not_found`, `conflict`, `internal_error`)
- [x] `src/v1/person.ts` — `PersonRequest`, `PersonResponse`
- [x] zod from `catalog:`, not a loose specifier — version skew here breaks assignability across packages with an error that never says so

**`Result<T>` is the wire envelope**, same discriminant and same payload key, so nothing rewraps it. See `docs/spec/08`.

**Verified:** package typecheck and all 11 contract tests pass; workspace build and
tests pass. Workspace typecheck reaches this package successfully, then stops on
the existing web baseline mismatch caused by the in-progress generated DB type
changes from #5.

---

## #3 · `apps/core-api` skeleton

No business logic yet.

- [x] `@luhive/core-api`, Hono, `hono/node-server`
- [x] `src/index.ts` — app composition, `app.route()` mounts
- [x] `src/container.ts` — the composition root. Explicit `new`, no DI container
- [x] `src/lib/respond.ts` — `Result<T>` → `c.json(result, STATUS[code])`
- [x] `src/middleware/error.ts` — `app.onError` → Sentry-or-successor → `internal_error`
- [x] `src/middleware/session.ts` — reads the bearer token, `supabase.auth.getUser(token)`, sets `userId`. Re-verifies rather than trusting `apps/web`
- [x] `GET /health` unauthenticated, bare `{ "status": "ok" }`, no envelope
- [x] Kysely client from `@luhive/db/node`, pointed at the Supabase **pooler** endpoint in transaction mode, small per-instance pool
- [x] Structured logger from day one. `apps/web` has 282 `console.*` calls and no structure; do not inherit that

**Verified:** core typecheck and bundled build pass; all 23 core tests pass.
The built Node artifact starts and serves the exact bare health response. Workspace
build and tests pass. Workspace typecheck includes and passes core, then stops on
the existing web baseline mismatch caused by the in-progress generated DB type
changes from #5. Pino records structured errors now; Application Insights export
is wired in #11 after the Azure resource exists.

---

## #4 · Deploy hello-world to Container Apps — HARD GATE

**Before any slice is written.** Same discipline as Stage 0 #5: prove the pipeline, then build on it.

- [x] Dockerfile, image pushed to ACR, Container App in North Europe
- [x] **Min replicas 1** — web calls core on every render and a Node cold start is a second or two
- [x] Secrets from Key Vault, pulled with the app's managed identity
- [x] **External ingress, for now.** Web is still on Netlify and cannot reach an internal address. The bearer check in `src/middleware/session.ts` is the only thing guarding core until web moves — see the note in `docs/spec/09`
- [x] `GET /health` responds from the deployed URL
- [x] **A real query runs**: one trivial `SELECT` against production through the pooler, from the deployed instance, with the latency logged
- [x] Record the measured Dublin-to-Dublin latency in `docs/spec/09` — it should be low single digits, and if it is not, something is misconfigured
- [x] **Throwaway smoke test from web:** `apps/web/app/routes/api/core-health.tsx`, a loader that fetches core's `/health` and reports the round trip. `/health` is unauthenticated, so it covers DNS, TLS and reachability but says nothing about bearer auth. Its real purpose is measuring the Netlify-to-Azure hop — the number that decides whether web moves to Azure (`docs/spec/16`). Delete it and its line in `app/routes.ts` when #8 lands

That last check is the one that matters. Container Apps plus Kysely plus the Supabase pooler across clouds is the combination most likely to surprise, and finding out after seven slices is expensive.

**Gate passed 14 September 2026.** `https://core-api.nicefield-2b9a3355.northeurope.azurecontainerapps.io/health` returns exactly `{"status":"ok"}`, and a `select 1` from inside the deployed container runs in **about 3 ms** — 4.38, 3.71, 3.16, 2.92 — matching the 2.7–3.5 ms measured independently in #1. Resource names are in `docs/spec/09`.

What the gate actually proved, beyond the latency:

- The image builds in ACR rather than locally, so there is no arm64/amd64 problem and no local Docker dependency. `pnpm deploy --prod --legacy` is the line that makes a self-contained runtime folder out of a workspace package
- All three secrets resolve from Key Vault through the user-assigned identity. `src/env.ts` validates `DATABASE_URL` at startup and throws, so a reachable `/health` is itself proof the secret plumbing works
- Nothing holds a registry credential or a vault key. Two narrow roles on one identity, `AcrPull` and `Key Vault Secrets User`

**The 278 ms cold connection is the one surprise.** First query on a fresh pool, against 3 ms warm. With `idleTimeoutMillis: 10_000` in `container.ts`, a sporadically-used service pays that repeatedly. Not changed yet — tracked in `docs/spec/16` with #8 as the trigger, when there is real traffic to size it against.

---

## #5 · Migration `0001` — `people`, `person_events`, feature flags

Follow the workflow in `packages/db/README.md`: hand-written SQL, applied to validation, reviewed, then applied deliberately to production, then codegen.

**No `customer` table.** The community is the tenant — `docs/spec/06`. A customer that is not community-shaped, like Enverson, is a community row with features turned off.

- [x] `people` — `id`, `community_id`, `external_id`, `email`, `name`, `locale`, `plan`, `subscription_status`, `created_at`, `last_seen_at`, `unsubscribed_at`, `deleted_at`, `attributes` jsonb. Unique on `(community_id, external_id)` and `(community_id, email)`. **`email` and `name` are both nullable** — real data has gaps
- [x] `attributes`, **not `traits`** — *traits* is Segment/Mixpanel vocabulary, and analytics is a comparison we lose. `attributes` describes the person; `person_events.properties` describes what happened
- [x] `person_events` — `id`, `person_id`, `community_id`, `type`, `occurred_at`, `properties` jsonb. Append only. `community_id` denormalised so scoping needs no join
- [x] Index for the timeline query: `(person_id, occurred_at desc)`
- [x] `communities.tracking_enabled` boolean, default true
- [x] `communities.settings.features` — `public_page`, `join`, `events`, `newsletter`. Backfill existing communities to all-on. Enverson has no row yet; its off flags land when that community is created
- [x] **No RLS on the new tables.** Scoping is in application code — `docs/spec/07`. Foreign keys are `ON DELETE RESTRICT`; retire a person with `deleted_at`, never cascade
- [x] Regenerate both type sets

**`tracking_enabled` ships now**, per the decision in the Enverson doc — ten minutes today, a migration plus a backfill plus an audit of every send path later.

**Naming:** the behavioural table is `person_events`. `events` is calendar events and keeps that meaning.

**The rule the flags replace an abstraction with:** person, segment, campaign and mail code must never assume events, members or a public page exist. That is the failure mode to watch, not the column name.

---

## #5b · Backfill every community into `people`

The newsletter ships for everyone, so `people` starts populated rather than holding one customer's import.

- [x] From `community_members` — everyone who joined
- [x] From `event_registrations` — people who registered but never joined
- [x] Historical anonymous registrations, from `anonymous_email`, with a null `external_id`. Real contacts, and they merge with a later account by email
- [x] **Carry `community_members.email_opt_out` into `people.unsubscribed_at`**
- [x] Idempotent — upsert on `(community_id, email)` so it can be re-run

Production after `0002_backfill_people`: **1001 people** (937 with `external_id`, 64 anonymous) across 27 communities, **1591 `person_events`** (897 `community_joined`, 694 `event_registered`). Zero unnormalised emails, zero orphan events. No check-ins existed to import.

**`profiles` has no email column.** It is `avatar_url, bio, created_at, full_name, gamification, id, metadata, settings, updated_at`. Email lives in `auth.users`, Supabase's own schema, so the backfill joins it. Not obvious, and it fails confusingly if assumed otherwise.

### Real data is messier than a CSV export

> **Import faithfully. Filter at send time.**

Cleaning during import destroys information irreversibly. Excluding at send time is a decision you can reverse tomorrow.

| Reality | Handling |
|---|---|
| No name | Nullable. **Templates must render without it** — "Hi there", never "Hi null" |
| Same email from two sources | Upsert, not insert. Backfill stays re-runnable |
| Registered for five events | One person, five `person_event` rows. Desired, not a duplicate |
| Case and whitespace in emails | **Normalise on write** — lowercase, trim. The only cleaning done at import, because the unique key depends on it |
| No email at all | Valid record, excluded from every send |
| Already opted out | Carried forward. Losing it means emailing people who unsubscribed — CAN-SPAM, and the fastest way to burn a new sending domain |

Per-community `unsubscribed_at` is not the same as the platform-wide `suppression` table: one means *not from this community*, the other *never, from anywhere*. Both checked at send time.

**The dogfooding payoff:** your own community's data has all of the above in it. Enverson's clean export would have shown you none of it, and you would have found each case in front of a paying customer instead.

**Answered:** reviewed SQL reaches production by a documented manual `psql` run (`packages/db/README.md`). Production now keeps a `kysely_migration` ledger; `0000_baseline` was inserted by hand, then `0001` and `0002` were applied and recorded. There is still no production migration command.

---

## #6 · `lib/person.ts` and `lib/person-event.ts`

Cross-slice writers in `apps/core-api/src/lib/`. Four callers by definition —
registration, community join, check-in, and integration's forwarded writes — so
extracting them is not premature. Start only after #4 proves the deployed
runtime and database connection.

- [x] `resolvePerson(transaction, command)` — find by
  `(community_id, external_id)`, else email, else insert; merge an anonymous
  email-only person when the account becomes known; returns the person
- [x] `recordPersonEvent(transaction, command)` — append-only insert, the single
  chokepoint for the event-type union
- [x] Both take a Kysely transaction, never a pool, so the calling service owns
  atomicity
- [x] `recordPersonEvent` verifies the person belongs to the supplied
  `community_id` and **rejects identity fields in `properties`**. Events
  reference `person_id` and join; erasure must not require archaeology across
  event JSON
- [x] `PersonEventType` union in one place: `event_registered`,
  `event_checked_in`, `community_joined`, plus the email types for Stage 2.
  Not `EventType` — the generated calendar enum in `@luhive/db` already has
  that name
- [x] Real-database tests inside rolled-back transactions cover normalization,
  anonymous-to-account merge, conflicting identities, tenant mismatch, and
  preservation of `unsubscribed_at` / `deleted_at`

**Verified:** core typecheck and all 28 fast tests pass; all 12 database tests
pass against validation, 9 of them for the two writers. Each test creates its
own community inside the rolled-back transaction, borrowing an existing
`auth.users` row as `created_by` because tests cannot create auth users.

**Deliberately narrow.** `resolvePerson` takes `external_id`, `email` and
`name` only. `locale`, `plan`, `subscription_status`, `last_seen_at` and
`attributes` return when a caller sends them — #7, since `PersonRequest`
already carries the first four, and the Enverson import for `attributes`.

**Returning a failure inside a transaction commits it.** Kysely rolls back only
on a throw. Callers resolve the person before writing anything else, and throw
if a later step fails — see the worked example in `docs/spec/05a`.

**Concurrent first sightings are not locked.** Two requests creating the same
new person at once: one hits the unique constraint, its transaction rolls back,
and the caller gets `internal_error`. No duplicate row is possible. Revisit if
it shows up in logs.

**No temporary web version.** `apps/web` keeps its existing writes until #9
switches each command to core. Do not add Kysely/`pg` to the Netlify app and do
not duplicate these rules with supabase-js.

---

## #7 · `people` slice

First real API slice, after the deployed hello-world gate. Four files, per
`docs/spec/04` and the worked example in `05a`.

- [ ] `slices/people/routes.ts` — handlers inline, thin: validate, call, respond
- [ ] `slices/people/contracts.ts` — `UpsertPersonCommand` = `PersonRequest.extend({ communityId })`
- [ ] `slices/people/person.service.ts` — class, constructor-injected `db`,
  calls the #6 writer, normal `async` methods, no Hono imports
- [ ] `slices/people/person.mapper.ts` — `Selectable<Person>` → `PersonResponse`
- [ ] `slices/people/person.test.ts` — service tests inside a rolled-back transaction
- [ ] Route tests cover bearer auth, request validation, tenant injection from
  credentials, and the `Result<T>` wire envelope

**The mapper is not optional here, and #9 of Stage 0 explains why.** Kysely's timestamps are `ColumnType<Date, …>` because that is what `pg` returns; `PersonResponse` declares ISO strings. The mapper converts. A wire type derived from the entity would be a lie about the runtime shape — that discovery cost 43 extra typecheck errors last stage.

---

## #8 · `packages/api-client` and web wiring

- [ ] `@luhive/api-client` — `ApiClient` class, `baseUrl` plus an auth resolver in the constructor, context per call. Normal `async` methods
- [ ] Returns `Result<T>` parsed from the body **regardless of status** — a 409 carrying `error.code: "conflict"` must survive, not become a thrown string
- [ ] `apps/web/app/shared/lib/api-client.ts` — one line: `export const apiClient = new ApiClient(env.CORE_URL, sessionToken)`. Generic, no module imports, so `shared` stays cross-domain
- [ ] `sessionToken(request)` — reads the Supabase access token server-side and forwards it

---

## #9 · Community entry writes through core

The full command APIs consume #6. Core services call the shared writers directly;
they do not make HTTP calls to the people route from inside core.

- [ ] `slices/community/` in core — join command wrapping
  `community_members` insert + `resolvePerson` +
  `recordPersonEvent('community_joined')` in **one transaction**
- [ ] `slices/registration/` in core — event-registration command wrapping the
  relevant membership/registration insert + `resolvePerson` +
  `recordPersonEvent('event_registered')` in **one transaction**
- [ ] Core routes authenticate, validate, call their service, and return the
  shared `Result<T>` envelope; no SQL or business rules in route handlers
- [ ] `apps/web/app/modules/community/data/community.api.ts` and
  `apps/web/app/modules/events/data/registration.api.ts` — singleton clients,
  `*.api.ts` not `*.service.ts`
- [ ] Point the standalone community join action and event-registration action
  at core. Keep redirects, form parsing, components, and `useFetcher` call sites
  unchanged
- [ ] Remove any temporary web-side person/event writer before merge; after
  cutover there is exactly one implementation of each rule

---

## #9b · One-time reconciliation backfill after cutover

Close the finite gap between the initial #5b backfill and the moment both join
and registration start dual-writing through core.

- [ ] Deploy #9 first; verify new joins and registrations create `people` and
  `person_events` atomically in production
- [ ] Preflight for `(community_id, external_id)` / `(community_id, email)`
  conflicts that would make the old idempotent backfill fail; stop and resolve
  rather than silently merging two known identities
- [ ] Re-run the exact, already-reviewed
  `packages/db/migrations/0002_backfill_people.sql` once with
  `psql --single-transaction`. This is a data reconciliation, **not a new
  migration**: do not edit the applied file and do not add another
  migration-ledger row
- [ ] Verify every source member/registration maps to one person, deterministic
  event ids produced no duplicates, emails are normalized, opt-outs survived,
  and no orphan events exist
- [ ] Record the post-reconciliation counts here. After this point the core
  dual-write is authoritative; do not schedule recurring backfill runs

---

## #10 · The OTP action

The 404-line file: `apps/web/app/modules/auth/server/verify-otp-action.server.ts`. OTP verification, profile creation, event registration, community lookup, and membership creation in one handler — five domains.

- [ ] In core, three named things: `identifyPerson` → `recordEntry` → `resolveDestination`
- [ ] Web's action keeps redirect orchestration and calls core for the rest
- [ ] Return-to sanitisation stays in web; it is a web concern

This is the entry point the pivot is actually about — *own the moment a person enters something you run*. It is not the messiest file by accident; it is where every entry path converges.

---

## #11 · CI and observability

- [x] `pnpm -r typecheck` / `build` / `test` already cover `@luhive/core-api` once it is a workspace member — confirm it is picked up
- [x] Container build, ACR push and Container Apps deploy in CI, gated on tests
- [x] Error reporting wired to `app.onError`
- [x] Log per-request latency to the database, so the cross-cloud number from #1 stays visible rather than becoming folklore
- [x] **Somewhere for #6's service tests to run.** `docs/spec/13` makes a real
  database the primary test level, and CI had none

**The typecheck "baseline mismatch" was one stale hash.** `tracking_enabled`
from `0001` widened the `communities` row type, and the error message
`tsc-baseline` hashes embeds a column count — `... 7 more ...` became
`... 8 more ...`. Same file, same error, new hash. Re-saved the baseline rather
than fixing the underlying error, because it is in the frozen events module.
Still 15 baselined errors, none added.

**Two CI jobs, because validation is one shared database.** `checks` runs the
workspace three ways. `database-tests` runs `*.db.test.ts` behind a
`validation-database` concurrency group so runs queue instead of overlapping,
applies `migrate:validation` first so the suite never fails with a confusing
"relation does not exist", and skips on forked pull requests where secrets do
not exist. Fixture identifiers come from `test/support/fixtures.ts` and carry a
per-run suffix; two concurrent runs otherwise contend on the unique indexes
over `(community_id, email)` and `(community_id, external_id)`.

**It is slow, and that is the cost of the choice.** Validation is in Frankfurt
and GitHub runners are not, so every query is a ~100 ms round trip — three
trivial tests take 4.5 seconds. Fine for #6. Revisit before every slice has a
service test; the fix is a Postgres service container with `migrations/`
applied, which also removes the sharing problem.

**The deploy gate is scoped, not the whole workspace.**
`pnpm --filter "@luhive/core-api..."` also selects `@luhive/db` and
`@luhive/domain`, so a breaking change in either fails before anything is
built. Database tests are not repeated there — CI ran them on the pull request,
and a second run would contend for the same validation database. Images build
with `az acr build`, tagged with the commit SHA rather than a mutable `0.1.0`,
and the workflow waits for the new revision to become `latestReadyRevision`
before trusting `/health`, since mid-switch that endpoint can still be answered
by the outgoing revision.

**Nothing new holds a credential.** `azure/login` uses a federated OIDC
credential, so there is no service principal secret in GitHub — the same
posture #4 established for the runtime identity.

### The federated credential subject is not what the documentation shows

The repository emits **immutable OIDC subjects**, so the subject claim is

```
repo:Luhive@236995820/luhive@1075537951:ref:refs/heads/main
```

not `repo:Luhive/luhive:ref:refs/heads/main`. Those numbers are the owner id
and the repository id. Azure compares the subject as a literal string, so a
credential created from the name-based form in every tutorial fails with
`AADSTS700213: No matching federated identity record found`, naming neither
the cause nor the setting.

Check it rather than assume it — the setting is per repository:

```sh
gh api repos/Luhive/luhive/actions/oidc/customization/sub
# {"use_default":true,"use_immutable_subject":true,
#  "sub_claim_prefix":"repo:Luhive@236995820/luhive@1075537951"}
```

**Use the immutable form; do not turn the setting off to make the tutorial
work.** It exists for exactly the thing we did on 22 September — renaming
`luhive-mvp` to `luhive`. With name-based subjects, whoever creates a
repository at the freed-up old name can mint tokens that satisfy a stale
federated credential. Ids cannot be squatted, so the ID form is both safer and
more durable: a future rename or transfer will not invalidate it.

The token carries `job_workflow_ref` too. Matching on anything beyond
`subject`, `issuer` and `audience` needs Azure's flexible federated identity
credentials, which is more machinery than one branch-scoped subject deserves.

### Three traps in the telemetry wiring, all of which fail silently

Every one of these produced a process that started cleanly, served `/health`,
logged correctly — and reported nothing. None of them would have been noticed
without checking that a span was actually recording.

**1. The initialiser has to be a preload.** `src/telemetry/start.ts` runs as
`node --import ./dist/telemetry/start.js dist/index.js`. OpenTelemetry patches
`pg` and `node:http` as they load, and a bundled ESM entry evaluates every
external import before any of its own body — so `useAzureMonitor()` in module
code runs after `pg` is already loaded. Confirmed by reading the import order
in `dist/index.js`, which is why the entry is split. Moving it back to a normal
import from `index.ts` is the change to not make.

**2. `import` of a built-in bypasses the instrumentation hook.** OpenTelemetry
patches through a CommonJS `require` hook, so `import { createServer } from
"node:http"` is never intercepted: no server span, and therefore
`recordException` has nothing to attach to. Fixed by
`register("@opentelemetry/instrumentation/hook.mjs", …)` in the preload, with
`@opentelemetry/instrumentation` pinned to the distro's own `0.221.0` — a
second copy registers a second hook.

**3. `samplingRatio` was being ignored entirely.** The distro picks its sampler
by precedence, and a positive `tracesPerSecond` wins over `samplingRatio`. It
defaults to **5**, so the configured `samplingRatio: 1` never applied and every
span came back `NonRecordingSpan` — including in plain CommonJS with no
bundling, which is how it was isolated. `tracesPerSecond: 0` is what makes
`samplingRatio` take effect.

Verified end to end: with a connection string, a request handler sees a
recording `SpanImpl`; without one, no provider is registered, the distro is
never even imported, and `recordException` no-ops. The startup line reports
`telemetry: true | false`, so which state production is in is answerable from
logs rather than assumed.

**`db_ms` is Kysely's query time, not the whole story.** Kysely takes its
`queryDurationMillis` around execution on an already-acquired connection, so it
excludes pool wait and connection setup. That makes it exactly the 3 ms
cross-cloud number, per request — and it means the 278 ms cold connection shows
up as a gap between `duration_ms` and `db_ms` rather than inside `db_ms`. Good
enough to size the `idleTimeoutMillis` decision at #8 with real traffic.

**`AcrPush` is not enough for the build step.** `az acr build` does not just
push an image, it queues an ACR Task, which needs
`Microsoft.ContainerRegistry/registries/scheduleRun/action`. That action is in
`Contributor` and not in `AcrPush`. Either grant `Contributor` scoped to the
registry resource, or define a custom role with `scheduleRun/action` plus the
`AcrPush` data actions. Scope both CI assignments to the individual resource,
never the resource group.

### Where this stands, 23 September

- `checks` passes on a runner — the first time any of Stage 1 has been
  verified outside a laptop. `--frozen-lockfile`, typecheck, build, 56 tests,
  1m29s
- `database-tests` reached its preflight guard and stopped with the message it
  was written to produce. It has not yet run against validation
- The deploy `gate` passes in 45s, and `azure/login` now fails at subject
  matching rather than missing values — so the three Azure secrets resolve and
  the identity is found. The subject is the one thing left
- The deployed revision is still the one pushed by hand at #4

**Still not doable from the repo:** correcting the federated credential to the
immutable subject, and adding the Application Insights connection string to
Key Vault and referencing it on the container app.

**Unexplained, and worth remembering if it recurs.** The Stage 1 commits were
pushed on 21 September and produced no CI run at all — not on the branch push,
not on the pull request, not on the merge to `main`. Actions was enabled, all
actions allowed, the workflow `active`, the repo public, and no commit carried
a skip marker. CI has triggered normally since. No cause was found, so treat a
missing run as possible rather than impossible, and check that a run exists
before believing a green branch.

---

## Out of scope for Stage 1

- The mail queue — Stage 2, and it depends on `person` existing
- Segments, campaigns, chat
- Migrating loaders — commands only; reads stay in `apps/web`
- Any change to `app/modules/events/**` beyond pointing the registration action at core
- Public `/v1` endpoints on `apps/integration-api` — Stage 3

## The pilot — what Enverson actually gets first

Ingest is **not** being built yet. Enverson exports 40–50 users with onboarding data; that shapes the newsletter, the segments, and eventually the ingest API — designed around observed data rather than the sketch's guesses.

The same 50 people are the DNS warm-up seed list. One ask serves both.

- [ ] **DPA signed before the file arrives.** 50 real people's personal data makes Luhive a processor. Short-form DPA, per the Enverson decision log
- [ ] **The export never touches git.** A CSV of 50 real emails committed to a repo survives in history. Keep it outside the working tree, or gitignore the path first
- [ ] Tell them what *not* to send — no transcripts, no recordings, no payment details. The rule is anything with no concrete use
- [ ] Fields to request: `external_id`, `email`, `name`, `locale`, `plan`, `subscription_status`, `signed_up_at`, `last_active_at`, plus the onboarding answers. `attributes` jsonb absorbs whatever shape those take
- [ ] Import script — CSV → `person` + `person_event` rows against Enverson's community row. **A script, not an API**
- [ ] Build a segment from real `attributes`, then send a real newsletter through Luhive

**Churn is out of scope.** They use PostHog, and per [[Luhive Pivot Thesis]] analytics is a comparison we lose. But the **holdout stays** — mark `skipped_holdout` at enqueue and read the retention comparison from PostHog. H2 is the bet the whole newsletter rests on, and without a control group it is unmeasurable.

## Sending — simple now, queue on a trigger

Sends go through Luhive from the start, not manual Resend blasts. At 50 recipients a simple loop is fine; the [[Mail Queue - Spec]] exists to stop 1,000-message sends blocking a request and double-sending on a crash, neither of which applies yet.

> **Trigger: the queue becomes mandatory before the ramp passes ~250/day, or before any send that is not a one-off list.**

Two things to build into the first send, because retrofitting them is painful:

- [ ] **Every send writes a `person_event`** — `email_sent`, then `email_opened` / `email_clicked` from Resend webhooks. That history is what makes "opened the last three newsletters" a segment later, and it cannot be backfilled
- [ ] **Suppression checked at send time, not at list build.** Someone who unsubscribes in between must not receive it
- [ ] Unsubscribe link from send one — CAN-SPAM, applies to their US subscribers, not a GDPR question

## Warm-up, running in parallel

DNS for `mail.enverson.com` is configured in Resend. **That is not warm-up.** Reputation comes from sending increasing volume over roughly two weeks; a verified domain that has never sent is still cold.

- [ ] Confirm SPF, DKIM and DMARC show **verified**, not merely added. DMARC starts at `p=none`
- [ ] First real newsletter to the pilot 50 — genuinely useful, not a test blast. Engagement builds reputation; ignored mail does not
- [ ] Ramp on the numbers, not the calendar: 50/day → 100 → 250 → 500 → 1,000, stepping up only while bounces stay under 2% and complaints under 0.1%. Hold if either climbs

By the time Stage 2's queue lands, the domain is warm and the queue inherits a reputation instead of building one under load.
