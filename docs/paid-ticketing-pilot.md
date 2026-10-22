# Paid ticketing pilot

One Azerbaijani community sells paid tickets for its events. Luhive is the **data
side only**: we never touch a payment provider. A community partner exposes an
API that creates the epoint.az transaction and returns a payment link; when the
user pays, the partner calls our integration API and we confirm the registration.

This is a pilot (max ~50 registrations per event). It is built to ship fast and
to be folded into `apps/core-api` (`slices/ticketing/`) after Stage 1 #9. Every
shortcut is listed under [Temporary shortcuts](#temporary-shortcuts).

`app/modules/events/**` is unfrozen for this feature only (owner decision,
29 Sep 2026). The exception is recorded in `docs/spec/12`. It also covers the
manual payment provider added on 19 Oct 2026 (section 13).

## Status

Finished 30 Sep 2026. M1–M8 are built. A real Checkila payment confirmed a
registration in production and both emails went out. Mark as paid, resend, and
the revenue cards are in [PR #161](https://github.com/Luhive/luhive/pull/161).
The paid registration branch and the internal email route stay in the web app
until the core ticketing slice (see [Temporary shortcuts](#temporary-shortcuts)).

---

## 1. Decisions

| Topic | Decision |
|---|---|
| Money | Integer minor units (`price_minor`, qəpik). 1 AZN = 100. Never floats. |
| Currency | `AZN` only, stored per event for forward compatibility. |
| Free vs paid | `price_minor IS NULL` means free. A price must be > 0. |
| Feature flag | `communities.settings.features.paid_ticketing` (JSON, absent = off). Same mechanism as `public_page`, `join`, `events`, `newsletter` from migration 0001. Enabled by hand for the pilot community only. |
| Approval | Payment is the gate. A paid registration is auto-approved on payment. `is_approve_required` is ignored for priced events. |
| Payment record | Separate `ticket_orders` table, one row per registration. Price is snapshotted on the order. |
| Confirmation | Partner callback to `integration-api`, plus a manual "mark as paid" in the admin panel. Both call the same confirm rule. |
| Partner | Checkila (`back.checkila.com`), which creates the Epoint payment. Contract: `LUHIVE_INTEGRATION.md` from the partner, summarised in section 6. |
| Payment identity | Checkila only takes a `userId` string. We send the **registration id** as `userId` and it comes back unchanged in the callback. It is the order lookup key. |
| Callback auth | Existing API-key system: a **community** key locked to the pilot community, scope `payments:confirm`. Checkila sends it in the `x-api-key` header, so the callback route reads that header (and still accepts `Authorization: Bearer`). |
| Confirmation email | Sent by `apps/web` (existing template) to the attendee **and** to the organizer. `integration-api` calls a temporary internal web route. |
| Tenant scoping | Application code only. No new RLS policies. |
| Refunds | Manual outside the system. Status `refunded` exists so revenue stays correct. |

---

## 2. Data model

New migration: `packages/db/migrations/0003_add_paid_ticketing.sql`.
Hand-written SQL, applied to the validation database first, then to production
by the manual run in `packages/db/README.md`. After production, run
`pnpm --filter @luhive/db codegen` to regenerate `db.types.ts` and
`supabase.types.ts`. Never edit generated files.

```sql
-- Paid ticketing pilot: event price, payment orders, callback audit log.
-- The community flag needs no column: it lives in communities.settings.features
-- (key `paid_ticketing`, absent means off).

ALTER TABLE public.events
  ADD COLUMN price_minor integer,
  ADD COLUMN currency text DEFAULT 'AZN' NOT NULL,
  ADD CONSTRAINT events_price_minor_positive
    CHECK (price_minor IS NULL OR price_minor > 0),
  ADD CONSTRAINT events_currency_format
    CHECK (currency ~ '^[A-Z]{3}$');

COMMENT ON COLUMN public.events.price_minor IS
  'Ticket price in minor units (qəpik). NULL means the event is free.';

CREATE TABLE public.ticket_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    community_id uuid NOT NULL,
    event_id uuid NOT NULL,
    registration_id uuid NOT NULL,
    amount_minor integer NOT NULL,
    currency text NOT NULL,
    status text DEFAULT 'pending' NOT NULL,
    payment_url text,
    partner_reference text,
    transaction_id text,
    paid_via text,
    paid_at timestamp with time zone,
    marked_paid_by uuid,
    confirmation_email_sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ticket_orders_pkey PRIMARY KEY (id),
    CONSTRAINT ticket_orders_registration_id_key UNIQUE (registration_id),
    CONSTRAINT ticket_orders_amount_minor_positive CHECK (amount_minor > 0),
    CONSTRAINT ticket_orders_currency_format CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT ticket_orders_status_check
      CHECK (status IN ('pending', 'paid', 'refunded')),
    CONSTRAINT ticket_orders_paid_via_check
      CHECK (paid_via IS NULL OR paid_via IN ('partner_callback', 'manual')),
    -- A paid or refunded order always says how and when it was paid.
    CONSTRAINT ticket_orders_paid_fields_check
      CHECK (status = 'pending' OR (paid_via IS NOT NULL AND paid_at IS NOT NULL))
);

COMMENT ON TABLE public.ticket_orders IS
  'One payment attempt per paid registration. amount_minor/currency are a snapshot of the event price at purchase time.';

COMMENT ON COLUMN public.ticket_orders.partner_reference IS
  'Checkila paymentId, stored when the payment link is created. The callback must echo it as checkilaRequestId.';
COMMENT ON COLUMN public.ticket_orders.transaction_id IS
  'Epoint transaction id from the callback, for reconciliation. NULL for manual payments.';

-- A Checkila payment and an Epoint transaction can each belong to one order.
CREATE UNIQUE INDEX ticket_orders_partner_reference_key
  ON public.ticket_orders (partner_reference)
  WHERE partner_reference IS NOT NULL;

CREATE UNIQUE INDEX ticket_orders_transaction_id_key
  ON public.ticket_orders (transaction_id)
  WHERE transaction_id IS NOT NULL;

CREATE INDEX ticket_orders_event_id_status_idx
  ON public.ticket_orders (event_id, status);

CREATE INDEX ticket_orders_community_id_status_idx
  ON public.ticket_orders (community_id, status);

-- RESTRICT, never CASCADE: deleting a registration or event must not silently
-- erase payment history. Cancelling an unpaid registration deletes its pending
-- order first, in application code; a paid registration cannot be deleted.
ALTER TABLE ONLY public.ticket_orders
  ADD CONSTRAINT ticket_orders_community_id_fkey
  FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.ticket_orders
  ADD CONSTRAINT ticket_orders_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.ticket_orders
  ADD CONSTRAINT ticket_orders_registration_id_fkey
  FOREIGN KEY (registration_id) REFERENCES public.event_registrations(id) ON DELETE RESTRICT;

CREATE TABLE public.payment_callbacks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    key_id text,
    registration_id uuid,
    payload jsonb NOT NULL,
    outcome text NOT NULL,
    CONSTRAINT payment_callbacks_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.payment_callbacks IS
  'Append-only audit of every payment callback, including rejected ones. registration_id has no foreign key on purpose: forged or stale ids must still be recorded.';

CREATE INDEX payment_callbacks_registration_id_idx
  ON public.payment_callbacks (registration_id, received_at DESC);

-- Scoping lives in application code, same as people/person_events. Web and
-- integration-api reach these tables with the service-role client only.
ALTER TABLE public.ticket_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_callbacks DISABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ticket_orders FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.payment_callbacks FROM PUBLIC, anon, authenticated;
```

Notes:

- `payment_callbacks.outcome` values: `confirmed`, `already_paid`,
  `not_found`, `wrong_community`, `amount_mismatch`, `invalid_payload`.
- The web app has its own generated `~/shared/models/database.types`. Sync it in
  the same PR, otherwise the web typecheck will not see the new columns.
- Web reads `ticket_orders` through `createServiceRoleClient()` in `*.server.ts`
  files. Never from the browser client. Authorisation (is the caller an admin of
  this community?) is checked in the route/loader before the query.

### Enabling the pilot community (manual, after deploy)

Not part of the migration. Run once, by hand, against production:

```sql
UPDATE public.communities
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{features,paid_ticketing}',
  'true'::jsonb,
  true
)
WHERE slug = '<pilot-community-slug>';
```

`jsonb_set` with `create_missing = true` creates `features.paid_ticketing`
without touching sibling flags. If `settings.features` itself is missing, set it
first (the 0001 backfill guarantees it exists for existing communities).

### Community settings reference

Read settings in code through `@luhive/domain/v1/community-settings`, imported
as a namespace. Never index the JSON by hand:

```ts
import * as CommunitySettings from "@luhive/domain/v1/community-settings";

CommunitySettings.hasFeature(community.settings, CommunitySettings.Feature.PaidTicketing);
CommunitySettings.getPaymentProvider(community.settings); // "checkila" | "manual"
```

| Key | Values | Absent means |
|---|---|---|
| `features.public_page`, `features.join`, `features.events`, `features.newsletter` | `true` / `false` | off |
| `features.paid_ticketing` | `true` / `false` | off |
| `payments.provider` | `"checkila"` / `"manual"` | `manual` |

Only a literal `true` turns a feature on. An unknown provider counts as manual,
so a community never creates Checkila links by accident: Checkila only calls
back for communities that have a key.

Turn on paid ticketing with a provider, in one statement:

```sql
UPDATE public.communities
SET settings = jsonb_set(
  jsonb_set(COALESCE(settings, '{}'::jsonb), '{features,paid_ticketing}', 'true'::jsonb, true),
  '{payments}', '{"provider": "manual"}'::jsonb, true  -- or "checkila"
)
WHERE slug = '<community-slug>';
```

Check what a community has:

```sql
SELECT slug, settings -> 'features' -> 'paid_ticketing' AS paid_ticketing,
       settings -> 'payments' ->> 'provider' AS provider
FROM public.communities WHERE slug = '<community-slug>';
```

---

## 3. Order and registration states

```
                   register (paid event)
  (none) ─────────────────────────────────▶ registration: approval_status=pending
                                             order:        status=pending
                                                   │
                     partner callback  ───────────┤
                     or admin "mark paid"          ▼
                                             registration: approval_status=approved,
                                                           checkin_token issued
                                             order:        status=paid,
                                                           paid_via, paid_at
                                                   │
                     manual, admin only            ▼
                                             order: status=refunded
                                             (registration handled by hand)
```

- Unpaid registrations are `approval_status = 'pending'`. In the registrants list
  they are shown as **Unpaid** (from the order), so admins do not mistake them
  for the normal "awaiting approval" state. The normal approve button is hidden
  for registrations that have a pending order.
- Unpaid registrations do **not** consume capacity (`getApprovedRegistrationCount`
  counts approved only). Capacity is not re-checked at confirmation: a person who
  has paid is confirmed even if the event just filled up. Log a warning when
  `approved count > capacity` after a confirm.
- Cancelling an unpaid registration: delete the pending order, then the
  registration. Cancelling a paid registration is refused in the UI and API with
  "Paid tickets are cancelled by the organiser". Refunds happen outside Luhive.

---

## 4. The shared confirm rule

One function is the only place that turns an order into `paid`. It is used by
the integration callback and by the admin "mark as paid" action.

Input: `registrationId`, `paidVia` (`partner_callback` | `manual`),
`transactionId?` (Epoint), `markedPaidBy?`.

It runs as a single conditional update so concurrent callers cannot both win:

1. `UPDATE ticket_orders SET status='paid', paid_via=$1, paid_at=now(), transaction_id=$2, marked_paid_by=$3, updated_at=now() WHERE registration_id=$4 AND status='pending' RETURNING *`.
2. If it returned a row: `UPDATE event_registrations SET approval_status='approved', checkin_token=COALESCE(checkin_token, gen_random_uuid()::text), updated_at=now() WHERE id=$4`, then report `confirmed`.
3. If it returned nothing: read the order. Already `paid` → report `already_paid` (success, idempotent). Missing → `not_found`. `refunded` → `conflict`.

Steps 1–2 must be one transaction. `apps/integration-api` uses the Supabase
client, so implement the pair as a single Postgres function called through
`rpc` (SQL function `confirm_ticket_order`) **or** as two statements with a
compensating check. Preferred: a small SQL function added to the same migration,
so both apps share the exact rule:

```sql
CREATE FUNCTION public.confirm_ticket_order(
  p_registration_id uuid,
  p_paid_via text,
  p_transaction_id text,
  p_marked_paid_by uuid
) RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_updated integer;
  v_status text;
BEGIN
  UPDATE public.ticket_orders
  SET status = 'paid',
      paid_via = p_paid_via,
      paid_at = now(),
      transaction_id = p_transaction_id,
      marked_paid_by = p_marked_paid_by,
      updated_at = now()
  WHERE registration_id = p_registration_id AND status = 'pending';
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 1 THEN
    UPDATE public.event_registrations
    SET approval_status = 'approved',
        checkin_token = COALESCE(checkin_token, gen_random_uuid()),
        updated_at = now()
    WHERE id = p_registration_id;
    RETURN 'confirmed';
  END IF;

  SELECT status INTO v_status
  FROM public.ticket_orders WHERE registration_id = p_registration_id;

  IF v_status IS NULL THEN RETURN 'not_found'; END IF;
  IF v_status = 'paid' THEN RETURN 'already_paid'; END IF;
  RETURN 'conflict';
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_ticket_order(uuid, text, text, uuid)
  FROM PUBLIC, anon, authenticated;
```

If the reviewer prefers no SQL functions, the fallback is two statements in
order (order first, registration second) with the registration update being
idempotent; a crash between them is repaired by "mark as paid" again. Pick one
and delete the other from this doc before merge.

`checkin_token` is a `uuid` column (verified in `0000_baseline.sql`), so the
function uses `gen_random_uuid()` without a cast.

---

## 5. Flows

### 5.1 Create / edit event (web, events module)

- Price field (AZN, decimal input) appears in the event form **only if** the
  community's `paid_ticketing` flag is on. The form converts to `price_minor`
  (`Math.round(value * 100)`) on submit.
- Server-side, in the create and update event actions: if a price is submitted
  and the flag is off, reject with a form error. The UI hiding the field is not
  enforcement.
- If a price is set, `is_approve_required` is stored as `false` and the toggle is
  disabled with the hint "Payment confirms the registration".
- Changing the price of an event that already has orders does not touch existing
  orders (snapshot). Show a notice: "Existing tickets keep their original price".
- Clearing the price back to free is refused while any `pending` or `paid` order
  exists for the event.
- Price validation: integer, `> 0`, upper bound 100000 AZN for the pilot.

### 5.2 Event page (web)

- Where the page shows "Free", show the formatted price when `price_minor` is
  set (`Intl.NumberFormat('az-AZ', { style: 'currency', currency })`).
- Registration button reads "Buy ticket" for priced events.
- Checkila does **not** accept a return URL: after paying, the browser lands on a
  Checkila page, not on Luhive. So the event page cannot rely on a redirect back.
  Instead the registration card is state-driven for a user who has a
  registration:
  - order `pending` → "Complete your payment" with a **Pay now** button (the
    stored `payment_url`) and the note "Your ticket is confirmed by email once
    payment is received".
  - approved (order `paid`) → the normal ticket/check-in view.
- Ask Checkila (open question 1) to add a "Back to event" link on their landing
  page pointing at the event URL. It is optional and needs no change on our side.
- The confirmation email is the main signal to the user that the payment worked.

### 5.3 Registration (web, `completeEventRegistration`)

New branch after the existing validation, when `event.price_minor` is set:

1. Re-check the flag: `community.settings.features.paid_ticketing === true`.
   Otherwise fail with "Paid tickets are not available for this community".
2. If a registration already exists for this user and event:
   - order `paid` → existing "already registered" result.
   - order `pending` → do **not** fail. Return the stored `paymentUrl`. If the
     order has no `payment_url` yet (the earlier partner call failed), request a
     link now. Do not create a second Checkila payment for an order that already
     has one, because the `partner_reference` must stay unique. This replaces the
     current dead end at the duplicate check for the abandoned-payment case.
3. Otherwise insert the registration with `approval_status: 'pending'` and
   `checkin_token: null` (do not use `event.is_approve_required`).
4. Insert the order: snapshot `amount_minor = event.price_minor`,
   `currency = event.currency`, `community_id = event.community_id`.
5. Call the partner (section 6) with `userId = registration.id`. On success
   store `payment_url` and `partner_reference` (Checkila's `paymentId`) and
   return `{ success: true, paymentUrl }`.
6. On partner failure or timeout: keep registration and order, return
   `{ success: false, error: "Could not start payment. Please try again." }`.
   The next attempt hits step 2 and creates the link then.
7. Skip the confirmation email, the organiser notification and the community
   join side effects until payment. Those move to the confirmation step
   (section 7). Community join on paid events happens at confirmation.

The action's caller redirects the browser to `paymentUrl`.

Result type gains an optional `paymentUrl?: string`.

### 5.4 Payment callback (integration-api)

`POST /v1/payments/confirm`

The URL Checkila is configured with (`LUHIVE_APPROVAL_URL`) is
`https://<integration-api-host>/v1/payments/confirm`.

Auth middleware `paymentCallbackAuth` (new, next to `partnerAuth`):

- Reads the key from the `x-api-key` header (Checkila's format), falling back to
  `Authorization: Bearer`. Verify with `verifyApiKey`.
- `key_kind === 'community'` and `community_id` not null.
- `scopes` includes `payments:confirm`.
- Otherwise 401 / 403 as `partnerAuth` does.

Request body, exactly as Checkila sends it (zod):

```json
{
  "userId": "registration uuid",
  "status": "success",
  "amount": 25.0,
  "checkilaRequestId": "8f14e45f-ceea-467e-b9a1-abcdef123456",
  "transactionId": "epoint-txn-abc123"
}
```

- `userId` must be a uuid: it is our registration id.
- `status` must be `"success"`. Anything else → 400 `invalid_payload`.
- `amount` is a positive number in AZN. Convert once with
  `Math.round(amount * 100)` and compare in minor units.
- `transactionId` may be `null`.

Handler:

1. Validate body (400 `invalid_payload`).
2. Load order + event by `registration_id = userId`. Missing → 404 `not_found`.
3. `event.community_id !== ctx.community_id` → 403 `wrong_community`.
4. Order `currency` must be `AZN` and converted `amount` must equal
   `order.amount_minor`, otherwise 422 `amount_mismatch`. The order stays pending.
5. `checkilaRequestId` must equal the order's stored `partner_reference` (the
   `paymentId` we got when creating the link), otherwise 422
   `reference_mismatch`. This ties the callback to the exact payment we created.
   If the order has no `partner_reference` (link creation failed but the user
   paid through an earlier attempt), accept and store it.
6. Call `confirm_ticket_order(userId, 'partner_callback', transactionId, null)`.
7. Map result: `confirmed` → 200; `already_paid` → 200 (idempotent, retries are
   expected by Checkila); `conflict` → 409; `not_found` → 404. A duplicate
   `transactionId` on a different order violates
   `ticket_orders_transaction_id_key` → 409 `conflict`.
8. If `confirmed`: fire the email call (section 7) **after** the database update,
   with a 5 s timeout; failures are logged only.
9. Always append a `payment_callbacks` row with the outcome, including rejects.

Response: Checkila only checks for a `2xx` and ignores the body. The endpoint
uses the API's existing envelope (`ok` discriminator):

```json
{ "ok": true, "data": { "registration_id": "uuid", "status": "paid" } }
```

Failures are `{ "ok": false, "error": { "code": "<outcome>" } }`, with the
outcome codes listed above (`not_found`, `wrong_community`, `amount_mismatch`,
`reference_mismatch`, `conflict`, `invalid_payload`).

Implementation notes (M5):

- The community check compares the key's `community_id` with
  `ticket_orders.community_id`, which is copied from the event's host community
  when the order is created. No join to `events` is needed.
- The rules live in `lib/payment-callback-rules.ts` (pure), the database work
  in `services/payment-confirmation.ts`, and `routes/payments.ts` only wires
  authentication, validation, the service, and the audit row.
- A body that fails validation is still written to `payment_callbacks`
  (`invalid_payload`), limited to the five documented fields.

Error statuses matter: Checkila retries on non-`2xx`, so only return 5xx for
real server errors. Permanent rejects (mismatch, wrong community) are 4xx.

Creating the pilot key: use the existing script, which already inserts
`key_type = 'secret'` like other rows. The community default scope is
`events:read`, so the scope must be passed explicitly:

```sh
cd apps/integration-api
pnpm create-key --kind community --name "Checkila payments (pilot)" \
  --community <pilot-community-uuid> --scopes payments:confirm
```

Give the raw key to Checkila to set as `LUHIVE_OUTBOUND_API_KEY`. It is shown
once.

### 5.5 Admin "mark as paid" (web)

- In the registrants list, a row with a pending order shows an **Unpaid** badge
  and a **Mark as paid** action (community admins only, same authorisation as the
  existing registration status updates).
- It calls `confirm_ticket_order(registrationId, 'manual', null, adminUserId)`
  through the service-role client, then sends the confirmation email directly
  (no HTTP hop, section 7).
- Also add **Resend confirmation** for paid registrations.
- Both write no `payment_callbacks` row (manual actions are identified by
  `paid_via = 'manual'` and `marked_paid_by`).

---

## 6. Partner outbound client (web)

Checkila contract (their `LUHIVE_INTEGRATION.md`):

```
POST https://back.checkila.com/integrations/luhive/payments
x-api-key: <CHECKILA_API_KEY>
{ "userId": "<registration id>", "amount": 25.00, "description": "..." }

201 { "paymentId": "uuid", "paymentUrl": "https://checkila.com/luhive/pay/<uuid>" }
400 / 401 / 500 { "error": "..." }
```

- `userId` is a free string on their side. We always send the **registration id**.
- `amount` is AZN as a decimal number: send `price_minor / 100`.
- `description`: event title, trimmed to 255 characters.
- There is no `currency`, no return URL and no customer email/name field.

Code shape, one file per concern under `apps/web/app/modules/events/`:

- `server/payments/checkila-client.server.ts` — an interface
  `createPaymentLink({ registrationId, amountMinor, description }) =>
  { paymentUrl, paymentId }` with a real HTTP implementation and a **fake
  implementation** used when `CHECKILA_FAKE=true`, so the whole flow (including a
  fake callback against integration-api) can be tested without the partner.
- 8 s timeout, no retries in the request path.
- Only `AZN` events are allowed while this client is the only provider.
- Env (web): `CHECKILA_API_URL`, `CHECKILA_API_KEY`, `CHECKILA_FAKE`.

Never log the payment URL or either key. **The Checkila key was sent in a
plain-text file in Downloads.** Put it only in the deployment environment, never
in the repo, and consider asking Checkila to rotate it once the pilot is live.

Open questions for Checkila:

1. A "Back to event" link on their post-payment landing page (we cannot pass a
   return URL).
2. Do they retry the callback on non-`2xx`, how many times, and over what time?
3. Does the payment link expire? (Decides whether "Pay now" on an old pending
   order still works.)
4. Is there a way to look up a payment's status by `paymentId`, for
   reconciliation? Until then, **Mark as paid** is the safety net.

---

## 7. Confirmation email (temporary web route)

Temporary internal route in `apps/web/app/routes`:
`POST /api/internal/paid-registration-email`. Header comment states it is
temporary and belongs in the future core `ticketing` slice.

- Auth: `X-Internal-Secret` header compared in constant time against
  `INTERNAL_API_SECRET`. Missing or wrong → 404 (do not reveal the route).
- Body: `{ "registration_id": "uuid" }` only.
- The route loads everything itself with the service-role client: registration,
  order, event, community, user email and name.
- It sends **only if** the registration is `approved`, the order is `paid`, and
  `confirmation_email_sent_at IS NULL`. Otherwise it returns 200 without sending.
- Sends via the existing `sendRegistrationAttendeeEmail` with
  `approvalStatus: 'approved'` and the registration's `checkin_token`, then sets
  `confirmation_email_sent_at = now()`.
- **Organizer notification:** the same helper also calls
  `sendRegistrationOrganizerNotifications` (host and accepted co-host
  communities, as in the free flow), with the paid amount added to the
  message if the template supports it. The attendee email and the organizer
  notification are sent independently: a failure in one must not skip the other.
  The organizer notification is sent once, guarded by the same
  `confirmation_email_sent_at`; **Resend confirmation** re-sends the attendee
  email only.
- Returns 200 on success or skip; 500 only on a send failure.
- A shared helper `sendPaidRegistrationConfirmation(registrationId)` in
  `apps/web/.../server/` holds the logic. The route and the admin actions
  (mark as paid, resend) both call it. "Resend" ignores the
  `confirmation_email_sent_at` guard.

Integration-api side:

- New env: `WEB_INTERNAL_URL`, `INTERNAL_API_SECRET` (added to `EnvSchema`).
- After `confirmed` only, `fetch(WEB_INTERNAL_URL + path, { method: 'POST', headers, body, signal: AbortSignal.timeout(5000) })` inside try/catch that logs and swallows.
- The callback must still return 200 when the email call fails.

Community join on paid events (`ensureCommunityMembership`) also happens inside
`sendPaidRegistrationConfirmation`, since it was skipped at registration time.

---

## 8. Dashboard

### 8.1 Per-event revenue (event analytics page)

A revenue panel with, for one event:

- Revenue: sum of `amount_minor` where `status = 'paid'`.
- Paid tickets count, unpaid (pending) count.
- Average ticket price is not needed; skip.
- Manual vs callback split is optional (`paid_via`).

Query (web, server-side, service-role, after an authorisation check that the
caller manages this event's community):

```sql
SELECT
  COALESCE(SUM(amount_minor) FILTER (WHERE status = 'paid'), 0) AS revenue_minor,
  COUNT(*) FILTER (WHERE status = 'paid')    AS paid_count,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
  MAX(currency) AS currency
FROM ticket_orders
WHERE event_id = $1;
```

Refunded orders are excluded from revenue by the `status = 'paid'` filter.

### 8.2 Dashboard event list

A "Revenue" block on the dashboard events list: total paid revenue across the
community's events, and a per-row revenue value for priced events. One grouped
query by `event_id` for the events on the page, not one query per row:

```sql
SELECT event_id,
       COALESCE(SUM(amount_minor) FILTER (WHERE status = 'paid'), 0) AS revenue_minor,
       COUNT(*) FILTER (WHERE status = 'paid') AS paid_count
FROM ticket_orders
WHERE community_id = $1 AND event_id = ANY($2)
GROUP BY event_id;
```

The revenue block is shown only for communities with the flag on. Do not let
revenue loading block the events list: load it as a deferred loader value so the
list renders first (architecture rule: slow data never blocks fast content).

Display formatting lives in one shared helper (`formatMoney(minor, currency)`),
used by the event page, the event form, and both dashboards.

---

## 9. Web change list

Grouped by folder, following the module layout rules (models, data, server,
components, hooks; no exported types inside components, hooks or pages).

- `packages/db/migrations/0003_add_paid_ticketing.sql` — section 2 and the SQL
  function in section 4.
- `modules/events/model/` — ticket order and payment types; extend event form
  and registration result types (`paymentUrl`).
- `modules/events/data/ticket-orders-repo.server.ts` — create pending order,
  find order by registration, delete pending order, revenue queries, mark email
  sent.
- `modules/events/server/payments/` — partner client (+ fake), confirm wrapper
  around `confirm_ticket_order`, `sendPaidRegistrationConfirmation`.
- `modules/events/server/complete-event-registration.server.ts` — paid branch
  (5.3).
- Event create/update actions — price and flag enforcement (5.1).
- `modules/events/server/api-delete-registration.server.tsx` — delete pending
  order first, refuse paid.
- `modules/events/server/api-update-registration-status.server.tsx` — block
  manual approve for registrations with a pending order.
- Event form components — price field, disabled approval toggle.
- Event detail components — price display, "Buy ticket", return-from-payment
  states.
- Registrants list components — Unpaid badge, Mark as paid, Resend.
- Dashboard components/routes — per-event revenue panel, list revenue block.
- `app/routes/api.internal.paid-registration-email.ts` — temporary route (7).
- Integration API: `routes/payments.ts`, `middleware/payment-callback-auth.ts`,
  `schemas/payments.ts`, `services/payment-confirmation.ts`, mounted in
  `app.ts` under `/v1/payments`; `env.ts` additions.
- `docs/spec/12` exception note; daily log entry per `docs/logs/how-to-log.md`.

---

## 10. Security checklist

- Flag checked on the server at event save **and** at registration.
- Callback: key hash verification (existing), kind and scope check, community
  match, amount and currency match, idempotent confirm, full audit trail.
- Internal email route: constant-time secret, 404 on failure, sends only for
  paid+approved registrations, once.
- No payment URL or key in logs. Callback payloads in `payment_callbacks`
  contain no card data (partner sends none).
- Service-role reads of `ticket_orders` only after an explicit community-admin
  check in the caller.
- No new RLS policies. Tables are revoked from `anon` and `authenticated`.

---

## 11. Test plan

Automated (integration-api, vitest, existing setup):

- Auth: missing key, partner key, key without scope → 401/403.
- Wrong community key → 403 `wrong_community`.
- Amount mismatch → 422, order stays pending.
- Confirm sets order paid, registration approved, token present.
- Same callback twice → both 200, one state change, one email call.
- Unknown registration → 404. Refunded order → 409.
- Email fetch failure does not change the 200.

Automated (web):

- Price rejected when the flag is off.
- Registration on a paid event creates pending registration + order, returns
  `paymentUrl`, sends no email.
- Second attempt returns the existing payment URL instead of "already registered".
- Formatting helper edge cases (0.05, 12.9, 100).

Manual:

- Full flow against the fake partner client, then against the real partner in
  their test environment: register → pay → callback → email → ticket shows.
- Abandon payment, return later, retry.
- Admin mark as paid and resend.
- Revenue numbers match the orders after one paid, one pending, one refunded.
- Flag off for another community: price field hidden, server rejects a forged
  price.

---

## 12. Rollout

1. Apply migration on the validation database; verify.
2. Deploy web + integration-api with the flag off everywhere.
3. Apply migration on production (manual run); run codegen.
4. Create and hand over the partner key; set env vars on both apps.
5. Enable the flag for the pilot community with the SQL in section 2.
6. Create one low-price test event; do a real end-to-end payment.
7. Announce.

Rollback: turn the flag off. Existing orders and registrations stay valid; new
priced events cannot be created, and registration on existing priced events is
refused.

---

## 13. Manual payment provider

For communities that collect the money themselves (for example card to card).
Same orders, Unpaid badge, Mark as paid, emails and revenue as Checkila; only
the step that starts the payment differs.

| | Checkila | Manual |
|---|---|---|
| Chosen by | `settings.payments.provider = "checkila"` | `"manual"`, or absent |
| On registration | Order + Checkila link, user is sent to pay | Order only, no link |
| Event page while unpaid | Pay now | Price, instructions, then upload a receipt or pay cash at the door |
| Registration emails | None until paid | Attendee: how to pay. Organisers hear when a receipt arrives or cash is chosen |
| Confirmed by | Callback, or Mark as paid | Card: Mark as paid after the receipt. Cash: confirmed at once, marked paid at the door |
| Confirmation wording | "Your payment went through" | Card: "{community} confirmed your payment". Cash: "Bring {price} in cash" |

- **Migration `0006_add_manual_payments`.** Adds `ticket_orders.payment_provider`
  (`checkila` | `manual`). It is copied from the community when the order is
  created, so switching provider never rewrites history. Existing orders were
  backfilled as `checkila`.
- **Payment instructions** live in `event_payment_instructions`, one row per
  event, service-role only. They are not a column on `events`: published events
  are readable with the anon key, and the text usually holds a card number.
  Only the registrant's own pending card, their payment-request email and the
  event's managers (edit form) can read them.
- **The event form** asks for instructions when the event has a price and the
  community is manual. The server rejects a priced manual event without them.
  Saving on update requires the same event-manager check as Mark as paid.
- **Emails.** The attendee gets the payment email on the first registration
  only. Organisers are emailed when a receipt is uploaded (`receipt_sent`) or
  cash is chosen (`pays_at_door`), not at registration. Mark as paid uses
  `marked_paid` with the registration count and total gain, and sends nothing
  extra for cash because that confirmation was already stamped.
- **Card or cash** (`0007_add_ticket_payment_method`). The attendee chooses on
  the unpaid event card. A receipt is a file in the private `payment-receipts`
  bucket (`{event_id}/{registration_id}`), reached only through the service
  role after an ownership or event-manager check. Organisers open it from a
  link that lasts 60 seconds. Cancelling an unpaid registration deletes the
  file. There is no scheduled cleanup after the event yet.
  Registrants show Unpaid, Receipt sent, Pays at the door, or Paid.
  Cash confirms the spot immediately (venue and QR) while the order stays
  unpaid until Mark as paid, so revenue still counts only paid orders.
- **Privacy and responsibility.** Receipts are personal financial data kept
  for the community. The privacy policy names them. The terms say the community
  is the seller and is responsible for taxes, refunds, and any receipt the law
  requires. Luhive does not process or check the transfer, and the product copy
  says so. This manual path stays limited to communities with the flag on. It
  will not be the general product: other communities will use Stripe Connect or
  epoint directly. Automatic receipt deletion is not built, because this path
  is not the one that scales.
- **Not changed:** the Checkila callback, integration-api, revenue, Resend
  confirmation, and blocking manual approve on unpaid card rows.
- **Known gap:** unpaid registrations do not count towards capacity, so
  card-to-card can collect more payments than seats before they are marked paid.

---

## Milestones

Each milestone ends with a stop: it is merged-quality on its own, has a
verification you can run yourself, and nothing after it starts until you say so.
Each one leaves the app working with the flag off.

**M1 — Database. Done.** `0003_add_paid_ticketing.sql` (columns, tables, indexes,
`confirm_ticket_order`), regenerated types, web `database.types` synced.
Verify: `pnpm --filter @luhive/db migrate:validation`, inspect tables and
constraints, call `confirm_ticket_order` by hand on test rows (confirmed, then
`already_paid`, then `not_found`), typecheck web and integration-api.
Nothing user-visible changes.

**M2 — Shared money and flag helpers. Done.** `formatMoney`, major/minor conversion,
`isPaidTicketingEnabled(settings)`, with unit tests. Verify: run the tests.
Nothing user-visible changes.

**M3 — Price on events. Done.** Price field in the event form (flag-gated), server-side
flag enforcement on create/update, approval toggle disabled for priced events,
price shown on the event page instead of "Free". Verify: with the flag off no
field appears and a forged price is rejected; with the flag on for a test
community a priced event saves and displays; free events are unchanged.

**M4 — Paid registration and Pay now. Done.** Checkila client (real + fake),
`ticket_orders` repo, the paid branch in `completeEventRegistration`, retry for
pending orders, Pay now card state, delete-registration rules. Verify with
`CHECKILA_FAKE=true`: register → pending registration + order + payment URL, no
emails, second attempt returns the same URL, free events unchanged. Real
Checkila can be tried here to create a link.

**M5 — Callback and confirmation. Done.** A live Checkila payment confirmed a registration. `POST /v1/payments/confirm` with auth,
validation, audit log, the shared confirm rule; integration-api tests. Verify:
tests, then `curl` the endpoint locally with a test key (success, replay, wrong
amount, wrong key). No email yet: registration becomes approved with a check-in
token.

**M6 — Emails. Done.** Attendee and organiser both send after the first confirmation. The organiser email includes registration count and total gain. Temporary internal web route, `sendPaidRegistrationConfirmation`
(attendee + organizer, community join), integration-api call with timeout.
Verify: a confirmed callback sends both emails once; a replay sends none; a
downed web app does not fail the callback.

**M7 — Admin. Done.** Unpaid badge, Mark as paid, Resend confirmation, block manual
approve on unpaid. Verify: the manual path produces the same end state as the
callback and sends the emails.

**M8 — Revenue. Done.** Per-event panel at the bottom of event statistics.
Events list and dashboard home show a revenue card when the flag is on; the
card renders immediately and the amount fills in after. Refunded orders are
excluded. Verify: numbers match orders with one paid, one pending, one refunded.

**M9 — Pilot rollout. Done** for the payment path: production migration, pilot
key, env vars, flag on for the pilot community, and one real payment. The
`docs/spec/12` exception is recorded. Admin and revenue reach production when
PR #161 merges.

M1–M6 is the minimum for a working paid flow; M7 is the safety net for lost
callbacks and should ship with it; M8 can follow the day after if time is short.

---

## Temporary shortcuts

- Paid branch lives in the web registration action instead of a core
  `ticketing` slice. Move it when Stage 1 #9 lands.
- The confirmation email goes through a temporary web route called by
  integration-api.
- Emails are not retried automatically; use **Resend confirmation**.
- No automatic expiry of unpaid registrations (they never consume capacity).
- Refunds and paid-ticket cancellation are manual.
- No partner transaction lookup for reconciliation; **Mark as paid** is the
  safety net.
- Manual payments are matched by the organiser against their bank app; nothing
  records which transfer belongs to which registration.

## Open questions

1. Checkila questions listed at the end of section 6.
2. SQL function vs two-statement approach for the confirm rule (section 4); the
   function is recommended.

Resolved: partner contract received (section 6); organizer notification is sent
on every paid confirmation (section 7).
