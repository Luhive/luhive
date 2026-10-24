# Profile activity

The profile page gets one card: a year of activity as a GitHub-style dot grid,
one dot per day, with a tooltip that says what happened that day and a single
line of totals underneath. It replaces the two stat cards, which stay commented
out in `routes/web/profile.tsx` for later.

Same card for organizers and members. An organizer's grid fills up with hosting
and updates; a member's with events and updates opened. Nobody gets a different
layout.

Design reference: the "Luhive Profile" mockup artifact
(https://claude.ai/artifact/6KaBKtSMg4eDPyA8fnzwHc).

## Status

Spec, 24 Oct 2026 (revised the same day: caching deferred, loading and skeleton rules, mandatory motion contract).
Built so far: migration `0008` (applied to development on 24 Oct 2026; there it runs in 4.8 ms on the server for the busiest user, and `anon` is denied) and the web data layer (model, repo, timezone cookie, loader). Production and the UI are next. The migration in section 3 was applied to a
local Postgres 17 loaded with `0000`–`0006`, checked against hand-made edge cases,
and timed against synthetic volume (section 4).

---

## 1. Decisions

| Topic | Decision |
|---|---|
| Source of truth | The existing tables. No new event log, no backfill. `person_events` is not used: web writes do not record into it yet. |
| Computation | One SQL function, `public.profile_activity(p_tz)`, computed on read. |
| Identity | `auth.uid()` inside the function. No user id parameter, so nobody can read someone else's grid. |
| Window | 52 weeks, Monday-start columns, ending today. Fixed, no year picker. |
| Day boundaries | Bucketed in the viewer's IANA timezone, from a cookie, fallback `Asia/Baku`. |
| Payload | Sparse: one row per day *with* activity. ≤ 365 rows, usually far fewer. |
| Caching | **None for now.** The query is fast enough (section 4). The rollup in 4.4 is designed but not built until its gate trips. |
| Loading | The activity data is streamed after the page and never blocks it: its own `<Suspense>` boundary, a 4 s timeout, and errors contained in the card (section 5.4). |
| Skeleton | The real card with real month labels. Only the dots and totals are placeholders, at identical geometry, so nothing shifts (section 6.2). |
| Materialized view | Rejected. See 4.3. |
| Intensity | An event day (hosted or attended) is always the strongest shade. Everything else is counted. |
| Tooltip | shadcn/Radix tooltip, **one instance for the whole grid**, moved to the hovered dot. |
| Motion | **Mandatory contract**, section 8, from the repo's Emil Kowalski skills (`animate`, `emil-design-eng`, `review-animations`). Anything not listed there does not animate. Merging needs a clean `review-animations` pass. |
| Streaks, active weeks, filters, legend | Not shown. Tried in the mockup and cut. |
| Approvals | Not counted. `event_registrations` has no `approved_by`, so an approval cannot be attributed to a person. |
| Naming | UI says **Updates**. Code and DB keep `announcement`. |

---

## 2. What counts

Each activity is a timestamp, a kind and a title. The day is the timestamp in
`p_tz`.

| Kind | Tooltip line | Source | Timestamp | Rule |
|---|---|---|---|---|
| `hosted` | Hosted *{event}* | `events` | `start_time` | Published, started within the window and not in the future, in a community the user manages. Includes accepted co-host collaborations of a managed community. |
| `attended` | Went to *{event}* | `event_registrations` + `events` | event `start_time` | Own registration, `rsvp_status <> 'not_going'`, approval null or `approved` (or `is_attended`), event published and already started. Not counted when the user also hosted it. |
| `registered` | Registered for *{event}* | `event_registrations` | `registered_at` | Own registration, not `not_going`. |
| `events_created` | Created *{event}* | `events` | `created_at` | `created_by` = user, published. There is no `published_at`; creation is the closest signal. |
| `updates_sent` | Sent *{title}* | `community_announcements` | `email_sent_at`, else `created_at` | `created_by` = user, `published`. |
| `updates_opened` | Opened *{title}* | `announcement_views` | first view of that update | One per update, on its first view (email pixel or web). Your own updates are excluded. |
| `communities_joined` | Joined *{community}* | `community_members` | `joined_at` (stored without zone, read as UTC) | Own memberships. |

**"Manages"** is the rule the profile already uses (`profile-communities-repo.server.ts`):
role `owner` or `admin`, or `communities.created_by` = user.

**"Went to"** follows the decision that most events don't run check-in: an approved,
past registration counts as attended. `is_attended` still counts when set.

### Dot shade

| Level | When | Colour |
|---|---|---|
| 0 | nothing | `#ececee` |
| 1 | 1 non-event action | `#FFD3BC` |
| 2 | 2+ non-event actions | `#FF9A66` |
| 3 | any `hosted` or `attended` that day | `#FF6D23` (`--primary`) |

### Totals line

Sums over the window, from the same rows:
`Events {hosted} hosted / {attended} attended    Updates {updates_sent} sent / {updates_opened} opened`.
Zeros stay visible (a member reads "0 hosted"), so every profile reads the same way.

---

## 3. Data: migration `0008_profile_activity.sql`

Hand-written SQL at `packages/db/migrations/` root, applied to validation first,
then to production by the manual run in `packages/db/README.md`, then
`pnpm --filter @luhive/db codegen`.

Four indexes, each keyed on the user's own rows. The tables are small enough that
plain `CREATE INDEX` inside the migration transaction is fine; if
`announcement_views` has grown past a few million rows by then, create that one
`CONCURRENTLY` by hand first and the `IF NOT EXISTS` makes the migration a no-op
for it.

```sql
-- Profile activity grid: one row per day with activity for the signed-in user,
-- over the 52 weeks ending today. Computed on read from the source tables; every
-- branch is driven by an index on the user's own rows, so cost scales with one
-- person's history, not with the database.

CREATE INDEX IF NOT EXISTS idx_announcement_views_user_announcement
  ON public.announcement_views (user_id, announcement_id, created_at)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_announcements_created_by
  ON public.community_announcements (created_by, created_at);

CREATE INDEX IF NOT EXISTS idx_events_created_by
  ON public.events (created_by, created_at);

CREATE INDEX IF NOT EXISTS idx_events_community_start_published
  ON public.events (community_id, start_time)
  WHERE status = 'published';

CREATE OR REPLACE FUNCTION public.profile_activity(p_tz text DEFAULT 'Asia/Baku')
RETURNS TABLE (
  day date,
  hosted integer,
  attended integer,
  registered integer,
  events_created integer,
  updates_sent integer,
  updates_opened integer,
  communities_joined integer,
  items jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
WITH me AS (
  SELECT auth.uid() AS id
),
bounds AS (
  SELECT
    first_day,
    (first_day::timestamp AT TIME ZONE p_tz) AS from_ts,
    now() AS to_ts
  FROM (
    SELECT (date_trunc('week', (now() AT TIME ZONE p_tz)::date) - interval '51 weeks')::date AS first_day
  ) w
),
managed AS (
  SELECT cm.community_id AS id
  FROM community_members cm, me
  WHERE cm.user_id = me.id AND cm.role IN ('owner', 'admin')
  UNION
  SELECT c.id
  FROM communities c, me
  WHERE c.created_by = me.id
),
hosted_events AS (
  SELECT e.id, e.title, e.start_time
  FROM events e
  JOIN managed m ON m.id = e.community_id
  CROSS JOIN bounds b
  WHERE e.status = 'published'
    AND e.start_time >= b.from_ts AND e.start_time <= b.to_ts
  UNION
  SELECT e.id, e.title, e.start_time
  FROM event_collaborations ec
  JOIN managed m ON m.id = ec.community_id
  JOIN events e ON e.id = ec.event_id
  CROSS JOIN bounds b
  WHERE ec.status = 'accepted'
    AND e.status = 'published'
    AND e.start_time >= b.from_ts AND e.start_time <= b.to_ts
),
items AS (
  SELECT h.start_time AS at, 'hosted'::text AS kind, h.title
  FROM hosted_events h

  UNION ALL
  SELECT DISTINCT ON (e.id) e.start_time, 'attended', e.title
  FROM event_registrations r
  JOIN events e ON e.id = r.event_id
  CROSS JOIN me
  CROSS JOIN bounds b
  WHERE r.user_id = me.id
    AND r.rsvp_status <> 'not_going'
    AND (coalesce(r.approval_status, 'approved') = 'approved' OR r.is_attended)
    AND e.status = 'published'
    AND e.start_time >= b.from_ts AND e.start_time <= b.to_ts
    AND NOT EXISTS (SELECT 1 FROM hosted_events h WHERE h.id = e.id)

  UNION ALL
  SELECT r.registered_at, 'registered', e.title
  FROM event_registrations r
  JOIN events e ON e.id = r.event_id
  CROSS JOIN me
  CROSS JOIN bounds b
  WHERE r.user_id = me.id
    AND r.rsvp_status <> 'not_going'
    AND r.registered_at >= b.from_ts
    AND NOT EXISTS (SELECT 1 FROM managed m WHERE m.id = e.community_id)

  UNION ALL
  SELECT e.created_at, 'events_created', e.title
  FROM events e
  CROSS JOIN me
  CROSS JOIN bounds b
  WHERE e.created_by = me.id
    AND e.status = 'published'
    AND e.created_at >= b.from_ts

  UNION ALL
  SELECT coalesce(a.email_sent_at, a.created_at), 'updates_sent', a.title
  FROM community_announcements a
  CROSS JOIN me
  CROSS JOIN bounds b
  WHERE a.created_by = me.id
    AND a.published
    AND coalesce(a.email_sent_at, a.created_at) >= b.from_ts

  UNION ALL
  SELECT f.first_open, 'updates_opened', a.title
  FROM (
    SELECT v.announcement_id, min(v.created_at) AS first_open
    FROM announcement_views v, me
    WHERE v.user_id = me.id
    GROUP BY v.announcement_id
  ) f
  JOIN community_announcements a ON a.id = f.announcement_id
  CROSS JOIN me
  CROSS JOIN bounds b
  WHERE f.first_open >= b.from_ts
    AND a.created_by <> me.id

  UNION ALL
  SELECT cm.joined_at AT TIME ZONE 'UTC', 'communities_joined', c.name
  FROM community_members cm
  JOIN communities c ON c.id = cm.community_id
  CROSS JOIN me
  CROSS JOIN bounds b
  WHERE cm.user_id = me.id
    AND cm.joined_at >= (b.from_ts AT TIME ZONE 'UTC')
),
ranked AS (
  SELECT
    (i.at AT TIME ZONE p_tz)::date AS day,
    i.kind,
    i.title,
    i.at,
    row_number() OVER (
      PARTITION BY (i.at AT TIME ZONE p_tz)::date
      ORDER BY (i.kind IN ('hosted', 'attended')) DESC, i.at
    ) AS rank
  FROM items i
)
SELECT
  r.day,
  count(*) FILTER (WHERE r.kind = 'hosted')::integer,
  count(*) FILTER (WHERE r.kind = 'attended')::integer,
  count(*) FILTER (WHERE r.kind = 'registered')::integer,
  count(*) FILTER (WHERE r.kind = 'events_created')::integer,
  count(*) FILTER (WHERE r.kind = 'updates_sent')::integer,
  count(*) FILTER (WHERE r.kind = 'updates_opened')::integer,
  count(*) FILTER (WHERE r.kind = 'communities_joined')::integer,
  coalesce(
    jsonb_agg(jsonb_build_object('kind', r.kind, 'title', r.title) ORDER BY r.rank)
      FILTER (WHERE r.rank <= 6),
    '[]'::jsonb
  )
FROM ranked r
GROUP BY r.day
ORDER BY r.day;
$$;

COMMENT ON FUNCTION public.profile_activity(text) IS
  'Daily activity for auth.uid() over the 52 weeks ending today, bucketed in p_tz. Sparse: days without activity are omitted. items holds at most 6 titled entries per day, events first; the counts are exact.';

REVOKE ALL ON FUNCTION public.profile_activity(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.profile_activity(text) TO authenticated, service_role;
```

Checked on the local copy:

- Hosted counts own-community events and accepted co-hosts; drafts, future events and events before the window are left out.
- Attended counts an approved past registration, and skips pending ones and events the user hosted.
- Registering for an event in a community you manage does not count as `registered`.
- An update counts as opened once, on its first view; opening your own update doesn't count.
- An update without `email_sent_at` falls back to `created_at`.
- `anon` gets `permission denied`, and a signed-in user only ever sees their own rows.

---

## 4. Cost and caching

### 4.1 Measured

Local Postgres 17 on a laptop, warm cache, with 20k events, 61k registrations,
1.5M update views, 120k memberships and 8k updates:

| User | Shape | Rows returned | Time |
|---|---|---|---|
| Heaviest | admin of 7 communities, 139 events in window, 803 registrations, 3,003 views, 401 updates sent | 349 | 4–5 ms |
| Typical | a few registrations | 5 | 1.2–1.5 ms |

Every branch is an index scan on the user's own rows (checked with
`auto_explain` + `log_nested_statements`; `EXPLAIN` on a `SECURITY DEFINER`
function only shows the outer Function Scan). Cost grows with one person's
history, not with the database. In production, the network round trip to
Supabase will take longer than the query itself.

### 4.2 Tier 1: ship with this

- **Deferred.** The loader returns `activity` as an unawaited promise, the same
  as `stats` and `events`, so the page shell renders straight away and the card
  streams in under `<Suspense>`.
- **No refetch on tab switch.** `shouldRevalidate` in `routes/web/profile.tsx`
  already ignores `?tab=` changes.
- **No HTTP or CDN cache.** The page is private and per-user.
- **No React Query layer.** A second cache in front of a 5 ms query adds
  invalidation bugs and saves nothing.

Cost per profile view: one RPC.

### 4.3 Rejected

- **Materialized view over all users.** Each refresh recomputes every user's year
  to serve a page that only its owner opens. `REFRESH … CONCURRENTLY` still does
  the full recompute and needs a unique index. The data goes stale between
  refreshes. PostgREST would expose it without RLS, so it would need a wrapper
  function anyway.
- **Aggregating raw rows in TypeScript.** PostgREST stops at 1000 rows (the bug
  `0004_hub_communities` fixed), and it would ship thousands of rows to build at
  most 365.
- **A new activity log table written by the app.** It needs a backfill and a
  write in every flow, including the frozen events module. The source tables
  already have the timestamps.

### 4.4 Tier 2: designed, not built

**Not built now** (owner decision, 24 Oct 2026): the measured speed is good, so
caching waits. Build this only if one of these happens:
- `pg_stat_statements` shows `profile_activity` p95 above **100 ms** for a week.
- Profiles become public, so one grid gets loaded by many viewers.

The design:

- `profile_activity_days (user_id, day, <same counts>, items, PRIMARY KEY (user_id, day))`.
- `profile_activity_dirty (user_id PRIMARY KEY, marked_at)`.
- `AFTER` triggers on the six source tables insert the affected user ids into
  `dirty` with `ON CONFLICT DO NOTHING`. That's one tiny upsert per write, never
  the aggregation itself. For `events` and `event_collaborations` the affected
  users are the community's managers.
- A `pg_cron` job runs every 5 minutes. It takes up to 500 dirty users and
  rewrites their rows with the same query body, moved into an internal
  `profile_activity_for(p_user uuid, p_tz text)` that is not granted to anyone.
- `profile_activity(p_tz)` then reads the rollup. Data can be up to 5 minutes
  stale.
- **Catch:** a rollup has to be bucketed in one timezone per user. Tier 2
  therefore needs a stored timezone, `profiles.settings.timezone`, written from
  the `lh_tz` cookie on profile load.

---

## 5. Web: data

### 5.1 Types (`modules/profile/model/profile-activity.ts`)

```ts
export type ActivityKind =
  | "hosted" | "attended" | "registered" | "events_created"
  | "updates_sent" | "updates_opened" | "communities_joined";

export type ProfileActivityDay = {
  day: string; // YYYY-MM-DD in the viewer's timezone
  counts: Partial<Record<ActivityKind, number>>; // zero counts omitted
  items: { kind: ActivityKind; title: string }[]; // ≤ 6, events first
};

export type ProfileActivity = { timezone: string; days: ProfileActivityDay[] };

export const EMPTY_ACTIVITY: ProfileActivity = { timezone: "Asia/Baku", days: [] };
```

The pure functions live in the same file, with no React and no I/O, so they can
be tested once the web app has a test runner (spec 13):

| Function | Returns |
|---|---|
| `activityWindow(tz, now)` | `{ firstDay, today }`, the same arithmetic as the SQL `bounds` CTE: Monday of the current week minus 51 weeks, through today |
| `toActivityCells(activity, window)` | 364–370 cells in column-major order: `{ date, level }`, or `null` for slots after today |
| `activityLevel(day)` | 0–3, by the table in section 2 |
| `activityTotals(activity)` | `{ hosted, attended, updatesSent, updatesOpened }` |
| `monthLabels(window)` | `{ label, column }[]`, a label on the column holding the 1st of each month. A label is dropped when it would sit within 3 columns of the previous one, which is GitHub's rule and stops "Oct Nov" crowding the first columns. |
| `tooltipLines(day)` | Up to 4 lines, events first, then "+{n} more" when the counts exceed the lines shown. "No activity" for empty days. |

### 5.2 Fetch (`modules/profile/data/profile-activity-repo.server.ts`)

`getProfileActivity(supabase, timezone)` calls `supabase.rpc("profile_activity", { p_tz: timezone })`
and maps each row into a `ProfileActivityDay`. On error it logs and returns
`EMPTY_ACTIVITY`, so the card falls back to its empty state and the page never
fails because of the grid.

### 5.3 Timezone

- `app/root.tsx`, on the client, sets the cookie `lh_tz` to
  `Intl.DateTimeFormat().resolvedOptions().timeZone` when it differs (path `/`,
  one year, `SameSite=Lax`).
- `shared/lib/timezone.server.ts` (`readTimezone`) reads the cookie and validates
  it with `new Intl.DateTimeFormat("en-US", { timeZone })` in a try/catch. It falls
  back to `Asia/Baku`, so the SQL never receives an invalid zone. The cookie name,
  parser and client writer live in `shared/lib/timezone-cookie.ts`: `root.tsx`
  writes the cookie, so it can't live inside the profile module.
- On a first visit there is no cookie yet and the grid uses Baku days. That's
  correct for nearly everyone today, and right for everyone from the second visit.

### 5.4 Loader and deferral

The grid is never allowed to slow the page down. The rules:

1. **Two fields, one eager and one deferred.** In `profile-loader.server.ts`,
   compute the timezone and window synchronously and return them as plain data.
   Return the RPC as an **unawaited** promise:

   ```ts
   const timezone = resolveTimezone(request);
   const activityWindowData = activityWindow(timezone, new Date()); // { timezone, firstDay, today }
   const activity = withTimeout(getProfileActivity(supabase, timezone), 4000, EMPTY_ACTIVITY);
   return { …, activityWindow: activityWindowData, activity };
   ```

   The eager window lets the skeleton draw the real month labels and the real dot
   geometry during SSR, before any data exists. Passing the server's `today` down
   also avoids a server/client mismatch around midnight.
2. **Started late, finished independently.** The RPC starts after the `profiles`
   row is read (which the page needs anyway) and runs in parallel with
   `communities` and `events`. Nothing awaits it, so the HTML shell flushes
   immediately and the activity streams in as its own chunk.
3. **Its own boundary.** The card gets a dedicated
   `<Suspense fallback={<ProfileActivitySkeleton window={activityWindow} />}>`.
   The header, tabs and tab content are never inside it, so a slow grid can't
   hold back anything else, and the reverse is true too.
4. **Bounded.** `withTimeout` resolves to `EMPTY_ACTIVITY` and logs after 4 s,
   so a stuck query never keeps the response stream open.
5. **Contained errors.** `<Await errorElement={<ProfileActivityUnavailable />}>`
   renders the card frame with grey dots and "Activity is unavailable right now."
   A failure never reaches the route error boundary.
6. **Small payload.** The streamed JSON keeps short keys and omits zero counts.
   Expect under 5 KB for a typical member and under 60 KB for the heaviest
   organizer measured.
7. **No refetch.** The existing `shouldRevalidate` ignores `?tab=` changes. A
   profile edit (POST) revalidates everything, which is fine at this cost.

Both unauthenticated early-return branches return `Promise.resolve(EMPTY_ACTIVITY)`
and a window computed for `Asia/Baku`.

---

## 6. UI: the card

### 6.1 Layout

It sits where the stat cards were in `routes/web/profile.tsx`, after `<ProfileTabs>`
and before the tab content, inside its own boundary (5.4).

```
┌ Activity ───────────────────────────────────────────────────────┐
│ Nov   Dec   Jan   Feb   Mar   Apr   May   Jun   Jul   Aug   Sep │
│ ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● │ ×7 rows
│ Events 15 hosted / 4 attended    Updates 35 sent / 18 opened    │
└─────────────────────────────────────────────────────────────────┘
```

| Part | Spec |
|---|---|
| Card | `profileCardClassName`, `p-4`, enters once with `profileRiseStyle(0)` |
| Title | "Activity", `text-[13px] font-medium text-[#6e6e73]` |
| Month row | `mt-2.5 text-[11px] text-[#8c8e9a]`, the same 52-column grid as the dots, each label placed with `grid-column-start` |
| Dots | `mt-1.5 grid grid-flow-col grid-rows-7 grid-cols-[repeat(52,minmax(0,1fr))] gap-[3px]`; each dot is `aspect-square rounded-full` plus its level class. Slots after today render as empty `<span>`s so the grid stays rectangular. |
| Level colours | `activityLevelClassName` in `profile-tokens.ts`: `["bg-[#ececee]", "bg-[#FFD3BC]", "bg-[#FF9A66]", "bg-primary"]` |
| Totals | `mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-[12px] text-[#8c8e9a] tabular-nums`, numbers `font-semibold text-[#111]` |
| Empty | All dots level 0. The totals line is replaced by "Your activity shows up here once you join an event." Same card height. |
| Narrow screens | Below `sm`, the grid sits in `overflow-x-auto` with `min-w-[620px]`, scrolled to the right edge on mount so today is visible. Dots never shrink below about 9 px. The tooltip is portalled, so the scroll box can't clip it. |

The dots render once. `ActivityDots` is `memo`'d on the cell array, and hovering
never re-renders them (section 7).

### 6.2 Skeleton

The skeleton is the real card with only the data missing. It is not a generic
grey block.

| Part | In the skeleton |
|---|---|
| Card frame, padding, title "Activity" | Real, identical to the loaded card |
| Month row | **Real labels**, computed from the eager `activityWindow` (5.4) |
| Dots | The **base layer** (6.3): the same 52 × 7 grid, every dot in the level-0 colour exactly as the loaded card draws empty days, future slots empty |
| Totals line | Two bars, `h-3 w-[168px]` and `h-3 w-[148px]`, `rounded-full bg-black/[0.05]`, the same `gap-x-6`, at the totals' baseline |
| Size | Same height to the pixel as the loaded card, so skeleton → data is CLS 0 |
| A11y | `aria-busy="true"` on the card and an sr-only "Loading activity" |
| Motion | None for the first second, because most loads finish before then. After 1 s the dots layer starts a slow pulse (section 8, M3). |

Built as `ProfileActivitySkeleton` in `profile-skeletons.tsx`. It shares the
`ActivityGridFrame` layout component with the loaded card, so both always have
the same geometry; it isn't a hand-copied lookalike.

`ProfileActivityUnavailable` (the error state) is the same skeleton without the
pulse, with the totals bars replaced by the message.

### 6.3 Two layers, so the reveal never flashes

`ActivityGridFrame` draws the **base layer**: every slot as a level-0 dot. The
skeleton and the loaded card both render it, so the switch leaves it untouched.

The loaded card adds a **colour layer** on top: an absolutely positioned grid with
the same template that holds only the days at level 1–3, each placed explicitly
with `gridColumn`/`gridRow`. It's sparse, so usually far fewer than 364 elements.

When data arrives, only the colour layer and the totals line appear (section 8,
M2). Nothing moves or resizes, the grey base never blinks out, and the reveal
animates one element rather than 364.

---

## 7. UI: the tooltip

### 7.1 One tooltip, not 364

Wrapping every dot in a Radix `Tooltip` would mount 364 roots and popper
instances. Instead, there is one controlled tooltip whose trigger is a single
anchor element that moves to the active dot.

```tsx
<div ref={gridWrap} className="relative" /* pointer + keyboard handlers */>
  <ActivityDots cells={cells} />                 {/* memo; each dot has data-i */}
  <Tooltip open={active !== null} onOpenChange={…}>
    <TooltipTrigger asChild>
      <span aria-hidden className="pointer-events-none absolute rounded-full ring-2 ring-primary/50"
            style={anchorRect} />                {/* also the hover ring */}
    </TooltipTrigger>
    <ActivityTooltipContent forceMount day={activeDay} instant={instant}
      updatePositionStrategy={active !== null ? "always" : "optimized"} />
  </Tooltip>
</div>
```

- **Pointer handling.** `onPointerOver` on the wrapper reads `data-i` from the event
  target: one listener, not 364.
- **Anchor position.** `anchorRect` comes from the active dot's
  `offsetLeft`/`offsetTop`/`offsetWidth`: one DOM read per change. The anchor also
  draws the dark ring, so the hover highlight never touches the dots.
- **`updatePositionStrategy="always"` while open.** The anchor moves without
  resizing, so Floating UI's default `autoUpdate` wouldn't reposition. While
  closed it drops back to `"optimized"`, so the per-frame positioning loop only
  runs while the tooltip is visible. The prop is present in the installed
  `@radix-ui/react-popper`.
- **`forceMount`.** The content stays mounted and CSS hides it when closed, so the
  open/close motion can be interruptible transitions rather than keyframes
  (section 8, M4/M5).
- **Own content component.** `ActivityTooltipContent` (in
  `profile-activity-tooltip.tsx`) is built on the Radix primitives (`Portal`,
  `Content`, `Arrow`) in the profile module. The shared shadcn `TooltipContent`
  hard-codes tw-animate zoom and slide classes that this motion spec replaces.
  `shared/components/ui/tooltip.tsx` stays untouched.

### 7.2 Look

| Part | Spec |
|---|---|
| Content | `side="top" sideOffset={8} collisionPadding={12}`, flips and shifts at the edges. White glass, no tint: `bg-white/75 backdrop-blur-xl backdrop-saturate-150 ring-1 ring-inset ring-black/[0.06]`, soft neutral shadow. `max-w-[260px] rounded-[12px] px-3 py-2.5 text-[12px] leading-[1.5]` |
| Arrow | None: a solid arrow can't share the glass blur |
| Date | `mb-1.5 text-[11px] font-medium text-[#6e6e73]`, e.g. "Sunday, September 27". The year is added only when it isn't the current year. |
| Event line | `flex items-center gap-2`, a `size-[7px] rounded-full bg-primary` dot, `font-medium text-[#111]`, e.g. "Hosted Grok Bot meetup Baku" |
| Other line | Dot `bg-[#FF9A66]`, `text-[#3f3f46]`, e.g. "Sent October recap" |
| Overflow | "+2 more", `text-[#8c8e9a]` |
| Empty day | "No activity", `text-[#8c8e9a]`, dot `bg-black/15` |

### 7.3 Timing

These are delays, not animations. The animations themselves are section 8.

| Moment | Behaviour |
|---|---|
| First open | 200 ms after the pointer settles on a dot, so crossing the card doesn't flash. The grid does this itself: Radix `delayDuration` doesn't apply to a controlled tooltip. |
| Dot to dot while open | Instant: the content swaps and the position snaps (M6). |
| Leaving the grid | Close after an 80 ms grace, so crossing the 3 px gaps or the edge doesn't flicker. |
| Re-entering within 400 ms of closing | Opens instantly with no animation (`data-instant`, M7). |
| Keyboard focus, touch | No delay. |

A controlled Radix tooltip always reports `data-state="instant-open"` (checked in
the installed 1.2.9), so the CSS can't key off Radix's delayed or instant states.
The component sets `data-instant` itself when opening and removes it on close.

### 7.4 Keyboard, screen readers, touch

| Area | Behaviour |
|---|---|
| Tab stop | The wrapper is the only tab stop (`tabIndex={0}`, `role="group"`, `aria-label="Activity over the last year"`), with `aria-describedby` pointing at an sr-only totals sentence. |
| Focus | Opens the tooltip on today's dot instantly, with no delay for keyboard users. |
| Keys | Up/Down for the previous/next day, Left/Right for the previous/next week, Home/End for the first/last day. Escape closes; Tab leaves the grid. |
| Screen readers | The anchor is `aria-hidden`, so the active day's lines are mirrored into an sr-only `aria-live="polite"` node. |
| Focus ring | `focus-visible:ring-2 focus-visible:ring-[#111]/15` on the wrapper, plus the anchor ring on the active dot. |
| Touch | When `pointerType === "touch"`, tapping a dot opens the tooltip instantly, tapping another dot moves it, and tapping outside closes it (`onPointerDownOutside`). No hover delay on touch. |

---

## 8. Motion contract (mandatory)

Built from the repo's Emil Kowalski skills: `.agents/skills/animate`,
`emil-design-eng` and `review-animations/STANDARDS.md`. These rules are
requirements, not suggestions:

1. **This table is the complete list.** Anything not in it does not animate. In
   particular: no count-up on the totals (people read and act on that data, so it
   shouldn't move for style), no hover effect on dots, no stagger across the dots,
   and no colour transitions between levels.
2. **Values come from the table.** No new curves or durations. Use the existing
   `--ease-out-strong` token in `app.css` (`cubic-bezier(0.23, 1, 0.32, 1)`, the
   skills' `--ease-out`) rather than adding a parallel token.
3. **Reduced motion ships with each item.** It's a gentler variant, not a follow-up.
4. **Only `transform` and `opacity` animate**, plus a 2 px `filter: blur` on the
   reveal. The skills sanction blur under 20 px for masking a crossfade.
5. **Merge gate:** run the `review-animations` skill on the diff, which must return
   zero blocking findings. Then feel-check every item at 3× duration in the
   DevTools Animations panel.

### 8.1 Inventory

| # | What | Frequency (skill gate) | Purpose | Tool | Motion | Reduced motion |
|---|---|---|---|---|---|---|
| M1 | Card entrance | Occasional | Spatial consistency with the other profile cards | Existing `.animate-hub-rise` via `profileRiseStyle(0)` | Unchanged | Already covered: `app.css` swaps `hub-rise` for a 200 ms `hub-fade` |
| M2 | Data reveal: colour layer and totals | Occasional | Preventing a jarring change | CSS transition with `@starting-style`: no JS, off the main thread while the page is still busy | `opacity` 0 → 1 and `blur(2px)` → 0, 200 ms, `--ease-out-strong`. Totals 40 ms after the dots. | Opacity only, 150 ms |
| M3 | Skeleton pulse | Only on slow loads | State indication (still loading) | CSS keyframes (continuous, so nothing to interrupt) | Base-layer `opacity` 1 ↔ 0.55, 1.6 s `ease-in-out`, alternate, infinite, **starts after a 1 s delay** | None: the static skeleton with `aria-busy` already says loading |
| M4 | Tooltip open | Tens per session | State indication; it grows from the dot | CSS transitions on Radix `data-state`, `forceMount` | `opacity` 0 → 1 and `scale(0.97)` → 1, 125 ms, `--ease-out-strong`, from `--radix-tooltip-content-transform-origin`. Never `scale(0)`. | Opacity only |
| M5 | Tooltip close | Same | — | Same transition | To `opacity` 0 and `scale(0.97)`, 100 ms, `--ease-out-strong`: exits faster than it enters | Opacity only |
| M6 | Tooltip moving dot to dot | Many per session | — | **None.** The skills say subsequent tooltips skip both the delay and the animation. | The position snaps and the content swaps | — |
| M7 | Re-open within 400 ms | Many per session | — | **None** (`data-instant` sets duration 0) | Instant | — |
| M8 | Active-dot ring | Hover, tens per day | — | **None**, instant | — | — |
| M9 | Keyboard moves | Keyboard-initiated, which the gate rules out | — | **None** | — | — |
| M10 | Narrow screens: start scrolled to today | Once on mount | — | **None**: set `scrollLeft`, no smooth scroll | — | — |

Why the tooltip uses transitions, not keyframes: the skills block keyframes on
rapidly triggered elements because transitions can be interrupted and retargeted.
Radix `Presence` only waits for keyframes before unmounting, so the content uses
`forceMount` and CSS hides it when closed: `visibility` flips only after the exit
finishes, and `pointer-events` is always `none`.

`@starting-style` is supported in Chrome 117+, Safari 17.5+ and Firefox 129+.
Older browsers show the data instantly, which is acceptable.

### 8.2 CSS (`app/app.css`)

```css
/* M4, M5, M7: activity tooltip */
.activity-tooltip {
  pointer-events: none;
  transform-origin: var(--radix-tooltip-content-transform-origin);
  transition:
    opacity 125ms var(--ease-out-strong),
    transform 125ms var(--ease-out-strong),
    visibility 0s;
}
.activity-tooltip[data-state="closed"] {
  opacity: 0;
  transform: scale(0.97);
  visibility: hidden;
  transition:
    opacity 100ms var(--ease-out-strong),
    transform 100ms var(--ease-out-strong),
    visibility 0s linear 100ms;
}
.activity-tooltip[data-instant] {
  transition-duration: 0ms;
}

/* M2: data reveal */
.activity-reveal {
  transition:
    opacity 200ms var(--ease-out-strong),
    filter 200ms var(--ease-out-strong);
}
.activity-reveal[data-follow] {
  transition-delay: 40ms;
}
@starting-style {
  .activity-reveal { opacity: 0; filter: blur(2px); }
}

/* M3: skeleton pulse, only on slow loads */
.activity-skeleton-pulse {
  animation: activity-pulse 1.6s ease-in-out 1s infinite alternate;
}
@keyframes activity-pulse {
  to { opacity: 0.55; }
}

@media (prefers-reduced-motion: reduce) {
  .activity-tooltip,
  .activity-tooltip[data-state="closed"] { transform: none; }
  .activity-reveal { transition: opacity 150ms var(--ease-out-strong); }
  @starting-style {
    .activity-reveal { opacity: 0; filter: none; }
  }
  .activity-skeleton-pulse { animation: none; }
}
```

---

## 9. Change list

| File | Change |
|---|---|
| `packages/db/migrations/0008_profile_activity.sql` | New, section 3 |
| generated DB types | Regenerated by `codegen` after production. Never hand-edited. |
| `apps/web/app/modules/profile/model/profile-activity.ts` | New: types and pure functions |
| `…/profile/model/profile-loader.ts` | Adds `activityWindow` and `activity` |
| `…/profile/data/profile-activity-repo.server.ts` | New |
| `apps/web/app/shared/lib/timezone-cookie.ts`, `timezone.server.ts` | New: cookie name, validation, client writer, server reader |
| `…/profile/server/profile-loader.server.ts` | Eager `activityWindow`, deferred `activity` with a 4 s timeout |
| `…/profile/utils/with-timeout.ts` | New: resolves to a fallback and logs after N ms |
| `…/profile/components/profile-activity-card.tsx` | New: card, totals, empty state |
| `…/profile/components/profile-activity-grid.tsx` | New: `ActivityGridFrame` (base layer), the colour layer, anchor, pointer and keyboard handling |
| `…/profile/components/profile-activity-tooltip.tsx` | New: Radix content |
| `…/profile/components/profile-skeletons.tsx` | Adds `ProfileActivitySkeleton` and `ProfileActivityUnavailable` |
| `…/profile/components/profile-tokens.ts` | Adds `activityLevelClassName` |
| `apps/web/app/routes/web/profile.tsx` | Renders the card. The stat cards stay commented out. |
| `apps/web/app/root.tsx` | Sets the `lh_tz` cookie |
| `apps/web/app/app.css` | Section 8.2 CSS |

---

## 10. Test plan

**SQL, on validation before production.** Re-run the section 3 cases, then time
the function as the heaviest real organizer and a typical member. EXPLAIN ANALYZE
runs the read only, which is safe on production too:

```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<user uuid>"}';
explain (analyze, buffers) select * from public.profile_activity('Asia/Baku');
rollback;
```

To see the inner plan, use `LOAD 'auto_explain'` with
`auto_explain.log_nested_statements = on`.

**Web QA:**

- **Data:** an organizer, a member, a brand-new user (empty state), and a user
  whose `lh_tz` is `America/New_York` (day boundaries move).
- **Sweep:** dragging the pointer across the grid opens one tooltip after the
  delay, then follows with no flashes and no re-animation.
- **Edges:** dots in the first and last columns and in the top row flip or shift
  the tooltip, which is never clipped. Check inside the narrow-screen scroll box too.
- **Keyboard:** arrows walk days and weeks, Escape closes, and VoiceOver reads the
  day.
- **Touch:** iOS Safari tap, tap another dot, tap outside.
- **Reduced motion:** opacity only, no scale or blur, no skeleton pulse.
- **Layout shift:** none from skeleton to loaded. The base dots never blink.
- **Deferral:** with an artificial 3 s delay in `getProfileActivity` (dev only),
  the header, tabs and tab content paint at normal speed while only the card
  waits. The pulse starts after 1 s and the reveal plays once.
- **Timeout:** with a 5 s delay, the card shows the empty state at 4 s and a log
  line is written.
- **Error:** with the RPC name broken, the card shows "Activity is unavailable
  right now." and the rest of the page is unaffected.
- **Motion gate:** `review-animations` on the diff returns zero blocking findings,
  then a feel-check at 3× in the DevTools Animations panel: the reveal, tooltip
  open and close, and the pulse.
- **Re-renders:** React Profiler shows hovering commits only the anchor and the
  tooltip, never the dots.

There are no automated tests: the web app has none yet (spec 13).

---

## 11. Rollout

1. Apply `0008` to validation and run section 10's SQL checks. Then do the manual
   production run and `codegen`.
2. Ship the web change. The profile is owner-only, so there's no flag.
3. Watch `profile_activity` in `pg_stat_statements` for a week. That decides tier 2.

---

## Open questions

1. **Admins of large communities.** Every event in a managed community counts as
   "Hosted". Should it be only the events the person created?
2. **Approvals.** `approved_by` on `event_registrations` would let the tooltip say
   "Approved 12 registrations". Worth a column?
3. **Anonymous opens.** Email-pixel views with no `user_id` can't be attributed and
   are ignored. Is it fine that this makes "opened" an undercount?
4. **Public profiles.** These need a `p_user_id` variant with visibility rules, and
   probably tier 2.
