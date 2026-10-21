import { createClient } from "~/shared/lib/supabase/server";

export type EventManagerResult =
  | { ok: true; userId: string }
  | { ok: false; error: string };

/**
 * Who may manage an event's payments: a host or co-host community's owner or
 * admin, or the community's creator. Same rule as the registration status
 * update.
 */
export async function requireEventManager(
  request: Request,
  eventId: string,
): Promise<EventManagerResult> {
  const { supabase } = createClient(request);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { ok: false, error: "Unauthorized" };
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("community_id")
    .eq("id", eventId)
    .single();
  if (eventError || !event) {
    return { ok: false, error: "Event not found" };
  }

  const { data: collaboration } = await supabase
    .from("event_collaborations")
    .select("role")
    .eq("event_id", eventId)
    .eq("community_id", event.community_id)
    .in("role", ["host", "co-host"])
    .eq("status", "accepted")
    .single();
  if (!collaboration) {
    return { ok: false, error: "You do not have permission to manage this event" };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("community_members")
    .select("role")
    .eq("community_id", event.community_id)
    .eq("user_id", user.id)
    .single();
  if (membershipError || !membership || !["owner", "admin"].includes(membership.role || "")) {
    const { data: community } = await supabase
      .from("communities")
      .select("created_by")
      .eq("id", event.community_id)
      .single();
    if (!community || community.created_by !== user.id) {
      return { ok: false, error: "You do not have permission to manage this event" };
    }
  }

  return { ok: true, userId: user.id };
}
