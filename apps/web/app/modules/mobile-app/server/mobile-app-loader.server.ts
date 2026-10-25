import type { LoaderFunctionArgs } from "react-router";
import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";
import {
  parseUTMFromSearchParams,
  type UTMAttribution,
} from "~/modules/events/utils/utm-source";
import { isOnMobileAppWaitlist } from "~/modules/mobile-app/data/mobile-app-waitlist-repo.server";

export type MobileAppLoaderData = {
  /** Null for logged-out visitors, who are asked for an email instead. */
  user: { email: string | null } | null;
  alreadyJoined: boolean;
  utm: UTMAttribution;
};

export async function loader({
  request,
  context,
}: LoaderFunctionArgs): Promise<MobileAppLoaderData> {
  const { findAuthUser } = context.get(requestSupabaseContext);
  const utm = parseUTMFromSearchParams(new URL(request.url).searchParams);

  // Free for anonymous visitors: with no session cookie, findAuthUser resolves without a call.
  const user = await findAuthUser();
  if (!user) {
    return { user: null, alreadyJoined: false, utm };
  }

  return {
    user: { email: user.email ?? null },
    alreadyJoined: await isOnMobileAppWaitlist(user.id, user.email),
    utm,
  };
}
