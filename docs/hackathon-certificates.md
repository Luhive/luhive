# Hackathon certificates

One-off: certificates for the hackathon that just ended. No organizer UI, no PDF, no template editor. The rankings live in an Excel file outside Luhive, so a script matches it to Luhive teams and a second script issues the certificates.

## Who gets what

- Members of the teams placed 1st, 2nd and 3rd get "1st Place", "2nd Place" or "3rd Place". If two teams share a rank, both get it.
- Members of every other team in the Excel get "Participant".
- A team that isn't in the Excel gets nothing. Being in the Excel means the team submitted.
- Everyone gets the same design. Only the award line and the accent colour change: gold, silver, bronze or neutral.
- Each person gets their own certificate with their own name. It shows their team name, not the list of teammates.

## Flow

```
Organizer:  Excel → match script → review CSV (fix by hand) → issue script → email to everyone
Recipient:  email or profile badge → /certificate/:code → Add to LinkedIn · Copy link · Download · Share
Viewer:     link preview (/api/og/certificate/:code) → certificate page → Join {community}
```

## Status

Built and tested on validation: migration 0017, page, OG image, profile badge, email, both scripts. Production still needs migrations 0017 and 0018 applied by hand, then `pnpm --filter @luhive/db codegen`.

## Steps until the Excel arrives

1. Migration `0017_event_certificates.sql`, then apply on validation.
2. `modules/certificates`: model, repo, page loader, OG image.
3. Public page `/certificate/:code` and the OG route.
4. Profile Achievements row and the account linking on load.
5. Email template and its send function.
6. Both scripts. Their CSV formats are below, so only the column mapping has to wait for the Excel.

Once the Excel arrives: run the match script, resolve the review rows together, run the issue script on validation, check a few certificates, then run it on production and send the emails.

## Data

`packages/db/migrations/0017_event_certificates.sql`, same style as `0016_community_invites.sql`: row level security off, `anon` and `authenticated` revoked, the server reads with the service role.

`event_certificates`

| column | notes |
|---|---|
| `id` uuid pk | |
| `code` text unique | 10-character unguessable code, used in the public URL |
| `event_id` uuid → events, cascade | |
| `registration_id` uuid → event_registrations, **set null** | Deleting a registration later doesn't remove the certificate |
| `user_id` uuid → profiles, set null, nullable | Null until linked to a Luhive account |
| `recipient_email` text, lowercase | Used to link an account later. Never shown publicly |
| `recipient_name` text | Copied at issue time |
| `team_name` text | Copied at issue time |
| `award` text, check `place_1`, `place_2`, `place_3`, `participant` | |
| `event_title`, `event_date`, `community_name`, `community_slug` | Copied at issue time, so later edits to the event don't change the certificate |
| `issued_at`, `revoked_at` | |

Unique `(event_id, registration_id)`, so re-running the issue script updates rows instead of duplicating them. Index on `user_id` and on `lower(recipient_email) where user_id is null`.

The table holds no award records, team links or scores. For a one-off, the copied text is the record.

## Code

Follows the hackathon module: pure rules in `model`, I/O in `data` and `server`, imported as namespaces.

```
app/modules/certificates/
  model/certificate.ts            import * as Certificate
    award → label ("1st Place"), award → accent, rank → award,
    linkedInAddToProfileUrl(cert, origin), shareText(cert). Pure, no I/O.
  data/certificates-repo.server.ts import * as Certificates
    findByCode, listForUser, linkByEmail(userId, email), upsertMany
  server/certificate-loader.server.ts
    loader for the public page. A missing or revoked code returns 404.
  server/certificate-og-image.server.tsx
    1200×630 image built with ogFactory, reusing the event OG's fonts and Luhive mark
  components/certificate-card.tsx    used by the page (and the badge if it fits)
  components/certificate-share-bar.tsx
```

Routes, added to `routes.ts` and `Routes`:

- `routes/web/certificate.tsx` → `certificate/:code`. Standalone, outside the top-nav layout. The meta tags are `og:image` pointing at the OG route, `robots: noindex`, and a title like "{Name}, 1st Place at {Hackathon}".
- `routes/api/og/certificate.tsx` → `api/og/certificate/:code`. Cached as immutable, keyed on `code` plus `updated_at`, so a corrected name produces a new image.

### Public page (mobile first)

From top to bottom:

1. The certificate card: community, recipient name, award, team, hackathon, date.
2. Buttons: **Add to LinkedIn** (primary) · Copy link · Download image · Share (the phone's share sheet, where the browser supports it).
3. "Verified · ID {code} · issued {date} by {community} via Luhive".
4. Growth block: "Join {community}" and its upcoming events.

**Add to LinkedIn** opens `linkedin.com/profile/add?startTask=CERTIFICATION_NAME` with the name, organization, issue month and year, certificate URL and ID filled in. It never posts anything automatically. Download fetches the OG PNG.

The page shows no email, no teammate list, no scores and nothing from the team description.

### Profile badge

- `profile-loader.server.ts`: first `Certificates.linkByEmail(authUser.id, authUser.email)`, which links certificates issued before the person had an account. Then `Certificates.listBadgesForUser`, deferred like `events`, so it never holds up the page.
- `modules/profile/components/profile-achievements.tsx`: a row of badges ("🥇 1st Place · {Hackathon}"). Clicking one opens `/certificate/:code`. The row is hidden when the list is empty.

### Email

`app/templates/hackathon-certificate-email.tsx` plus `sendHackathonCertificateEmail` in `email.server.ts`. The subject is "Your certificate for {Hackathon}", and the only button links to the certificate page. The issue script sends it once per row, and only where `emailed_at` is null. That means one more column, `emailed_at`, so a re-run never sends a second email.

## Scripts

These are in `apps/web/scripts/` and load the environment the same way as `test-mail.ts`. Both take `--prod`, the same flag `test-db.sh` uses, and default to validation.

**`pnpm certificates:match <excel.xlsx> --event <slug>`** (`--sheet`, `--team-col`, `--rank-col` when the headers aren't obvious) writes `certificates-review.csv`:

```
excel_rows, excel_team, rank, award, status, team_id, luhive_team, members, note
```

- `status` is `matched` (exactly one case- and space-insensitive name match), `review` (a close match or several candidates, with the options listed in `note`), or `unmatched`.
- If the Excel lists people instead of teams, they are matched by email first and name second, then grouped by their Luhive team.
- The script writes nothing to the database.

**`pnpm certificates:issue certificates-review.csv --event <slug> [--prod] [--dry-run] [--send]`**

- Refuses to run if any row is still `review` or `unmatched`. You set those to `matched` with a `team_id`, or to `skip`.
- For each team, it loads the current members. The name comes from `profiles.full_name`, or `anonymous_name` if the person has no account. The email comes from the account, or `anonymous_email`.
- Upserts one row per member, setting `user_id` when the registration has one.
- `--dry-run` prints the counts per award and every name, and writes nothing. `--send` sends the emails that haven't gone out yet.

## Spreading it

The point of a certificate is that people share it and tag Luhive.

- **Owner view and visitor view.** The recipient (signed in as the owner, or arriving with `?k=<key>` from their email) gets the share actions. The key is an HMAC of the code (`certificate-owner.server.ts`, signed with `UNSUBSCRIBE_SECRET` under a `certificate:` prefix), so it can't be guessed. The page drops `?k=` from the address bar, so a copied URL opens the visitor view: the certificate, "Join {community}", and "Is this your certificate? Sign in".
- **LinkedIn certification.** With Luhive's company ID (`Certificate.LUHIVE_LINKEDIN_ORGANIZATION_ID`, 108280257), the entry in Licenses & certifications shows the Luhive logo and links to our page; the community moves into the certificate name.
- **LinkedIn post.** After "Add certificate to LinkedIn" a toast offers "Write post"; the ⋯ menu has it too. It opens LinkedIn's composer with a caption that ends "Issued via @Luhive #BuiltOnLuhive #hackathon" and copies the caption. LinkedIn can't prefill a real mention, so the toast asks them to retype @Luhive and pick it from the list.
- **Instagram story.** The story image names the community's Instagram handle (from its social links) and @luhivecom. The toast asks them to tag both: "We repost every one."
- **Links are tagged** `utm_source=linkedin|copy`, `utm_medium=certificate`, `utm_content=profile|post`.
- **Measuring.** `event_certificate_events` (migration 0018) records a row per visitor view (with its utm_source, link-preview crawlers skipped) and per share action. `pnpm test-db certificates <event-slug>` (or `prod-db`) shows emailed, shared, shares by channel, views by source, and per person.

## Not doing

Organizer UI, PDF, public leaderboard, claim flow, template editor, certificates for events that aren't hackathons. Revoking a certificate is a one-line SQL update to `revoked_at`.
