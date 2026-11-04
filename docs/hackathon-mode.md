# Hackathon mode

A free native event can be a hackathon. People still register as themselves. The new piece is the team.

`app/modules/events/**` is unfrozen for this feature only. The exception is recorded in `docs/spec/12`. Registration still lives in the web app, so the team rules live next to it. There is no core-api slice and no new `person_events` type.

## What it does

- The Hackathon section of the event form shows only on free events. Turning it on forces require-approval and locks that control. An optional maximum team size sits under the switch.
- Turning it on adds three questions to the top of the custom questions: Team name, Team plan, and LinkedIn (a `social` question). Turning it off removes them. Once any team exists, the switch is locked on.
- Someone who registers without a join link is a captain. Their Team name and Team plan answers create the team. They get a private join link, `/:eventSlug/join/:code`.
- Right after registering, the captain's team sheet opens on the event page. The registered card also has an "add your teammates" link that opens it. There they invite teammates by email, or copy the join link. An email invite only sends the join link. The sheet lists invites as Invited until that email joins, and the captain can cancel one. With a maximum team size, members plus open invites cannot pass it.
- A teammate opens that link and registers there, with the existing one-time code when signed out. They answer every custom question except Team name and Team plan. Someone already registered and not on a team answers the same questions and joins. Their earlier answers are kept.
- LinkedIn is stored in the registration's answers and on `profiles.metadata.social_links.linkedin`.
- The organizer approves or rejects the whole team from the attenders page. Per-person approval and Invite are hidden there. Pending people do not count toward capacity. Approving a team that would pass capacity is refused. After a decision, that team's join link closes.
- Every team member sees the team from the registered card on the event page. The captain also opens it from "Show Team" on the profile Events tab. The sheet copies the invitation link and lists the roster.
- The captain gets an email when someone joins the team.
- The captain can remove a teammate or make someone else captain. The organizer can remove a teammate. No one can remove the captain.
- Nobody stays registered without a team. Removing someone, or leaving, deletes that event registration (someone removed gets an email saying so, with a link to register again); their Luhive profile and account stay, and they can register again to join or start a team. A captain who leaves picks the next captain first. A solo captain who leaves deletes the team.
- Cancelling a registration as a member leaves the team. A captain cannot cancel while anyone else is on the team. A solo captain cancel deletes the team.
- Team writes stop when the event is not published or has finished (`end_time`, or `start_time` when there is no end). Joining also stops at the registration deadline. The roster stays readable. Check-in is unchanged.

Submissions and a public team list are not part of this. The organizer announces the form by email or an announcement.

## Data

Migrations `packages/db/migrations/0010_hackathon_teams.sql`, `0011_slim_hackathon_members.sql`, `0012_hackathon_team_invites.sql`, `0013_team_invites_email_only.sql`, `0014_hackathon_team_size_guard.sql`, and `0015_hackathon_one_seat_rule.sql`.

- `events.is_hackathon`, `events.max_team_size`
- `event_teams` (name, description, unguessable `join_code`)
- `event_team_members` (registration and role only; one team per registration, one captain per team, cascade when the registration is deleted)
- `event_team_invites` (lowercase email per team; removed when that email joins, cascade with the team)

A trigger enforces the max team size on insert, locking the team row so concurrent joins or invites can't overfill it. One seat rule everywhere: a seat is a member or an open invite. Someone joining frees their own invite first, so it becomes their member seat.

Row level security is off and `anon` / `authenticated` are revoked, same as `ticket_orders`. The server uses the service role. `database.types.ts` does not have these tables yet, so `hackathon-teams-repo.server.ts` types them by hand.

## Code

- Rules: `import * as HackathonTeam from "~/modules/events/model/hackathon-team"`. Pure, no I/O. Every create, join, edit, remove, cancel, and team decision calls it before writing.
- Writes and reads: `modules/events/server/hackathon-team.server.ts`.
- API: `/api/events/hackathon`. `GET` returns settings, `view=dashboard` (organizer), `view=team`, or `view=captain`. `POST` takes `intent` = `invite`, `cancel-invite`, `leave`, `assign`, `remove`, or `decide`. Organizer actions are scoped to the event the caller manages.
- Join page: `routes/web/event-team-join.tsx`.

## Watching production

Hackathon server code writes one JSON line per action to stdout:
`{"source":"hackathon","level":…,"action":…,"eventId":…,"teamId":…,"userId":…}`.
The helper is `modules/events/server/hackathon-log.server.ts`. Lines carry ids
only, no emails or names; join codes are cut to four characters.

- `info`: a team API action or join succeeded.
- `warn`: refused with the message the person saw ("This team is full.").
- `error`: something threw, a database write failed, or an email didn't send.

The API (`/api/events/hackathon`), the join page action, and the hackathon
placement in registration log every outcome. Unexpected exceptions there return
"Something went wrong" instead of a raw 500.

The web container's output lands in Azure Log Analytics (`luhive-logs`, 30 days,
table `ContainerAppConsoleLogs_CL`) 1–3 minutes later. Read it with `az login` and:

```bash
pnpm --filter @luhive/web prod-logs --follow               # warnings and errors, live
pnpm --filter @luhive/web prod-logs --level info --since 6h
pnpm --filter @luhive/web prod-logs --event <event-id> --raw
pnpm --filter @luhive/web prod-logs --web-errors           # plus any other web error
```

**Alert:** the Azure log alert `hackathon-errors` (resource group `luhive-prod-ne`)
checks every 5 minutes. When any `error` line appeared in the last 5 minutes, it
emails team@luhive.com through the action group `luhive-team-email`. Expect the
email about 5–10 minutes after the error. Warnings don't alert. Turn it off with
`az monitor scheduled-query update -g luhive-prod-ne -n hackathon-errors --disabled true`.

To see the data behind an error, `pnpm --filter @luhive/web prod-db team <event-slug>`
or `prod-db person <email>` runs the same read-only checks as `test-db` on the
production database. Fixes are then made by hand.
