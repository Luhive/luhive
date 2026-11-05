import { z } from "zod";

/** A pending invite to be an admin of a community. Its id is the link token. */
export type CommunityInvite = {
  id: string;
  email: string;
  updated_at: string;
};

export const communityInviteEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address"));

export type CommunityInvitesResponse = {
  invites: CommunityInvite[];
};

export type CommunityInviteActionResponse = {
  success: boolean;
  message?: string;
  error?: string;
};

export type AdminInviteLoaderData =
  | { state: "invalid" }
  | {
      state: "ready";
      communityName: string;
      communityLogoUrl: string | null;
      inviterName: string;
      invitedEmail: string;
      /** False when signed out or signed in as someone else: they verify the invited email with a code first. */
      isSignedInAsInvitee: boolean;
    };

export type AdminInviteActionData = { codeSent?: boolean; error?: string };
