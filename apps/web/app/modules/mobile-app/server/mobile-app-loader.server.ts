import type { LoaderFunctionArgs } from "react-router";
import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";
import {
  parseUTMFromSearchParams,
  type UTMAttribution,
} from "~/modules/events/utils/utm-source";
import * as Waitlist from "~/modules/mobile-app/data/mobile-app-waitlist-repo.server";
import {
  loadWhileWaiting,
  type WhileWaiting,
} from "~/modules/mobile-app/server/mobile-app-waiting.server";

export type MobileAppLoaderData = {
  /** Null for logged-out visitors, who are asked for an email instead. */
  user: { email: string | null } | null;
  /** Set when a signed-in user is already on the list. */
  joined: { signupId: string; answered: boolean } | null;
  subscribedCount: number;
  utm: UTMAttribution;
  /** The "While you are waiting" section: upcoming events, or active communities. */
  waiting: WhileWaiting;
};

export async function loader({
  request,
  context,
}: LoaderFunctionArgs): Promise<MobileAppLoaderData> {
  const { supabase, findAuthUser } = context.get(requestSupabaseContext);
  const utm = parseUTMFromSearchParams(new URL(request.url).searchParams);

  // Free for anonymous visitors: with no session cookie, findAuthUser resolves without a call.
  const [user, subscribedCount, waiting] = await Promise.all([
    findAuthUser(),
    Waitlist.countSubscribed(),
    loadWhileWaiting(supabase),
  ]);
  if (!user) {
    return { user: null, joined: null, subscribedCount, utm, waiting };
  }

  const row = await Waitlist.findForUser(user.id, user.email);
  return {
    user: { email: user.email ?? null },
    joined: row && !row.unsubscribed_at
      ? { signupId: row.id, answered: Boolean(row.first_feature) }
      : null,
    subscribedCount,
    utm,
    waiting,
  };
}
