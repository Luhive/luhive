import { lazy, Suspense, useMemo, useRef } from "react";
import { Link, useLoaderData, useParams } from "react-router";
import { AttendersTableSkeleton } from "~/modules/events/components/attenders/attenders-table-skeleton";
import type { AttendersTableHandle } from "~/modules/events/components/attenders/attenders-table";
import { getCommunityBySlugClient } from "~/modules/dashboard/data/dashboard-repo.client";
import { getEventByIdClient } from "~/modules/events/data/events-repo.client";
import { createClient } from "~/shared/lib/supabase/client";
import type { Database } from "~/shared/models/database.types";
import { ScanQrCode, UserRound, UsersRound } from "lucide-react";
import { InviteSomeoneButton } from "~/modules/events/components/registration/invite-modal";
import {
  HackathonTeamsSection,
  useHackathonDashboard,
} from "~/modules/events/components/attenders/hackathon-teams-section";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/shared/components/ui/tabs";

type Event = Database["public"]["Tables"]["events"]["Row"];

type AttendersLoaderData = {
  event: Event | null;
  eventId: string | null;
  error: string | null;
  isHackathon: boolean;
};

const AttendersTable = lazy(() =>
  import("~/modules/events/components/attenders/attenders-table").then((m) => ({
    default: m.AttendersTable,
  })),
);

async function clientLoader({
  params,
  request,
}: {
  params: { slug?: string };
  request: Request;
}): Promise<AttendersLoaderData> {
  const slug = params.slug;
  const url = new URL(request.url);
  const eventId = url.searchParams.get("eventId");

  if (!slug) {
    return { event: null, eventId: null, error: null, isHackathon: false };
  }

  const { community, error: communityError } =
    await getCommunityBySlugClient(slug);

  if (communityError || !community) {
    return { event: null, eventId: null, error: "Community not found", isHackathon: false };
  }

  if (!eventId) {
    return { event: null, eventId: null, error: null, isHackathon: false };
  }

  // First, try to get the event as host (community owns the event)
  const { event, error: eventError } = await getEventByIdClient(
    eventId,
    community.id,
  );

  if (event) {
    return { event, eventId, error: null, isHackathon: await readHackathon(eventId) };
  }

  // If not found as host, check if community is a co-host
  try {
    const supabase = createClient();
    const { data: coHostEvent, error: coHostError } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (!coHostError && coHostEvent) {
      // Verify the community is a co-host of this event
      const { data: collaboration } = await supabase
        .from("event_collaborations")
        .select("role, status")
        .eq("event_id", eventId)
        .eq("community_id", community.id)
        .eq("role", "co-host")
        .eq("status", "accepted")
        .single();

      if (collaboration) {
        return {
          event: coHostEvent as Event,
          eventId,
          error: null,
          isHackathon: await readHackathon(eventId),
        };
      }
    }
  } catch (err) {
    // Silently fail and return error below
  }

  // If we reach here, the community is neither host nor accepted co-host
  if (eventError) {
    return {
      event: null,
      eventId,
      error: eventError.message || "Event not found",
      isHackathon: false,
    };
  }

  return {
    event: null,
    eventId,
    error: "You do not have permission to view this event's attenders",
    isHackathon: false,
  };
}

export { clientLoader };

async function readHackathon(eventId: string) {
  try {
    const response = await fetch(
      `/api/events/hackathon?eventId=${encodeURIComponent(eventId)}`,
    );
    if (!response.ok) return false;
    const body = (await response.json()) as { isHackathon?: boolean };
    return Boolean(body.isHackathon);
  } catch {
    return false;
  }
}

export function meta() {
  return [
    { title: "Event Attenders - Dashboard" },
    { name: "description", content: "View and manage event attenders" },
  ];
}

export default function AttendersPage() {
  const { event, eventId, error, isHackathon } = useLoaderData<AttendersLoaderData>();
  const { slug } = useParams();
  const attendersTableRef = useRef<AttendersTableHandle>(null);
  const hackathon = useHackathonDashboard(eventId, isHackathon);
  const teamByRegistration = useMemo(() => {
    const teams = new Map<string, { name: string; isCaptain: boolean }>();
    for (const team of hackathon.dashboard?.teams ?? []) {
      for (const member of team.members) {
        teams.set(member.registrationId, { name: team.name, isCaptain: member.role === "captain" });
      }
    }
    return teams;
  }, [hackathon.dashboard]);

  if (!eventId || !event) {
    return (
      <div className="py-4 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">Event Not Found</h2>
              <p className="text-muted-foreground">
                {error || "Please select an event to view attenders."}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (event.registration_type === "external") {
    return (
      <div className="py-4 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4 max-w-md">
              <h2 className="text-lg font-semibold">
                Link events don&apos;t track attendees
              </h2>
              <p className="text-muted-foreground text-sm">
                Attendee management is only available for events with Luhive
                registration. Visitors on link events are redirected to the
                external event page.
              </p>
              {slug ? (
                <Link
                  to={`/dashboard/${slug}/events`}
                  className="inline-flex text-sm font-medium text-primary hover:underline"
                >
                  Back to events
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-4 px-4 md:px-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Event Attenders</h1>
          <div className="space-y-1">
            <h2 className="text-lg font-medium">{event.title}</h2>
            <p className="text-sm text-muted-foreground">
              Manage and view all registered attenders for this event
            </p>
          </div>
        </div>
        {slug ? (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/dashboard/${slug}/events/${eventId}/scanner`}
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
            >
              <ScanQrCode className="h-4 w-4" />
              Open QR Scanner
            </Link>
            {isHackathon ? null : (
              <InviteSomeoneButton
                eventId={eventId}
                size="default"
                className="inline-flex w-auto"
                onInviteSuccess={(invite) => {
                  attendersTableRef.current?.applyInviteResult(invite);
                }}
              />
            )}
          </div>
        ) : null}

        {isHackathon ? (
          <Tabs defaultValue="teams" className="gap-4">
            <TabsList>
              <TabsTrigger value="teams" className="px-3">
                <UsersRound aria-hidden />
                Teams
                <span className="text-muted-foreground">
                  {hackathon.dashboard?.teams.length ?? ""}
                </span>
              </TabsTrigger>
              <TabsTrigger value="people" className="px-3">
                <UserRound aria-hidden />
                People
                <span className="text-muted-foreground">
                  {hackathon.dashboard
                    ? teamByRegistration.size + hackathon.dashboard.unteamed.length
                    : ""}
                </span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="teams">
              <HackathonTeamsSection
                eventId={eventId}
                dashboard={hackathon.dashboard}
                loading={hackathon.loading}
                onChanged={() => void hackathon.reload()}
              />
            </TabsContent>
            <TabsContent value="people">
              <Suspense fallback={<AttendersTableSkeleton />}>
                <AttendersTable
                  ref={attendersTableRef}
                  eventId={eventId}
                  hidePersonApproval
                  teamByRegistration={teamByRegistration}
                />
              </Suspense>
            </TabsContent>
          </Tabs>
        ) : (
          <Suspense fallback={<AttendersTableSkeleton />}>
            <AttendersTable ref={attendersTableRef} eventId={eventId} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
