import type { LoaderFunctionArgs } from "react-router";
import { getProfileActivity } from "~/modules/profile/data/profile-activity-repo.server";
import { listProfileCommunities } from "~/modules/profile/data/profile-communities-repo.server";
import { listProfileEvents } from "~/modules/profile/data/profile-events-repo.server";
import * as HackathonTeams from "~/modules/events/server/hackathon-team.server";
import * as Certificates from "~/modules/certificates/data/certificates-repo.server";
import { getProfileStats } from "~/modules/profile/data/profile-stats-repo.server";
import { activityWindow } from "~/modules/profile/model/profile-activity";
import type { ProfileLoaderData } from "~/modules/profile/model/profile-loader";
import { withTimeout } from "~/modules/profile/utils/with-timeout";
import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";
import { readTimezone } from "~/shared/lib/timezone.server";

const ACTIVITY_TIMEOUT_MS = 4000;

export async function loader({ request, context }: LoaderFunctionArgs): Promise<ProfileLoaderData> {
  const { supabase, findAuthUser } = context.get(requestSupabaseContext);
  const timezone = readTimezone(request);
  // Eager, so the skeleton can draw the real month labels and grid during SSR.
  const activityRange = activityWindow(timezone, new Date());
  const authUser = await findAuthUser();

  if (!authUser) {
    return {
      user: null,
      email: null,
      communities: Promise.resolve([]),
      stats: Promise.resolve({
        kind: "member",
        eventsRegistered: 0,
        upcomingEventsRegistered: 0,
        communitiesJoined: 0,
        membersByCommunity: [],
      }),
      events: Promise.resolve([]),
      activityWindow: activityRange,
      activity: Promise.resolve({ timezone, days: [] }),
      achievements: Promise.resolve([]),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (!profile) {
    return {
      user: null,
      email: authUser.email ?? null,
      communities: Promise.resolve([]),
      stats: Promise.resolve({
        kind: "member",
        eventsRegistered: 0,
        upcomingEventsRegistered: 0,
        communitiesJoined: 0,
        membersByCommunity: [],
      }),
      events: Promise.resolve([]),
      activityWindow: activityRange,
      activity: Promise.resolve({ timezone, days: [] }),
      achievements: Promise.resolve([]),
    };
  }

  const communities = listProfileCommunities(supabase, authUser.id);
  const stats = communities.then((list) => getProfileStats(supabase, authUser.id, list));
  const events = listProfileEvents(supabase, authUser.id).then(async (listed) => {
    try {
      const captainIds = new Set(
        await HackathonTeams.listCaptainEventIds(authUser.id),
      );
      return listed.map((event) => ({ ...event, isCaptain: captainIds.has(event.id) }));
    } catch (error) {
      console.error("Failed to load hackathon teams for profile:", error);
      return listed;
    }
  });
  // Deferred, and never fails the page: linking first picks up certificates issued
  // to this email before the account existed.
  const achievements = (async () => {
    try {
      if (authUser.email) await Certificates.linkByEmail(authUser.id, authUser.email);
      return await Certificates.listBadgesForUser(authUser.id);
    } catch (error) {
      console.error("Failed to load certificates for profile:", error);
      return [];
    }
  })();
  // Deferred and bounded: never awaited here, so it can't hold back the page shell.
  const activity = withTimeout(
    getProfileActivity(supabase, timezone),
    ACTIVITY_TIMEOUT_MS,
    { timezone, days: [] },
    "Profile activity",
  );

  return {
    user: profile,
    email: authUser.email ?? null,
    communities,
    stats,
    events,
    activityWindow: activityRange,
    activity,
    achievements,
  };
}
