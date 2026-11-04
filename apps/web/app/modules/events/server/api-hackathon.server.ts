import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import * as HackathonTeams from "~/modules/events/server/hackathon-team.server";
import { requireEventManager } from "~/modules/events/server/require-event-manager.server";
import { createClient } from "~/shared/lib/supabase/server";
import { publicOrigin } from "~/shared/lib/http/public-origin.server";
import { logHackathon, logHackathonResponse } from "~/modules/events/server/hackathon-log.server";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    return await readHackathon(request);
  } catch (error) {
    const url = new URL(request.url);
    logHackathon(
      "error",
      `read:${url.searchParams.get("view") || "settings"}`,
      { eventId: url.searchParams.get("eventId") },
      error,
    );
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

async function readHackathon(request: Request) {
  const url = new URL(request.url);
  const eventId = url.searchParams.get("eventId")?.trim() || "";
  const view = url.searchParams.get("view") || "settings";
  if (!eventId) {
    return Response.json({ error: "Missing event" }, { status: 400 });
  }

  if (view === "team" || view === "captain") {
    const { supabase } = createClient(request);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (view === "team") {
      const team = await HackathonTeams.findHackathonTeamDetails(user.id, eventId);
      return Response.json({ team });
    }
    const sheet = await HackathonTeams.findCaptainTeamSheet(user.id, eventId);
    return Response.json({ sheet });
  }

  const manager = await requireEventManager(request, eventId);
  if (!manager.ok) return Response.json({ error: manager.error }, { status: 403 });

  if (view === "dashboard") {
    const dashboard = await HackathonTeams.findHackathonDashboard(eventId);
    return Response.json({ dashboard });
  }

  return Response.json(await HackathonTeams.eventSettings(eventId));
}

export async function action({ request }: ActionFunctionArgs) {
  const { supabase } = createClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");
  const fields = {
    userId: user.id,
    eventId: String(formData.get("eventId") || "") || null,
    teamId: String(formData.get("teamId") || "") || null,
    memberId: String(formData.get("memberId") || "") || null,
  };
  try {
    const response = await runIntent(request, user.id, intent, formData);
    await logHackathonResponse(intent || "unknown", fields, response);
    return response;
  } catch (error) {
    logHackathon("error", intent || "unknown", fields, error);
    return Response.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

async function runIntent(request: Request, userId: string, intent: string, formData: FormData) {
  const user = { id: userId };

  if (intent === "leave") {
    const result = await HackathonTeams.leaveHackathonTeam({
      userId: user.id,
      eventId: String(formData.get("eventId") || ""),
      nextCaptainMemberId: String(formData.get("nextCaptainMemberId") || ""),
    });
    return Response.json(
      result.ok ? { success: true, left: true } : { success: false, error: result.error },
      { status: result.ok ? 200 : 400 },
    );
  }

  if (intent === "assign") {
    const result = await HackathonTeams.assignHackathonCaptain({
      userId: user.id,
      memberId: String(formData.get("memberId") || ""),
    });
    return Response.json(
      result.ok ? { success: true } : { success: false, error: result.error },
      { status: result.ok ? 200 : 400 },
    );
  }

  if (intent === "invite") {
    let emails: unknown[] = [];
    try {
      const parsed = JSON.parse(String(formData.get("emails") || "[]"));
      if (Array.isArray(parsed)) emails = parsed;
    } catch {
      emails = [];
    }
    const result = await HackathonTeams.inviteHackathonTeammates({
      eventId: String(formData.get("eventId") || ""),
      userId: user.id,
      emails,
      origin: publicOrigin(request),
    });
    return Response.json(
      result.ok ? { success: true, ...result.value } : { success: false, error: result.error },
      { status: result.ok ? 200 : 400 },
    );
  }

  if (intent === "cancel-invite") {
    const result = await HackathonTeams.cancelHackathonInvite({
      eventId: String(formData.get("eventId") || ""),
      userId: user.id,
      inviteId: String(formData.get("inviteId") || ""),
    });
    return Response.json(
      result.ok ? { success: true } : { success: false, error: result.error },
      { status: result.ok ? 200 : 400 },
    );
  }

  if (intent === "remove") {
    const eventId = String(formData.get("eventId") || "");
    const manager = eventId ? await requireEventManager(request, eventId) : { ok: false as const };
    const result = await HackathonTeams.removeHackathonMember({
      memberId: String(formData.get("memberId") || ""),
      userId: user.id,
      organizerEventId: manager.ok ? eventId : null,
    });
    return Response.json(
      result.ok ? { success: true } : { success: false, error: result.error },
      { status: result.ok ? 200 : 400 },
    );
  }

  if (intent === "decide") {
    const eventId = String(formData.get("eventId") || "");
    const manager = await requireEventManager(request, eventId);
    if (!manager.ok) {
      return Response.json({ success: false, error: manager.error }, { status: 403 });
    }
    const status = formData.get("status") === "rejected" ? "rejected" : "approved";
    const result = await HackathonTeams.decideHackathonTeam({
      eventId,
      teamId: String(formData.get("teamId") || ""),
      status,
      origin: new URL(request.url).origin,
    });
    return Response.json(
      result.ok
        ? { success: true, approval: result.value.approval }
        : { success: false, error: result.error },
      { status: result.ok ? 200 : 400 },
    );
  }

  return Response.json({ success: false, error: "Unknown action" }, { status: 400 });
}
