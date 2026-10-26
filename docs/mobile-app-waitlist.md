# Mobile app waitlist (`/app`)

A single page at `luhive.com/app` where people join the list for the Luhive
mobile apps. The first link to it is the first comment under the LinkedIn
announcement on Wed 28 Oct 2026. After that comes a link from the landing page,
and later its own landing section (separate specs, section 12).

Signing up means two things:

1. a welcome email from Ali, straight away;
2. a weekly progress email from Ali until the apps ship, which people can
   unsubscribe from at any time.

## Status

Spec, 26 Oct 2026. Built the same day on `feat/mobile-app-waitlist` and tested
against the validation DB. Production migration and the Resend segment are
still to do (section 11). The earlier attempt (PR #180) was closed and removed.

---

## 1. Decisions

| Topic | Decision |
|---|---|
| Language | English across the whole page and both emails. |
| Template | The landing page's own `LandingNavbar` and `LandingFooter`, reused, not copied. The hero matches `LandingAbout` one to one. |
| Title | "**Mobile app** / on the way", with "Mobile app" in `--primary` (the word "Luhive" was dropped from the heading on 26 Oct 2026; the app icon above carries the brand). The `<title>` and OG image read "Luhive mobile app on the way" (singular since 26 Oct 2026). |
| Launch date | Never shown. |
| Form | One grouped email field and **Notify me**. Logged in: the account email is prefilled, editable (to add a friend). |
| Feature question | Not on the form. It's asked once on the success state, optional, one tap. |
| Platform question, beta opt-in, share, referral | Out. |
| Counter | "**{50 + n} people subscribed**", where `n` is real signups minus unsubscribes. The 50 is a fixed display offset, accepted knowingly on 26 Oct 2026. |
| Mockup / visuals | None for now. Ali will supply designs later and they go below the form, where the dashboard image sits on the landing page. |
| Welcome email | Sent on first signup only, in Ali's voice, 2–3 sentences. |
| Weekly email | Sent by hand from Resend Broadcasts to a Resend segment, from Ali. Resend owns the unsubscribe link. |
| Analytics | **Umami only.** No GA4 events from this page. |
| Motion | **Mandatory contract**, section 8, built from the repo's Emil Kowalski skills. Anything not listed there does not animate. |
| Storage | New table `mobile_app_waitlist`, hand-written migration, types generated from the DB. |

---

## 2. Who arrives and what that implies

Most visitors tap the first comment of a LinkedIn post: on a phone, inside
LinkedIn's in-app browser (`LinkedInApp` in `is-in-app-browser.ts`), and having
just read a post in Azerbaijani.

- **They look logged out even if they have an account.** The in-app browser
  has no Luhive session. The email path must therefore be the main path, and
  matching on email (section 3) joins their signup to their account later.
- **No sign-in, no Google button.** The "149 visits, 0 signups" lesson:
  Google sign-in is blocked in in-app browsers. This page never asks anyone to
  log in.
- **Phone first.** At 375 px the field, the button and the counter must sit
  above the fold.
- **No JS dependency for the core action.** The form is a React Router `<Form>`
  and works before hydration. Analytics and motion are layered on top.

---

## 3. Data: migration `0009_mobile_app_waitlist.sql`

One row per person.

```sql
CREATE TABLE public.mobile_app_waitlist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    user_id uuid,
    first_feature text,
    utm_source text DEFAULT 'direct' NOT NULL,
    utm_medium text,
    utm_campaign text,
    utm_content text,
    utm_term text,
    welcome_sent_at timestamp with time zone,
    resend_contact_id text,
    unsubscribed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mobile_app_waitlist_pkey PRIMARY KEY (id),
    CONSTRAINT mobile_app_waitlist_email_key UNIQUE (email),
    CONSTRAINT mobile_app_waitlist_email_normalised
      CHECK (email = lower(btrim(email)) AND email <> ''),
    CONSTRAINT mobile_app_waitlist_first_feature_check
      CHECK (first_feature IS NULL OR first_feature IN
        ('event_notifications', 'qr_tickets', 'discover_events'))
);

CREATE UNIQUE INDEX mobile_app_waitlist_user_id_key
  ON public.mobile_app_waitlist (user_id) WHERE user_id IS NOT NULL;

ALTER TABLE ONLY public.mobile_app_waitlist
  ADD CONSTRAINT mobile_app_waitlist_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Service-role only, same as ticket_orders.
ALTER TABLE public.mobile_app_waitlist DISABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.mobile_app_waitlist FROM PUBLIC, anon, authenticated;
```

| Rule | Behaviour |
|---|---|
| Dedupe | `email` is unique, stored lowercased and trimmed. A logged-in user's row carries both their account email and `user_id`. |
| Repeat signup | Nothing changes. First-touch `utm_*` is kept. If the row has no `user_id` and the person is now signed in, it gets linked. |
| Re-signup after unsubscribing | Clears `unsubscribed_at` and re-adds the contact to the Resend segment. No second welcome email. |
| `first_feature` | Set once from the success state. A later answer from the same row overwrites it (people change their mind; we want the latest). |

**Workflow** (per `packages/db/README.md`):

1. Apply with `migrate:validation`.
2. Regenerate types. The validation DB has unrelated drift, so generate from it
   and keep only the `mobile_app_waitlist` blocks.
3. Apply the same file to production by hand **before** `main` deploys.
4. Run `codegen` against production. The result must be identical.

---

## 4. Server

Module `app/modules/mobile-app/`, following the repo's module layout:

```
modules/mobile-app/
├── model/mobile-app-meta.ts           title, description, og tags, canonical
├── model/mobile-app-waitlist.ts       FEATURE_OPTIONS, COUNTER_BASE = 50
├── data/mobile-app-waitlist-repo.server.ts
├── server/mobile-app-loader.server.ts
├── server/mobile-app-action.server.ts
├── server/mobile-app-welcome.server.ts   welcome send + Resend contact
├── components/…                          section 6
└── utils/mobile-app-analytics.ts         Umami-only tracker, section 7
```

Route `app/routes/web/mobile-app.tsx`, registered as `route("app", …)` in `routes.ts`
outside the `web/layout.tsx` group (the page brings its own nav). Add
`Routes.mobileApp = "/app"`.

### 4.1 Loader

Returns `{ user, alreadyJoined, subscribedCount, utm }`.

- `user`: `{ email }` or `null`, from `findAuthUser()`. Free for visitors with no session cookie.
- `alreadyJoined`: only for signed-in users. True if a row matches their `user_id` or account email.
- `subscribedCount`: `COUNTER_BASE + count(*) WHERE unsubscribed_at IS NULL`, computed with a `head: true, count: 'exact'` query.
- `utm`: from `parseUTMFromSearchParams` (`modules/events/utils/utm-source.ts`), the same helper the event pages use. A missing source becomes `direct`.

### 4.2 Action, two intents

**`intent=join`**

1. Honeypot: a visually hidden `company` field. If it's filled, return success and write nothing.
2. Email always comes from the form, validated, at most 320 characters. It is linked to the signed-in account only when it matches the account email; otherwise it joins as a visitor (e.g. a friend added by a signed-in user).
3. Insert the row. On a unique violation, apply the repeat-signup rules from section 3.
4. **New rows only:** send the welcome email and create the Resend contact in the segment (section 5). This is awaited with a 4 s timeout. A failure is logged, the row is left with `welcome_sent_at IS NULL`, and the signup still succeeds.
5. Return `{ ok: true, signupId, subscribedCount }`. `signupId` is the row id, which the feature question uses. `subscribedCount` lets the counter tick (motion M7).

Already-subscribed and new signups get **the same** success state, so the page
never reveals whether an email is on the list.

**`intent=answer`**

Takes `signupId` and `feature`. Updates `first_feature` where `id = signupId`.
The uuid is unguessable and the only effect is one enum column, so it needs no
other auth. Returns `{ ok: true }`.

### 4.3 Errors (copy)

| Case | Copy under the field |
|---|---|
| Invalid email | "Please enter a valid email address." |
| DB failure | "Something went wrong. Please try again in a moment." |

---

## 5. Email

Domain roles follow `docs/email-deliverability-phase1.md`: transactional mail
goes from `events.luhive.com`, bulk from `news.luhive.com`.

### 5.1 Welcome (transactional, on first signup)

- **From:** `Ali from Luhive <{EMAIL_SENDER address}>`, so the existing transactional address on `events.luhive.com` with Ali's name in front. Its replies already reach the Google Workspace inbox (changed while building, 26 Oct 2026).
- **Reply-To:** the Reply-To Ali already has configured with Google Workspace. Reuse it; no new env var.
- **Format:** plain text plus a minimal React Email template in
  `app/templates/mobile-app-welcome-email.tsx`, with no images and no buttons,
  so it reads like a personal note.

> **Subject:** You're on the Luhive app list
>
> Hey, Ali here. Thanks for signing up for the Luhive mobile app, you're one of the first.
> Every week I'll send you a short note on what we built and what broke, and you can just hit reply to tell me what you want in it.

Footer, one line: "You're getting this because you joined at luhive.com/app."

### 5.2 Weekly progress (bulk, by hand)

- The audience is a **Resend segment** "Mobile app waitlist" (`RESEND_MOBILE_APP_SEGMENT_ID`). The repo's `resend@6.12` has `contacts`, `segments`, `broadcasts` and `webhooks`.
- The contact is created at signup (step 4 of `join`). `resend_contact_id` is stored.
- Ali writes and sends each week from Resend Broadcasts: from `Ali from Luhive <ali@news.luhive.com>`, with the same Google Workspace Reply-To, in English, in his voice. Resend adds the unsubscribe link and the `List-Unsubscribe` headers.
- **Unsubscribes are handled by hand** (decided 26 Oct 2026; no webhook code). Resend owns the unsubscribe link. To take someone out of the counter, set `unsubscribed_at` on their row.
- No scheduler and no mail queue. The mail queue spec (`docs/spec/10 Mail Queue.md`) is Stage 2 and is not a dependency.

---

## 6. UI

### 6.1 Page structure

```
LandingNavbar          (reused, section 6.2)
Hero section           (LandingAbout classes, 1:1)
  Stickers             4 die-cut icons around the content (bell, QR ticket, pin, phone), anchored
                       to a 780 px frame so they stay centred. Phones (26 Oct 2026): all four,
                       smaller; bell and ticket flank the app icon, pin and phone flank "on the way".
                       Also on phones: the hero starts under the navbar (not centred) and the
                       title is text-5xl.
  App icon tile        Luhive mark in a rounded-square, white-to-grey tile (added 26 Oct 2026)
  h1                   [Mobile app] / on the way
  p                    subtitle
  WaitlistCard         form → success state (6.4)
  Counter              "{N} people subscribed"
[design slot]          empty until Ali's designs arrive
LandingFooter          (reused as-is)
```

The page imports `~/shared/lib/i18n` the same way `routes/web/index.tsx` does,
because the navbar and footer read translations.

### 6.2 Navbar changes (`LandingNavbar`)

The navbar was written for one page. Two small, backwards-compatible props:

| Prop | Default | On `/app` | Why |
|---|---|---|---|
| `sectionBase` | `""` | `"/?home"` | Features / Pricing / FAQ's link to `/?home#features`, and so on. On `/app` the anchors don't exist. |
| `trackActiveSection` | `true` | `false` | Without it, "Features" sits highlighted orange on a page that has no Features section. |

The Book a Call button, the signed-in avatar link and the scroll behaviour are
unchanged. `LandingFooter` is reused without changes.

### 6.3 Hero

Copy the classes from `LandingAbout`:

- section `bg-[#F6F4F1] pt-32 pb-12 md:pt-28 lg:pt-36 lg:pb-20`;
- container `mx-auto w-[95vw] 3xl:w-[60rem] text-center`;
- h1 `text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-semibold tracking-tight`;
- subtitle `max-w-3xl text-sm lg:text-lg text-muted-foreground`.

> Your events, tickets and communities on your [Apple logo] [Android logo] phone.
> Be the first to know when it's ready. (Two centred lines, logos from Hugeicons; changed on request 26 Oct 2026.)

### 6.4 Waitlist card states

The counter sits above the card (changed while building, 26 Oct 2026), so a
state change only moves content below the card, never the counter. No reserved
height.

| State | Content |
|---|---|
| **Form, logged out** | One grouped light-grey (`#F2F2F2`) pill (`max-w-md`, soft shadow, focus ring on the whole group): the email input on the left ("Your email address") and an orange **Notify me** button with a bell icon inside it on the right. Under it, the trust line: "Weekly build updates from founder. Unsubscribe anytime." (Grouped layout added 26 Oct 2026.) |
| **Form, logged in** | The same grouped pill with the account email prefilled, and still editable so a user can add a friend (26 Oct 2026). Only the account's own email is linked to `user_id`; any other email joins as a visitor row. Same trust line. |
| **Submitting (optimistic)** | Pressing **Notify me** with a valid email shows the success state at once (after the 120 ms form exit) and the counter ticks +1, before the server answers. The feature chips stay disabled until the real signup id arrives. If the server fails, the form comes back with the email still filled in and the error, and the counter rolls back. Invalid emails are caught on the client with the same rule as the action (`isValidWaitlistEmail`), so they never flash success. (26 Oct 2026.) |
| **Error** | The message sits in a reserved line under the field. `aria-invalid` and `aria-describedby` are set on the input. |
| **Success** | Check mark and "You're on the list" (the line under it was removed on request, 26 Oct 2026). Then the question, "What should the first version have?", with three chips: Personalized notifications / QR tickets / Discover new events. |
| **Add another email** | A link at the bottom of the success state (added 26 Oct 2026). It brings back an empty, focused form so a person can add a friend; each new signup ticks the counter again. Without JS it is a plain link that reloads `/app`. |
| **Answered** | All three chips stay; the chosen one is filled and can still be changed. "Thanks, noted." appears under them. |
| **Already joined (logged in, on load)** | The success state, static, with the question shown if `first_feature` is still empty. |

**Button:** the same pill as `BookACallButton`: `#FF6D23`, the same shadow,
`rounded-full`, label then a white-tinted arrow circle on the right. It's a
plain `<button type="submit">`, not the Book a Call `<a>` with its avatar.

**Chips:** the same style as `DiscoverCommunitiesLink`:
`border-primary/15 bg-primary/[0.06] text-foreground/70`. When selected:
`bg-primary text-white`. They are real radio inputs, keyboard-reachable, and
submitting happens on change (one tap), with a `<noscript>` submit button.

### 6.5 Counter

- Placed under the card (moved back below on request, 26 Oct 2026), `text-base text-muted-foreground`, number in `font-semibold tracking-tight text-foreground` (no `tabular-nums`, which spread "51" too wide). Example: "**52** people subscribed". It shifts when the card changes height; accepted.
- `tabular-nums` so digits don't jitter when they change.
- The number never animates on page load. It moves once, for the visitor's own new signup (M7).

### 6.6 Meta and link preview

- `<title>`: "Luhive mobile app on the way". Description: "Be the first to know when the Luhive mobile app is ready." Canonical `https://luhive.com/app`.
- **OG image** at `api/og/app`, built with the existing `og-factory`, like `api/og/hub/:week`. LinkedIn shows a preview card for the comment link, and that card is the first impression. It uses the hero title on `#F6F4F1`, 1200×630.

---

## 6.7 SEO (26 Oct 2026)

Indexable, server-rendered, ready for Google Search Console.

- **Meta** (`model/mobile-app-meta.ts`): title "Luhive Mobile App for iPhone and Android – Join
  the Waitlist", a 155-character description, `robots: index, follow, max-image-preview:large`,
  canonical `https://luhive.com/app`, full Open Graph and Twitter cards.
- **Structured data**: one JSON-LD `@graph` with Organization (logo, social profiles),
  WebSite, WebPage, BreadcrumbList (Luhive › Mobile app) and FAQPage. Deliberately **no
  MobileApplication/SoftwareApplication**: Google's app rich result needs ratings and an
  offer, which an unreleased app cannot honestly give, and Search Console would report it
  as an invalid item.
- **Content** (`components/mobile-app-details.tsx`, copy in `model/mobile-app-content.ts`):
  below the hero, an h2 "What's coming in the Luhive app" with three h3 features, and an
  h2 "Got questions?" FAQ in `<details>` (answers stay in the HTML when closed). Styled one
  to one on the landing page's LandingFeatures (left-border items, no cards; each title led by
  a 3D icon from Ali, `assets/images/mobile-app/feature-*.webp`, 192 px shown at 48 px) and
  LandingFAQ (divided list, +/−, first item open, 250 ms height/opacity via
  `::details-content`). The FAQPage
  JSON-LD is generated from the same content, so it always matches the page.
- **Headings**: one h1 ("Luhive Mobile app on the way"; "Luhive" is `sr-only`, the app icon
  carries it visually), then h2 → h3.
- **Sitemap / robots**: `/app` added to `public/sitemap.xml`. `robots.txt` now
  `Allow: /api/og/` ahead of `Disallow: /api/`, so link-preview crawlers (LinkedIn obeys
  robots.txt) can fetch the share image.

## 6.8 "While you are waiting" (26 Oct 2026)

The last section before the footer gives visitors something to do on Luhive today
(`components/mobile-app-while-waiting.tsx`, data from `server/mobile-app-waiting.server.ts`):

- **Upcoming events first:** the next three from `hub_events`, through the hub's own
  `listUpcomingHubEvents` (it now takes an optional `limit`). Each one is a compact copy of
  the hub's event card (cover, date and time, title, place and community) linking to the
  event page, without the hub's preview drawer.
- **No upcoming events:** the three most active communities (most events, then most
  members), shown with the hub's own `ExploreCommunityCard`.
- **"Explore more"** orange text link, underlined on hover, to `/hub`.
- Fewer than three items stay centred. The loader fetches this in parallel with the rest.
- Umami: `mobile_app_waiting_clicked` with `item` = `event`, `community` or `explore`.

## 7. Analytics (Umami only)

Reuse the shared analytics tool. `shared/lib/analytics/analytics.ts` exports
`umamiAnalytics` next to the default `analytics`, so nothing reaches GA4.
`modules/mobile-app/utils/mobile-app-analytics.ts` wraps it in named track
functions, the same way `landing-analytics.ts` does, and components import it as
`* as MobileAppAnalytics`.

Page views already come from the Umami script in `root.tsx`, and Umami records
the `utm_*` query on its own.

| Event | When | Properties |
|---|---|---|
| `mobile_app_email_focused` | First focus of the email field, once per page view | `in_app_browser` |
| `mobile_app_signup_submitted` | Submit pressed | `logged_in`, `in_app_browser` |
| `mobile_app_signup_succeeded` | Action returned ok | `logged_in`, `in_app_browser`, `utm_content` |
| `mobile_app_signup_failed` | Action returned an error | `reason`: `invalid_email` or `server` |
| `mobile_app_feature_answered` | A chip submitted ok | `feature` |

**Funnel in Umami:** `/app` view → `email_focused` → `signup_submitted` →
`signup_succeeded` → `feature_answered`. Split by `in_app_browser` and
`utm_content`. The table is the source of truth for who signed up; Umami is for
where people drop off.

**Links to use:**

| Placement | URL |
|---|---|
| LinkedIn first comment | `luhive.com/app?utm_source=linkedin&utm_medium=social&utm_campaign=mobile_app&utm_content=first_comment` |
| Weekly email (links back) | `…&utm_source=email&utm_campaign=mobile_app_weekly` |
| Landing link (next spec) | `…?utm_source=landing&utm_content=nav` |

**GA4 page views:** `root.tsx` keeps sending its site-wide GA4 page view for
`/app`. Decided 26 Oct 2026: leave it. Only this page's custom events are
Umami-only.

---

## 8. Motion contract (mandatory)

Built from the repo's Emil Kowalski skills: `.agents/skills/emil-design-eng`,
`animate` (+ `RECIPES.md`), `find-animation-opportunities`,
`review-animations/STANDARDS.md`. Same rules as `docs/profile-activity.md` §8:

1. **This table is the complete list.** Anything not in it does not animate.
2. **Values come from the table.** Use the existing `--ease-out-strong` token
   (`cubic-bezier(0.23, 1, 0.32, 1)`, the skills' `--ease-out`). No new curves.
3. **Reduced motion ships with each item.** It's a gentler variant, not a follow-up.
4. **Only `transform` and `opacity` animate**, plus `filter: blur(2px)` to mask
   crossfades and `background-color` on hover and selection.
5. **Hover motion is gated** behind `@media (hover: hover) and (pointer: fine)`.
6. **Merge gate:** a clean `review-animations` pass on the diff, every item
   feel-checked at 3× in the DevTools Animations panel, and the touch items
   checked on a real phone, inside the LinkedIn app.

### 8.1 Inventory

| # | What | Frequency | Purpose | Tool | Motion | Reduced motion |
|---|---|---|---|---|---|---|
| M1 | Button press (Notify me, chips) | Occasional | Feedback | CSS transition on `:active` | `scale(0.97)`, 160 ms, `--ease-out-strong` (RECIPES "Button press") | None needed: no travel |
| M2 | Button hover | Occasional, pointer only | Feedback | CSS transition | `background-color` 200 ms `ease`. The arrow moves `translateX(2px)`, 200 ms `--ease-out-strong`, the same nudge as `DiscoverCommunitiesLink`. Gated. | Colour only |
| M3 | Chip select | Once per visitor | State indication | CSS transition | `background-color`, `color` 150 ms `ease` | Same |
| M4 | Field focus (grouped pill) | Occasional | Feedback: the field is ready for typing | CSS transition on `:focus-within` | The existing 3 px `primary/20` ring (`box-shadow`) and `primary/40` border ease in, 200 ms `--ease-out-strong`. No travel. Added on request, 26 Oct 2026. | Same: colour and shadow only |
| M5 | Submitting: label → spinner | Once per visitor | State indication | CSS transition on `data-state` | Label and spinner crossfade, `opacity` plus `blur(2px)`, 150 ms `--ease-out-strong`. Button width is fixed by the label, so nothing reflows. | Opacity only |
| M6 | Form → success | Once per signup (rare tier: the delight budget) | Preventing a jarring change, then delight | Form exit: CSS transition. Success: CSS keyframes | The form exits: `opacity` 0 + `blur(2px)`, 120 ms. Then a sequence (changed on request 26 Oct 2026): the orange circle pops `scale(0.5)` → 1.08 → 1 with `opacity`, 440 ms `--ease-out-strong`; the tick draws itself along its path (`stroke-dashoffset` 1 → 0) from 200 ms, 360 ms; "You're on the list" rises at 420 ms, the question at 580 ms, "Add another email" at 720 ms, each `translateY(8px)` + fade, 380 ms. The counter is not part of it (M7 rolls on its own). | Fade only, tick shown drawn |
| M7 | Counter tick on own signup | Once per visitor | State indication: "you're in this number" | CSS transition, two stacked spans in an `overflow: hidden` line box | Old number `translateY(-100%)` and `opacity` 0. New number from `translateY(100%)` to 0. 250 ms `--ease-out-strong`, starting 150 ms after M6 begins. | Instant swap |
| M8 | "Thanks, noted." after a chip | Once per visitor | Feedback | `@starting-style` | All chips stay; the chosen one fills (M3) and can still be changed. The thanks line enters `opacity` + `translateY(4px)`, 200 ms. (Changed on request 26 Oct 2026: the other chips no longer disappear.) | Opacity only |
| M9 | Error line appears | Rare | State indication | `@starting-style` | `opacity` 0 → 1, `translateY(-4px)` → 0, 150 ms. No shake. The line's space is reserved, so nothing moves. | Opacity only |
| M11 | App icon "live" border | Constant while on the page | Delight (requested 26 Oct 2026) | CSS keyframes (continuous, off the main thread) | A silver highlight (grey to white to grey) sweeps around the 1.5 px border, `rotate(1turn)` 4 s `linear` infinite. No background glow. Transform only. | None: static silver border |
| M12 | Hero stickers (bell, QR ticket, map pin, phone) | Launch once; float constant | Delight (requested 26 Oct 2026, Luma-style) | CSS keyframes; JS only measures each sticker's offset to the hero centre, and the pointer drift is one rAF lerp loop that sleeps when settled | Launch after the hero stagger (M13) lands (~660 ms after load, or at hydration if later): each sticker flies from the hero centre to its place, `translate(offset)` + `scale(0.5)` → none and `opacity` 0 → 1, 700 ms `--ease-out-strong`, 40 ms apart. Float `translateY` 0 ↔ −4 px, 4.6–6.1 s `ease-in-out` alternate. Desktop pointer drift and hover lift as before. Without JS the stickers simply show. | Fade only, in place; no float, no drift |
| M13 | First-load hero stagger | Once per page load | Delight / orientation (requested 26 Oct 2026) | CSS keyframes, the skills' "Stagger a group entrance" recipe | App icon → "Mobile app" → "on the way" → subtitle line 1 → line 2 → form → counter: each `opacity` 0 → 1 and `translateY(8px)` → 0, 300 ms `--ease-out-strong`, 60 ms apart. Stickers (M12) launch after the counter has landed. Never blocks interaction. | Fade only, 200 ms |
| M10 | Navbar | — | — | **Unchanged** (the landing page's existing behaviour) | — | — |

### 8.2 Rejected (do not build)

| Candidate | Why not |
|---|---|
| Counter count-up on load | The number is read, not admired. It would also draw attention to a figure that includes the display offset. |
| Confetti or burst on success | Too loud for a quiet launch. The M6 stagger is the delight budget. |
| Input shake on error | Reads as a scold. M9 states the error calmly. |
| Toast (Sonner) for success | The state is inline. A toast would say the same thing twice. |
| Parallax or scroll-linked motion | No content to reveal yet. Revisit when the designs arrive. |

### 8.3 CSS (`app/app.css`)

```css
/* M1 */
.waitlist-press { transition: transform 160ms var(--ease-out-strong); }
.waitlist-press:active { transform: scale(0.97); }

/* M6 enter, M8 enter, M9 */
.waitlist-enter {
  transition:
    opacity 220ms var(--ease-out-strong),
    transform 220ms var(--ease-out-strong);
  transition-delay: calc(var(--i, 0) * 50ms);
}
@starting-style {
  .waitlist-enter { opacity: 0; transform: translateY(6px); }
}

/* M7 */
.waitlist-count { display: inline-grid; overflow: hidden; }
.waitlist-count > span {
  grid-area: 1 / 1;
  transition:
    transform 250ms var(--ease-out-strong),
    opacity 250ms var(--ease-out-strong);
}

@media (prefers-reduced-motion: reduce) {
  .waitlist-enter { transition: opacity 150ms ease; transition-delay: 0ms; }
  @starting-style { .waitlist-enter { transform: none; } }
  .waitlist-count > span { transition: none; }
}
```

`@starting-style` needs Chrome 117+, Safari 17.5+ or Firefox 129+. Older
browsers show the success state instantly, which is acceptable.

---

## 8b. Sound (cuelume)

Added 26 Oct 2026 following https://cuelume.dev/agents.md, then cut back on request to a
single cue: **`success` (strong) when a valid "Notify me" is pressed**, played inside the
click alongside the optimistic success state. No other sounds on the page.

`cuelume@0.2.8` (MIT, no runtime deps, Web Audio, SSR-safe) sits behind
`shared/lib/sound/sound.ts`, used as a namespace (`import * as Sound from
"~/shared/lib/sound/sound"`): `Sound.play`, with our own cue type. Only that file imports
cuelume.

No sound toggle: with a single cue on a click the visitor makes, it was removed on request
(26 Oct 2026). The browser's own mute and the OS volume cover it.

## 9. Change list

| File | Change |
|---|---|
| `packages/db/migrations/0009_mobile_app_waitlist.sql` | New (section 3) |
| `packages/db/src/db.types.ts`, `supabase.types.ts` | `mobile_app_waitlist` blocks only |
| `apps/web/app/routes.ts`, `shared/lib/routing/routes.ts` | `/app`, `/api/og/app` |
| `apps/web/app/routes/web/mobile-app.tsx` | New page |
| `apps/web/app/modules/mobile-app/**` | New module (section 4) |
| `apps/web/app/modules/landing/components/landing-navbar.tsx` | `sectionBase`, `trackActiveSection` props |
| `apps/web/app/templates/mobile-app-welcome-email.tsx` | New |
| `apps/web/app/routes/api/og/app.tsx` | New OG image |
| `apps/web/app/app.css` | Section 8.3 |
| env | `RESEND_MOBILE_APP_SEGMENT_ID` |

---

## 10. Test plan

**Flows** (validation DB, local):

- Logged out, new email: a row is written with lowercased email and `utm_*`. The welcome email arrives. The Resend contact is in the segment. The counter ticks by 1.
- Same email in a different case: same row, UTM unchanged, no second email, the same success state. The counter does not tick.
- Logged in, new: no field, the row has `user_id`. On reload, the "already joined" state shows.
- Logged in with an email that already has an anonymous row: the row gets linked, nothing else changes.
- Feature answer: `first_feature` is set. Answering again overwrites it.
- Honeypot filled: success shown, no row.
- Resend down (bad key locally): signup succeeds, `welcome_sent_at` stays null, the error is logged.

**Environment:**

- Inside the LinkedIn app on iOS and Android (real devices, via a tunnel to local dev): keyboard type, autofill, no layout jump when the keyboard opens.
- 375 px and desktop. JS disabled: join still works.

**`break-ui` pass** on the card and counter. Worst cases from its catalog:

- a 320-character email in the logged-in line;
- an IDN email address;
- a counter of `10 050 people subscribed`;
- a slow 3G submit (does the button hold its width?);
- an error and a success back to back.

**Merge gate:**

- `pnpm typecheck` shows no new errors;
- a clean `review-animations` pass;
- the motion feel-check from §8.

---

## 11. Rollout

1. Build on a branch, open a PR to `development`, test locally against validation.
2. Create the Resend segment and add the env vars on Netlify (production).
3. **Apply `0009` to production by hand**, then regenerate types against production.
4. Merge to `main` and deploy by **Tue 27 Oct**, a day before the post.
5. Before posting, sign up once on production with Ali's own email. Check the
   welcome email arrives in the inbox, not spam, in Gmail and Outlook.
6. Wed 28 Oct: post, then add the first-comment link.
7. Before the first weekly email: a test broadcast to Ali alone checks the
   unsubscribe link end to end.

---

## 12. Next specs (not this one)

- A link from the landing page to `/app` (`utm_source=landing`).
- A mobile apps section on the landing page.
- Ali's designs in the design slot below the form.

## Resolved questions (26 Oct 2026)

1. **Reply-To:** already configured with Google Workspace; reuse it.
2. **Counter wording:** "52 people subscribed".
3. **GA4 page views on `/app`:** left as they are.
4. **Chip wording:** "Discover new events".
