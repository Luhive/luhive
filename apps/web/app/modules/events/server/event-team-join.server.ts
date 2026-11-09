import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import * as HackathonTeam from "~/modules/events/model/hackathon-team";
import * as HackathonTeams from "~/modules/events/server/hackathon-team.server";
import * as Teams from "~/modules/events/data/hackathon-teams-repo.server";
import { resolvePublicEvent } from "~/modules/events/server/resolve-public-event.server";
import { completeEventRegistration } from "~/modules/events/server/complete-event-registration.server";
import { isUuid } from "~/modules/events/utils/event-slug";
import { logHackathon, logHackathonResponse } from "~/modules/events/server/hackathon-log.server";
import { createClient } from "~/shared/lib/supabase/server";
import type { CustomQuestionJson } from "~/modules/events/model/event.types";
import { updateOwnProfileName } from "~/modules/profile/server/update-profile-name.server";
import type { Json } from "~/shared/models/database.types";

export type TeamJoinLoaderData = {
  teamName: string;
  eventTitle: string;
  eventCoverUrl: string | null;
  captainName: string | null;
  closedMessage: string | null;
  eventId: string;
  eventSlug: string;
  communityId: string;
  communitySlug: string;
  communityName: string;
  questions: CustomQuestionJson | null;
  alreadyRegistered: boolean;
  /** Signed in, registered or not: they join with the questions form, no email step. */
  signedIn: boolean;
  teamCode: string;
  /** Set when the link came from an invite email and the invite is still open. */
  inviteId: string | null;
  invitedEmail: string | null;
  /** Phone saved on the signed-in user's profile, to prefill the phone question. */
  userPhone: string | null;
  /** Signed-in user's identity, shown above the form with an editable name. */
  viewer: { fullName: string | null; email: string | null; avatarUrl: string | null } | null;
};

export async function loader({ request, params }: LoaderFunctionArgs): Promise<TeamJoinLoaderData> {
  const communitySlug = params.slug || "";
  const eventSlug = params.eventSlug || "";
  const code = params.code || "";
  const { supabase } = createClient(request);
  const resolved = await resolvePublicEvent(supabase, communitySlug, eventSlug, {
    publishedOnly: false,
  });
  if (!resolved) throw new Response("Event not found", { status: 404 });

  const team = await Teams.findTeamByCode(code);
  if (!team || team.event_id !== resolved.event.id) {
    throw new Response("Join link not found", { status: 404 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const registrationId = user
    ? await HackathonTeams.findRegistrationIdForUser(resolved.event.id, user.id)
    : null;

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("full_name, avatar_url, metadata")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };
  const profileMetadata =
    profile?.metadata && typeof profile.metadata === "object" && !Array.isArray(profile.metadata)
      ? (profile.metadata as { phone?: unknown })
      : null;
  const userPhone = typeof profileMetadata?.phone === "string" ? profileMetadata.phone : null;

  const inviteParam = new URL(request.url).searchParams.get("invite");
  const found = inviteParam && isUuid(inviteParam) ? await Teams.findTeamInvite(inviteParam) : null;
  const invite = found?.team_id === team.id ? found : null;

  return {
    teamName: team.name,
    eventTitle: resolved.event.title,
    eventCoverUrl: resolved.event.cover_url,
    captainName: await HackathonTeams.findTeamCaptainName(team.id),
    closedMessage: await HackathonTeams.joinClosedMessage(resolved.event.id, team.id),
    eventId: resolved.event.id,
    eventSlug: resolved.event.slug,
    communityId: resolved.community.id,
    communitySlug: resolved.community.slug,
    communityName: resolved.community.name,
    questions: HackathonTeam.teammateQuestions(
      resolved.event.custom_questions as CustomQuestionJson | null,
    ),
    alreadyRegistered: Boolean(registrationId),
    signedIn: Boolean(user),
    teamCode: code,
    inviteId: invite?.id ?? null,
    invitedEmail: invite?.email ?? null,
    userPhone,
    viewer: user
      ? {
          fullName: profile?.full_name ?? null,
          email: user.email ?? null,
          avatarUrl: profile?.avatar_url ?? null,
        }
      : null,
  };
}

export async function action(args: ActionFunctionArgs) {
  // The join code is a secret; log only its first characters.
  const fields = { joinCode: (args.params.code || "").slice(0, 4) };
  try {
    const response = await joinTeam(args);
    await logHackathonResponse("join", fields, response);
    return response;
  } catch (error) {
    logHackathon("error", "join", fields, error);
    return Response.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

async function joinTeam({ request, params }: ActionFunctionArgs) {
  const code = params.code || "";
  const { supabase, headers } = createClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ success: false, error: "Please log in to join this team." }, { status: 401, headers });
  }

  const formData = await request.formData();
  let answers: Record<string, unknown> = {};
  try {
    answers = JSON.parse(String(formData.get("customAnswers") || "{}")) as Record<string, unknown>;
  } catch {
    answers = {};
  }

  const team = await Teams.findTeamByCode(code);
  if (!team) {
    return Response.json({ success: false, error: "This join link is not valid." }, { status: 404, headers });
  }

  // Teammates can correct their name (often taken from Google) on the join form.
  const submittedName = formData.get("fullName");
  if (typeof submittedName === "string") {
    const nameResult = await updateOwnProfileName(supabase, user.id, submittedName);
    if (!nameResult.success) {
      return Response.json({ success: false, error: nameResult.error }, { status: 400, headers });
    }
  }

  const inviteId = String(formData.get("teamInviteId") || "") || null;
  const registrationId = await HackathonTeams.findRegistrationIdForUser(team.event_id, user.id);
  if (!registrationId) {
    // Signed in but not registered yet (e.g. back from Google): register straight onto this team.
    const resolved = await resolvePublicEvent(supabase, params.slug || "", params.eventSlug || "", {
      publishedOnly: false,
    });
    if (!resolved || resolved.event.id !== team.event_id) {
      return Response.json({ success: false, error: "Event not found." }, { status: 404, headers });
    }
    const registered = await completeEventRegistration({
      request,
      supabase,
      user,
      event: resolved.event,
      community: resolved.community,
      sourceCommunityId: resolved.community.id,
      joinCommunityId: resolved.community.id,
      customAnswers: answers,
      duplicateMode: "error",
      teamCode: code,
      teamInviteId: inviteId,
    });
    return Response.json(
      registered.success
        ? { success: true, teamName: team.name }
        : { success: false, error: registered.error || "Could not register. Please try again." },
      { status: registered.success ? 200 : 400, headers },
    );
  }

  const linkedinUrl = HackathonTeam.answerText(answers, HackathonTeam.HackathonQuestionId.LinkedIn);
  const attached = await HackathonTeams.attachRegistrationToTeam({
    joinCode: code,
    inviteId,
    registrationId,
    userId: user.id,
    linkedinUrl,
  });

  if (attached.ok) {
    // Keep the answers given at registration; the join form only adds to them.
    const { data: registration } = await supabase
      .from("event_registrations")
      .select("custom_answers")
      .eq("id", registrationId)
      .maybeSingle();
    const existing =
      registration?.custom_answers &&
      typeof registration.custom_answers === "object" &&
      !Array.isArray(registration.custom_answers)
        ? registration.custom_answers
        : {};
    await supabase
      .from("event_registrations")
      .update({ custom_answers: { ...existing, ...answers } as Json })
      .eq("id", registrationId);
  }
  return Response.json(
    attached.ok ? { success: true, teamName: attached.value.teamName } : { success: false, error: attached.error },
    { status: attached.ok ? 200 : 400, headers },
  );
}
