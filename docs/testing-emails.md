# Testing emails

How people and agents test flows that need an inbox (OTP codes, invite links,
notification emails) against the **test** Supabase project.

## Test inboxes: testmail.app

Every address `<namespace>.<tag>@inbox.testmail.app` receives mail with no setup,
and an API returns it as JSON. Use one tag per person in a scenario: `captain`,
`m1`, `m2`, `organizer`.

They never bounce, so testing doesn't hurt the luhive.com sender reputation.
Made-up addresses would.

**Setup, once:** copy `apps/web/.env.test.example` to `apps/web/.env.test.local`
(git-ignored) and fill in the namespace and API key from the testmail.app console.

```bash
pnpm --filter @luhive/web test-mail address captain        # the address to type in a form
pnpm --filter @luhive/web test-mail otp captain --wait     # the 6-digit code, waits up to 60s
pnpm --filter @luhive/web test-mail latest m1 --wait       # subject, links, text of the newest email
pnpm --filter @luhive/web test-mail latest m1 --subject "joined"
pnpm --filter @luhive/web test-mail list captain --since 3600
```

By default only emails from the last 15 minutes count, so an old code from an
earlier run isn't picked up. `--since` takes seconds ago or an ISO time.

## Google sign-in

Tested by hand, not scripted: agents may not enter passwords on Google's sign-in
page, and Google blocks automated browsers. Before a release, use two real Google
accounts (plus addresses don't count as different Google accounts): one as
captain, one joining from an invite sent to a different address. Check once more
on production after deploy, since redirect URLs are set per Supabase project.

## Hackathon walk-through for an agent

1. `test-mail address captain` → register for the hackathon with that address,
   choose Start a team, `test-mail otp captain --wait` for the code.
2. In the team sheet, invite `test-mail address m1`.
3. Sign out (or use a second browser profile). `test-mail latest m1 --wait`
   gives the invite link with `?invite=`. Open it, register, enter the OTP.
4. `test-mail latest captain --subject joined --wait` confirms the captain email.
5. Remove m1 as the captain, then check
   `test-mail latest m1 --subject "no longer" --wait`.

## Database checks: test-db

`pnpm --filter @luhive/web test-db team <event-slug>` lists teams, members, open
invites and anyone registered without a team. `test-db person <email>` shows one
person's registrations and teams. `test-db sql "select …"` runs one SELECT.
Everything runs on `VALIDATION_DATABASE_URL` inside a read-only transaction that
is rolled back, so it can't change data or reach production.

The full agent test plan for hackathon mode is
[hackathon-test-plan.md](hackathon-test-plan.md).
