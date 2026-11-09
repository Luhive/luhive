# Hackathon test run 1104

Event: hackathon-run-1104   Date: 2026-11-04

Public URL: `http://localhost:5173/c/hackathon-1104/hackathon-run-1104`

Scenarios 7 and 8 were run again. Scenarios 11–14 were run after that. Scenarios 1–6, 9, and 10 are the first pass.

| # | Scenario | Result | Notes |
|---|---|---|---|
| 1 | Captain registers with email | pass | Event page, Team 1 of 3, Cap Eleven, Captain. DB: Team Alpha, captain, pending, no teamless registrations. Email: `You're pending approval: Hackathon run 1104`. |
| 2 | "Start a team" can be undone | pass | "Joining a team instead?" and reopening Register both return to "How are you joining?" |
| 3 | Wrong join link | pass | "That isn't a team join link. Ask your captain to send it again." "Start one" returns to the captain form. |
| 4 | Captain invites teammates | pass | Two Invited rows, "Team 3 of 3", "Your team is full. Cancel an invite to add someone else." Two open invites. Both emails contain `?invite=`. Copy link was gone once the team showed full. |
| 5 | Invitee joins from the email, newcomer | pass | m1 email prefilled. No team name or plan. During the code the verify control is disabled and the LinkedIn form is not shown. Lands as M1 Eleven, Joined, Team Alpha. m1 invite gone, m2 invite remains. Captain email: `M1 Eleven joined Team Alpha`, "Your team is now 3 of 3." |
| 6 | Invitee uses a different email | pass | x replaces m2's address and lands as X Eleven on Team Alpha. DB: cap, m1, x; 0 invites. |
| 7 | Full team | fail | Retested. "This team is full." is not shown, before or after the code. |
| 8 | Second captain, and someone already on a team | fail | Retested. Opening the link shows a join form. "You are already on a team." appears after Join team. DB: m1 still only on Team Alpha. |
| 9 | Signed-in person joins by link | pass | Short form has no email, code, team name, or plan. LinkedIn is required. Join team works. One registration, Team Beta member, pending. Email: `M3 Eleven joined Team Beta`, "Your team is now 2 of 3." |
| 10 | Captain removes a member | pass | Confirm: "Their registration for this event is cancelled. They can register again to join or start a team." m3 disappears. No registration and no teamless rows. Email: `You're no longer on Team Beta`, with a Register again link. |
| 11 | Member leaves | pass | Confirm: "Your registration for this event is cancelled. You can register again to join or start a team." Signed-in page then shows a Register link. x has no registration. Team Alpha is cap and m1. |
| 12 | Captain with teammates leaves | pass | Confirm: "Choose who becomes captain. Your registration for this event is cancelled; you can register again any time." M1 Eleven selected. DB: m1 is captain of Team Alpha; cap has no registration. |
| 13 | Solo captain leaves | pass | Confirm: "The team is removed and your registration for this event is cancelled. You can register again any time." Team Beta is gone. cap2 has no registration. |
| 14 | Organizer reviews | pass | Teams tab lists Alpha and Gamma with members. No per-person approve and no Invite. Approve Alpha, reject Gamma. Alpha approved with a check-in code; Gamma rejected. m1: `You're accepted: Hackathon run 1104`. solo: `You weren't accepted: Hackathon run 1104`. People tab lists only those two. Signed-out join link: "This team is no longer accepting people." |

## Failures in detail

### 7. Full team

- Steps taken: Signed out. Opened `http://localhost:5173/c/hackathon-1104/hackathon-run-1104/join/ms2RucXTaJnOvO6EALxagw`. The page was the normal "Join Team Alpha" form. Submitted `xyzeb.m3-1104@inbox.testmail.app`, name M3 Eleven, LinkedIn `m3-1104`. A code was sent. Entered `577410`.
- Expected: "This team is full." No way to continue. `pnpm test-db person` shows no registration. Note whether the message is before or after the code.
- Actual: No full-team text before the code. After the code the page stays on the join URL with "We sent a 6-digit code to xyzeb.m3-1104@inbox.testmail.app." and the digits still filled. The page text never includes "This team is full." The server log at 12:48:00 records `register:join-team` with message `This team is full.` Final person check: account exists, no event row. Team Alpha stayed full.

### 8. Second captain, and someone already on a team

- Steps taken: Team Beta and cap2 already existed from the first pass, so the captain registration was not repeated. Signed in as m1 and opened `http://localhost:5173/c/hackathon-1104/hackathon-run-1104/join/lpMEgbxM_HalmXJO_DsUdg`. The page offered LinkedIn and Join team. Pressed Join team.
- Expected: Opening the link refuses, already on a team. DB: m1 still only on Team Alpha.
- Actual: Opening the link does not refuse. After Join team the page says "You are already on a team." DB: one row, pending, Team Alpha, member.

## Oddities

- The signed-out event control is "Register for Event". After a member leaves, the signed-in control is "Register".
- After Start a team, Register ignores clicks until the "email" control is pressed.
- `/login` asks for a password. Sign-ins after the first registration used an email code.
- Dashboard sidebar "Log out" does not sign out. The public account menu "Sign Out" does.
- Joined, removal, and decision emails link to `https://luhive.com/c/hackathon-1104/hackathon-run-1104`.
- On the People tab the address column is labeled Contact. It lists `xyzeb.m1-1104@inbox.testmail.app` and `xyzeb.solo-1104@inbox.testmail.app`.
