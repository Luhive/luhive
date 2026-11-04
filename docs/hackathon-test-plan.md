# Hackathon mode test plan (for an agent)

You are testing Luhive's hackathon team feature end to end in a browser, on
localhost, against the **test** database. You report what you find. You do not
fix code.

Background: [hackathon-mode.md](hackathon-mode.md). Inboxes:
[testing-emails.md](testing-emails.md).

## Rules

1. **Only localhost.** App at `http://localhost:5173`. Never open luhive.com.
2. **Never touch production.** Never use `PRODUCTION_DATABASE_URL` from
   `packages/db/.env`, never run `psql` yourself, and never run `pnpm prod-db` or
   `pnpm prod-logs`. Database checks go through `pnpm test-db` only (read-only, test DB).
3. **Don't change code, data, or config.** If something fails, write it down and
   go on to the next scenario. Don't retry more than once.
4. **Only test-mail addresses.** Every person you sign up is
   `pnpm test-mail address <tag>`. Never type a real person's email.
5. **No Google sign-in.** Always choose the email and code path. Google is tested by hand.
6. Run commands from `apps/web`. The dev server must be running there (`pnpm dev`);
   start it if `http://localhost:5173` doesn't load.

## Tools

```bash
pnpm test-mail address <tag>                 # email address to type in forms
pnpm test-mail otp <tag> --wait              # 6-digit code from the newest email
pnpm test-mail latest <tag> --wait           # newest email: subject, links, text
pnpm test-mail latest <tag> --subject "<text>" --wait
pnpm test-mail list <tag>                    # recent subjects for that inbox
pnpm test-db team <event-slug>               # teams, members, invites, people without a team
pnpm test-db person <email>                  # one person's registrations and teams
```

Emails take a few seconds; always use `--wait`. Only emails from the last 15
minutes count, so a code from an earlier step isn't picked up.

**Run tag:** pick one short suffix for this whole run, e.g. today's date `1104`.
People are `org-1104`, `cap-1104`, `m1-1104`, `m2-1104`, `m3-1104`, `cap2-1104`,
`solo-1104`, `x-1104`. Below they're written without the suffix (`cap`, `m1`…);
always add it.

**Switching people:** one browser holds one signed-in person. To switch, sign out
from the profile menu, or clear cookies for localhost. Signing in again is
`/login` with the person's address, then `pnpm test-mail otp <tag> --wait`.

## Setup

S1. Sign up the organizer at `/signup` with `org`'s address. Enter the code from
    `pnpm test-mail otp org --wait` (if the email has a link instead, open it).

S2. Create a community at `/create-community`.

S3. In the dashboard, create an event under Events → Create:
    - title `Hackathon run <suffix>`, start date at least 7 days ahead
    - **free**, native registration
    - **Hackathon on**, maximum team size **3**
    - publish it

    Note the event slug from its public URL: `/c/<community-slug>/<event-slug>`.

S4. `pnpm test-db team <event-slug>` shows `is_hackathon = t`,
    `max_team_size = 3`, `is_approve_required = t`, and no teams.

Sign out.

## Scenarios

For each one: do the steps, then check **Page**, **DB**, and **Email**. Write
down anything that differs from what's expected, word for word.

### 1. Captain registers with email

Open the event page signed out, press Register. You should see
"How are you joining?" with **Start a team** and **Join a team**. Choose Start a team.
Fill in `cap`'s address, name, team name `Team Alpha`, a plan, a LinkedIn URL.
Enter the code.

- Page: lands on the event page; the team sheet opens by itself; Team shows 1 of 3
  with `cap` as Captain.
- DB: Team Alpha with `cap` as captain, `pending`; no registrations without a team.
- Email: `cap` gets a registration pending email.

### 2. "Start a team" can be undone

Signed out, open Register again, choose Start a team, then "Joining a team instead?".
Close the register page and open it again.

- Page: back at "How are you joining?" both times.

### 3. Wrong join link

From "How are you joining?" choose Join a team, paste `http://localhost:5173/hub`,
press Open join link.

- Page: "That isn't a team join link…" error; "Start one" goes back to the captain form.

### 4. Captain invites teammates

Sign in as `cap`, open the event page, then "add your teammates". In the invite
field type `m1`'s and `m2`'s addresses separated by a comma, press Invite.

- Page: two Invited rows; Team shows 3 of 3; "Your team is full…" message.
- DB: two open invites for Team Alpha.
- Email: `m1` and `m2` each get an invite email with a link containing `?invite=`.

Also press **Copy link** and write down the join link (`/join/<code>`) for later.

### 5. Invitee joins from the email, newcomer

Sign out. Open the link from `pnpm test-mail latest m1 --wait`.

- Page: email field already filled with `m1`'s address; no team name or plan questions.

Fill the rest, enter `m1`'s code.

- Page: during code check the button stays busy; no LinkedIn form flashes; lands on
  the event page as a team member.
- DB: `m1` member of Team Alpha, `pending`; `m1`'s invite is gone; `m2`'s invite remains.
- Email: `cap` gets "<m1 name> joined" (`--subject joined`), team count 3 of 3.

### 6. Invitee uses a different email

Sign out. Open `m2`'s invite link, but replace the email with `x`'s address. Finish
with `x`'s code.

- Page: lands as a member of Team Alpha.
- DB: `x` is a member; `m2`'s invite is gone; Team Alpha has 3 members, 0 invites.

### 7. Full team

Sign out. Open the join link from step 4 and register as `m3`.

- Page: "This team is full." No way to continue into the team.
- DB: `pnpm test-db person <m3 address>` shows no registration for this event.

Write down at which point the "full" message appears (before or after the code).

### 8. Second captain, and someone already on a team

Sign out. Register as a captain with `cap2`, team `Team Beta`.
Copy Team Beta's join link. Sign out, sign in as `m1`, open Team Beta's link.

- Page: refused, already on a team.
- DB: `m1` still only on Team Alpha.

### 9. Signed-in person joins by link

`m3` has an account from step 7 but no registration. Sign out `m1`, sign in as `m3`
at `/login`, then open Team Beta's join link.

- Page: the short signed-in form (no email or code step, no team name or plan);
  Join team works.
- DB: `m3` member of Team Beta; exactly one registration for this event.
- Email: `cap2` gets the joined email.

### 10. Captain removes a member

Sign in as `cap2`. In the team sheet, ⋯ next to `m3` → Remove, confirm.

- Page: confirm text says the registration is cancelled; `m3` disappears.
- DB: `m3` has no registration for this event; no registrations without a team.
- Email: `m3` gets "You're no longer on Team Beta" with a Register again link.

### 11. Member leaves

Sign in as `x`. In the team sheet, Leave team, confirm.

- Page: event page shows Register again.
- DB: `x` has no registration; Team Alpha has `cap` and `m1`.

### 12. Captain with teammates leaves

Sign in as `cap`. Leave team; pick `m1` as the next captain; confirm.

- DB: `m1` is captain of Team Alpha; `cap` has no registration.

### 13. Solo captain leaves

Sign in as `cap2` (Team Beta has only `cap2` now). Leave team, confirm.

- DB: Team Beta is gone; `cap2` has no registration.

### 14. Organizer reviews

Register a fresh captain `solo` with team `Team Gamma` so there are at least two
teams (Alpha with `m1`, Gamma). Sign in as `org`, open the dashboard attenders page,
Teams tab.

- Page: each team with its members; per-person approve and Invite are hidden.

Approve Team Alpha. Reject Team Gamma.

- DB: Alpha members `approved` with check-in codes; Gamma members `rejected`.
- Email: `m1` gets an approval email; `solo` gets a rejection email.
- Page: as `org`, the Email column on the People tab only lists this event's people.

Then open Team Alpha's join link signed out: it should say the team is closed.

## Report

Write `docs/logs/hackathon-test-run-<suffix>.md`:

```markdown
# Hackathon test run <suffix>

Event: <slug>   Date: <date>

| # | Scenario | Result | Notes |
|---|---|---|---|
| 1 | Captain registers with email | pass / fail / blocked | exact difference, screenshot name |

## Failures in detail

### <number>. <scenario>
- Steps taken:
- Expected:
- Actual (exact text, URL, DB rows, email subject):
```

Put `blocked` when a scenario couldn't run because an earlier one failed. Add
anything odd you saw on the way, even if no scenario covers it.
