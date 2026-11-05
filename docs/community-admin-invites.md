# Community admin invites

The owner invites someone by email to be an admin of the community. The first use is hackathon partners who need to follow the statistics live.

Admin is the only role an invite can grant for now. Ownership stays `communities.created_by` and is not transferable. A wider role model for communities is future work; the `role` column below leaves room for it.

## Why it lives in the web app

Member roles are still managed in `apps/web` (`update-member-role.server.ts`) and there is no community slice in `apps/core-api` yet (stage 1 #9). Like hackathon mode, this is a small web-side feature with an urgent user. When the community slice moves to core, invites move with it.

## Flow

1. **Invite.** On the dashboard overview, the owner sees **Invite admin** next to the members search. It opens a sheet with one email field. Below it, the sheet lists pending invites with **Resend** and **Revoke**.
2. **Email.** The invitee gets an email: "{Owner} invited you to be an admin of {Community}" with an **Accept invite** button linking to `/c/:slug/admin-invite/:inviteId`.
3. **Accept.** The page shows the community and who invited them.
   - Signed in with the invited email: **Accept invite**.
   - Signed out, or signed in as someone else: **Accept as partner@company.com** sends a 6-digit code to that email, creating the account if there is none. Entering the code signs them in as the invitee and accepts in the same step. No login page, no logging out.
4. Accepting makes them an admin, deletes the invite, and opens `/dashboard/:slug`.

### Rules

- Only the owner (`communities.created_by`) can list, send, resend, or revoke invites. Admins can't invite admins.
- Only the invited email can accept. The code goes to that inbox, so a forwarded link is useless. The link alone never signs anyone in.
- A new account gets a profile named after the email's local part, the same fallback sign-in uses. They can rename it on their profile.
- Inviting the same email again resends the email and keeps one row.
- Accepting as an existing member promotes them. Accepting as an existing admin or owner changes nothing and still deletes the invite.
- An invite has no expiry. The owner revokes it, or it disappears on accept. Removing an admin afterwards is the existing **Demote** action in the members table.

## Data

Migration `packages/db/migrations/0016_community_invites.sql`.

`community_invites`

| column | |
|---|---|
| `id` | uuid, the unguessable link token |
| `community_id` | cascade with the community |
| `email` | lowercase, unique per community |
| `role` | `'admin'` only (check constraint) |
| `invited_by` | profile of the owner who sent it |
| `created_at`, `updated_at` | `updated_at` moves on resend |

Row level security is off and `anon` / `authenticated` are revoked, same as `event_team_invites`. The server uses the service role.

## Code

All in `apps/web/app`.

| Layer | File | Does |
|---|---|---|
| model | `modules/dashboard/model/community-invite.ts` | `CommunityInvite` type, email schema, response types |
| data | `modules/dashboard/data/community-invites-repo.server.ts` | list, find, save (insert or touch), delete invites |
| data | `modules/dashboard/data/members-repo.server.ts` | adds `grantAdminRole` |
| server | `modules/dashboard/server/community-owner.server.ts` | signed-in user + community they own, or null |
| server | `modules/dashboard/server/community-invites-loader.server.ts` | `GET` pending invites |
| server | `modules/dashboard/server/community-invites-action.server.ts` | `POST intent=invite\|revoke` |
| data | `modules/profile/data/profiles-repo.server.ts` | `createProfileIfMissing` |
| server | `modules/dashboard/server/admin-invite.server.ts` | resolves the invite, its community, and whether the signed-in user is the invitee |
| server | `modules/dashboard/server/admin-invite-loader.server.ts` | accept page data |
| server | `modules/dashboard/server/admin-invite-action.server.ts` | `intent=send-code\|accept` |
| hook | `modules/dashboard/hooks/use-community-invites.ts` | fetchers, toasts |
| components | `community-invite-sheet.tsx`, `community-invite-list.tsx`, `admin-invite-card.tsx`, `admin-invite-invalid.tsx` | UI |
| email | `templates/community-admin-invite-email.tsx`, `sendCommunityAdminInviteEmail` | |
| routes | `routes/api/community/invites.tsx`, `routes/web/admin-invite.tsx` | the page picks the step |

The code step reuses `OtpInputInline` and the existing `/auth/verify-otp` endpoint unchanged. Once it reports success, the page posts `intent=accept`. Accepting is a separate request so the shared sign-in action doesn't gain another flow.

The UI reuses the profile page's look: the sheet follows `ProfileEditSheet`, and buttons, fields, and cards use `modules/profile/components/profile-tokens.ts`. The field and label classes move from `profile-edit-sheet.tsx` into those tokens so both sheets share them.

## Not included

- Roles other than admin, a read-only viewer role, ownership transfer.
- Invite expiry.
- Admins inviting admins.
- An in-app notification; the email is the only channel.

## Rollout

1. Apply `0016` on validation (`pnpm --filter @luhive/db migrate:validation`), then on production by the manual steps in `packages/db/README.md`.
2. Run `pnpm --filter @luhive/db codegen` and drop the hand-written table type in the repo.
3. Deploy web. Invite the partner from the dashboard overview.

## Test plan

- Owner invites an email: row appears in the sheet, email arrives (use a test inbox from `docs/testing-emails.md`).
- Invite the same email again: still one row, a second email.
- Revoke: row gone, the link shows "no longer valid".
- Open the link signed out with a brand-new email: code arrives, entering it lands on the dashboard as admin, with a profile.
- Open it signed out with an existing account, and signed in as another account: same code step, ends signed in as the invitee.
- Open it signed in as the invitee: one click on Accept.
- Accept as an existing member, as an existing admin: both end as admin, invite deleted.
- As an admin, the sheet trigger is hidden and `POST /api/community/invites` returns an error.
