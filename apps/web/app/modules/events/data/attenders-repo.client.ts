import { createClient } from "~/shared/lib/supabase/client";
import type { CustomQuestionJson } from "~/modules/events/model/event.types";

export async function getAttendersCustomQuestions(
  eventId: string,
): Promise<CustomQuestionJson | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("events")
    .select("custom_questions")
    .eq("id", eventId)
    .single();
  return (data?.custom_questions as unknown as CustomQuestionJson) ?? null;
}

export async function getAttenderEmails(
  eventId: string,
  userIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (userIds.length === 0) return map;
  try {
    const response = await fetch(
      `/api/events/attenders-emails?eventId=${encodeURIComponent(eventId)}&userIds=${encodeURIComponent(JSON.stringify(userIds))}`,
    );
    if (response.ok) {
      const { emails } = await response.json();
      Object.entries(emails || {}).forEach(([userId, email]) => {
        map.set(userId, email as string);
      });
    }
  } catch (e) {
    console.error("Failed to fetch attender emails", e);
  }
  return map;
}

export async function getEventAttendersRaw(eventId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("event_registrations")
    .select(
      `
      id,
      user_id,
      anonymous_name,
      anonymous_email,
      anonymous_phone,
      rsvp_status,
      approval_status,
      is_attended,
      registered_at,
      custom_answers,
      profiles!event_registrations_user_id_fkey1 (
        id,
        full_name,
        avatar_url
      )
    `,
    )
    .eq("event_id", eventId)
    .eq("is_verified", true)
    .order("registered_at", { ascending: false });
  return { data: data || [], error };
}

export async function getFullRegistrationsForExport(eventId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("event_registrations")
    .select("*")
    .eq("event_id", eventId)
    .eq("is_verified", true);
  return data || [];
}

export async function deleteAttenderRegistration(
  eventId: string,
  registrationId: string,
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("event_registrations")
    .delete()
    .eq("id", registrationId)
    .eq("event_id", eventId);
  return { error };
}
