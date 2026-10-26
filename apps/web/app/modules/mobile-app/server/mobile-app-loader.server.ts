import type { LoaderFunctionArgs } from "react-router";
import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";
import {
  parseUTMFromSearchParams,
  type UTMAttribution,
} from "~/modules/events/utils/utm-source";
import * as Waitlist from "~/modules/mobile-app/data/mobile-app-waitlist-repo.server";

export type MobileAppLoaderData = {
  /** Null for logged-out visitors, who are asked for an email instead. */
  user: { email: string | null } | null;
  /** Set when a signed-in user is already on the list. */
  joined: { signupId: string; answered: boolean } | null;
  subscribedCount: number;
  utm: UTMAttribution;
};

export async function loader({
  request,
  context,
}: LoaderFunctionArgs): Promise<MobileAppLoaderData> {
  const { findAuthUser } = context.get(requestSupabaseContext);
  const utm = parseUTMFromSearchParams(new URL(request.url).searchParams);

  // Free for anonymous visitors: with no session cookie, findAuthUser resolves without a call.
  const [user, subscribedCount] = await Promise.all([findAuthUser(), Waitlist.countSubscribed()]);
  if (!user) {
    return { user: null, joined: null, subscribedCount, utm };
  }

  const row = await Waitlist.findForUser(user.id, user.email);
  return {
    user: { email: user.email ?? null },
    joined: row && !row.unsubscribed_at
      ? { signupId: row.id, answered: Boolean(row.first_feature) }
      : null,
    subscribedCount,
    utm,
  };
}
