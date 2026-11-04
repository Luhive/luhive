import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json } from "~/shared/models/database.types";
import { createServiceRoleClient } from "~/shared/lib/supabase/server";

export type HackathonEventRecord = {
  id: string;
  is_hackathon: boolean;
  max_team_size: number | null;
  is_approve_required: boolean;
  status: string;
  start_time: string;
  end_time: string | null;
  registration_deadline: string | null;
  capacity: number | null;
  price_minor: number | null;
  registration_type: string | null;
  title: string;
  slug: string;
  community_id: string;
  timezone: string;
  location_address: string | null;
  online_meeting_link: string | null;
};

export type HackathonTeamRecord = {
  id: string;
  event_id: string;
  name: string;
  description: string;
  join_code: string;
  created_at: string;
};

export type HackathonMemberRecord = {
  id: string;
  team_id: string;
  registration_id: string;
  role: "captain" | "member";
};

export type HackathonInviteRecord = {
  id: string;
  team_id: string;
  email: string;
  created_at: string;
};

type HackathonEventUpdate = {
  is_hackathon?: boolean;
  max_team_size?: number | null;
  is_approve_required?: boolean;
};

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type HackathonDatabase = {
  public: {
    Tables: {
      events: Table<HackathonEventRecord, never, HackathonEventUpdate>;
      event_teams: Table<
        HackathonTeamRecord,
        {
          event_id: string;
          name: string;
          description: string;
          join_code: string;
        },
        { name?: string; description?: string; updated_at?: string }
      >;
      event_team_members: Table<
        HackathonMemberRecord,
        {
          team_id: string;
          registration_id: string;
          role: "captain" | "member";
        },
        { role?: "captain" | "member" }
      >;
      event_team_invites: Table<
        HackathonInviteRecord,
        { team_id: string; email: string },
        { updated_at?: string }
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

/** Raised by the team size trigger (migration 0014) when a team has no seat left. */
export class TeamFullError extends Error {
  constructor() {
    super("This team is full.");
    this.name = "TeamFullError";
  }
}

function throwWriteError(error: { message: string }): never {
  if (error.message.includes("hackathon_team_full")) throw new TeamFullError();
  throw new Error(error.message);
}

function teams() {
  return createServiceRoleClient() as unknown as SupabaseClient<HackathonDatabase>;
}

function service() {
  return createServiceRoleClient();
}

const EVENT_COLUMNS =
  "id, is_hackathon, max_team_size, is_approve_required, status, start_time, end_time, registration_deadline, capacity, price_minor, registration_type, title, slug, community_id, timezone, location_address, online_meeting_link";

export async function findHackathonEvent(eventId: string) {
  const { data, error } = await teams()
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("id", eventId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function saveHackathonColumns(
  eventId: string,
  update: HackathonEventUpdate,
) {
  const { error } = await teams()
    .from("events")
    .update(update)
    .eq("id", eventId);
  if (error) throw new Error(error.message);
}

export async function countEventTeams(eventId: string) {
  const { count, error } = await teams()
    .from("event_teams")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function findTeamByCode(joinCode: string) {
  const { data, error } = await teams()
    .from("event_teams")
    .select("id, event_id, name, description, join_code, created_at")
    .eq("join_code", joinCode)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function findTeamById(teamId: string) {
  const { data, error } = await teams()
    .from("event_teams")
    .select("id, event_id, name, description, join_code, created_at")
    .eq("id", teamId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function listTeamsForEvent(eventId: string) {
  const { data, error } = await teams()
    .from("event_teams")
    .select("id, event_id, name, description, join_code, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listMembersForTeams(teamIds: string[]) {
  if (teamIds.length === 0) return [];
  const { data, error } = await teams()
    .from("event_team_members")
    .select("id, team_id, registration_id, role")
    .in("team_id", teamIds);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function findMembershipByRegistration(
  registrationId: string,
) {
  const { data, error } = await teams()
    .from("event_team_members")
    .select("id, team_id, registration_id, role")
    .eq("registration_id", registrationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function insertTeam(
  row: {
    event_id: string;
    name: string;
    description: string;
    join_code: string;
  },
) {
  const { data, error } = await teams()
    .from("event_teams")
    .insert(row)
    .select("id, event_id, name, description, join_code, created_at")
    .single();
  if (error || !data) throw new Error(error?.message || "Could not create the team");
  return data;
}

export async function updateTeam(
  teamId: string,
  row: { name: string; description: string },
) {
  const { error } = await teams()
    .from("event_teams")
    .update({ ...row, updated_at: new Date().toISOString() })
    .eq("id", teamId);
  if (error) throw new Error(error.message);
}

export async function deleteTeam(teamId: string) {
  const { error } = await teams().from("event_teams").delete().eq("id", teamId);
  if (error) throw new Error(error.message);
}

export async function insertMember(
  row: {
    team_id: string;
    registration_id: string;
    role: "captain" | "member";
  },
) {
  const { error } = await teams().from("event_team_members").insert(row);
  if (error) throwWriteError(error);
}

export async function findMemberById(memberId: string) {
  const { data, error } = await teams()
    .from("event_team_members")
    .select("id, team_id, registration_id, role")
    .eq("id", memberId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Deletes an event registration; its team membership goes with it (cascade). */
export async function deleteRegistration(registrationId: string) {
  const { error } = await service().from("event_registrations").delete().eq("id", registrationId);
  if (error) throw new Error(error.message);
}

export async function updateMemberRole(memberId: string, role: "captain" | "member") {
  const { error } = await teams()
    .from("event_team_members")
    .update({ role })
    .eq("id", memberId);
  if (error) throw new Error(error.message);
}

export async function deleteMember(memberId: string) {
  const { error } = await teams()
    .from("event_team_members")
    .delete()
    .eq("id", memberId);
  if (error) throw new Error(error.message);
}

export async function countTeamMembers(teamId: string) {
  const { count, error } = await teams()
    .from("event_team_members")
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function listMembersByRegistrationIds(registrationIds: string[]) {
  if (registrationIds.length === 0) return [];
  const { data, error } = await teams()
    .from("event_team_members")
    .select("id, team_id, registration_id, role")
    .in("registration_id", registrationIds);
  if (error) throw new Error(error.message);
  return data ?? [];
}

const INVITE_COLUMNS = "id, team_id, email, created_at";

export async function listTeamInvites(teamId: string) {
  const { data, error } = await teams()
    .from("event_team_invites")
    .select(INVITE_COLUMNS)
    .eq("team_id", teamId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function countTeamInvites(teamId: string) {
  const { count, error } = await teams()
    .from("event_team_invites")
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function findTeamInvite(inviteId: string) {
  const { data, error } = await teams()
    .from("event_team_invites")
    .select(INVITE_COLUMNS)
    .eq("id", inviteId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Inserts the invite, or refreshes its time when that email was already invited. */
export async function saveTeamInvite(row: { team_id: string; email: string }) {
  const { data: existing, error: findError } = await teams()
    .from("event_team_invites")
    .select("id")
    .eq("team_id", row.team_id)
    .eq("email", row.email)
    .maybeSingle();
  if (findError) throw new Error(findError.message);
  if (existing) {
    const { error } = await teams()
      .from("event_team_invites")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return { id: existing.id, resent: true };
  }
  const { data, error } = await teams().from("event_team_invites").insert(row).select("id").single();
  if (error) throwWriteError(error);
  return { id: data.id, resent: false };
}

export async function deleteTeamInvite(inviteId: string) {
  const { error } = await teams().from("event_team_invites").delete().eq("id", inviteId);
  if (error) throw new Error(error.message);
}

export async function deleteTeamInvitesForEmail(teamId: string, email: string) {
  const { error } = await teams()
    .from("event_team_invites")
    .delete()
    .eq("team_id", teamId)
    .eq("email", email.toLowerCase());
  if (error) throw new Error(error.message);
}

export async function recordProfileLinkedIn(
  userId: string,
  linkedinUrl: string,
  fullName: string,
) {
  const { data: profile, error } = await service()
    .from("profiles")
    .select("metadata, full_name")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);

  const metadata =
    profile?.metadata && typeof profile.metadata === "object" && !Array.isArray(profile.metadata)
      ? profile.metadata
      : {};
  const socials =
    "social_links" in metadata &&
    metadata.social_links &&
    typeof metadata.social_links === "object" &&
    !Array.isArray(metadata.social_links)
      ? metadata.social_links
      : {};

  const nextMetadata = {
    ...metadata,
    social_links: { ...socials, linkedin: linkedinUrl },
  } as Json;

  const nextName = profile?.full_name?.trim()
    ? profile.full_name
    : fullName.trim() || null;

  if (!profile) {
    const { error: insertError } = await service().from("profiles").insert({
      id: userId,
      full_name: nextName,
      metadata: nextMetadata,
    });
    if (insertError) throw new Error(insertError.message);
    return;
  }

  const { error: updateError } = await service()
    .from("profiles")
    .update({
      full_name: nextName,
      metadata: nextMetadata,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (updateError) throw new Error(updateError.message);
}
