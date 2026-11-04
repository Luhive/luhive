import type { ActionFunctionArgs } from "react-router";
import { createClient } from "~/shared/lib/supabase/server";
import * as HackathonTeams from "~/modules/events/server/hackathon-team.server";
import { saveEventReminders } from "~/modules/events/server/event-reminders.server";
import type { Database, Json } from "~/shared/models/database.types";
import { resolveEventPrice } from "~/modules/events/server/resolve-event-price.server";
import { resolveEventPaymentInstructions } from "~/modules/events/server/payments/resolve-event-payment-instructions.server";
import { saveEventPaymentInstructions } from "~/modules/events/data/event-payment-instructions-repo.server";
import { requireEventManager } from "~/modules/events/server/require-event-manager.server";

type EventType = Database["public"]["Enums"]["event_type"];
type EventStatus = Database["public"]["Enums"]["event_status"];
type ReminderTime = Database["public"]["Enums"]["reminder_time"];

export interface EventUpdatePayload {
  eventId: string;
  communityId: string;
  communitySlug: string;
  title: string;
  description?: string | null;
  startTime: string;
  endTime?: string | null;
  timezone: string;
  eventType: EventType;
  locationAddress?: string | null;
  locationName?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  locationPlaceId?: string | null;
  onlineMeetingLink?: string | null;
  discussionLink?: string | null;
  capacity?: number | null;
  registrationDeadline?: string | null;
  coverUrl?: string | null;
  status: EventStatus;
  isApproveRequired: boolean;
  isHackathon?: boolean;
  maxTeamSize?: number | null;
  priceMinor?: number | null;
  paymentInstructions?: string | null;
  customQuestions?: Json | null;
  reminderTimes?: ReminderTime[];
  reminderMessage?: string | null;
}

export interface EventUpdateResult {
  success: true;
  eventId: string;
  communitySlug: string;
  status: string;
}

export interface EventUpdateError {
  success: false;
  error: string;
}

export async function eventUpdateAction({
  request,
}: ActionFunctionArgs): Promise<EventUpdateResult | EventUpdateError | Response> {
  const { supabase } = createClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in" };
  }

  let payload: EventUpdatePayload;
  try {
    payload = await request.json();
  } catch {
    return { success: false, error: "Invalid request body" };
  }

  const {
    eventId,
    communityId,
    communitySlug,
    title,
    description,
    startTime,
    endTime,
    timezone,
    eventType,
    locationAddress,
    locationName,
    locationLat,
    locationLng,
    locationPlaceId,
    onlineMeetingLink,
    discussionLink,
    capacity,
    registrationDeadline,
    coverUrl,
    status,
    isApproveRequired,
    isHackathon,
    maxTeamSize,
    priceMinor: requestedPriceMinor,
    paymentInstructions: requestedPaymentInstructions,
    customQuestions,
    reminderTimes,
    reminderMessage,
  } = payload;

  // Verify caller is host community
  const { data: collaboration } = await supabase
    .from("event_collaborations")
    .select("role")
    .eq("event_id", eventId)
    .eq("community_id", communityId)
    .eq("role", "host")
    .eq("status", "accepted")
    .single();

  if (!collaboration) {
    return { success: false, error: "Only host community can update event details" };
  }

  const { data: existingEvent } = await supabase
    .from("events")
    .select("price_minor, registration_type")
    .eq("id", eventId)
    .maybeSingle();

  const price = await resolveEventPrice({
    supabase,
    communityId,
    requestedPriceMinor,
    existingEvent: {
      id: eventId,
      priceMinor: existingEvent?.price_minor ?? null,
    },
  });
  if (!price.ok) {
    return { success: false, error: price.error };
  }
  if (isHackathon && price.priceMinor !== null) {
    return { success: false, error: "Hackathon mode is only available on free events." };
  }

  const paymentInstructions = await resolveEventPaymentInstructions({
    communityId,
    priceMinor: price.priceMinor,
    requestedInstructions: requestedPaymentInstructions,
  });
  if (!paymentInstructions.ok) {
    return { success: false, error: paymentInstructions.error };
  }

  // The instructions are written with the service role, so the caller must be
  // proven to manage this event before anything is saved.
  if (paymentInstructions.instructions) {
    const manager = await requireEventManager(request, eventId);
    if (!manager.ok) {
      return { success: false, error: manager.error };
    }
  }

  const { error: eventError } = await supabase
    .from("events")
    .update({
      community_id: communityId,
      title,
      description: description || null,
      start_time: startTime,
      end_time: endTime || null,
      timezone,
      event_type: eventType,
      location_address: locationAddress || null,
      location_name: locationName || null,
      location_lat: locationLat ?? null,
      location_lng: locationLng ?? null,
      location_place_id: locationPlaceId || null,
      online_meeting_link: onlineMeetingLink || null,
      discussion_link: discussionLink?.trim() || null,
      capacity: capacity || null,
      registration_deadline: registrationDeadline || null,
      cover_url: coverUrl || null,
      status,
      // Payment is the gate for priced events, so manual approval is not used.
      is_approve_required:
        price.priceMinor === null ? Boolean(isHackathon) || isApproveRequired : false,
      price_minor: price.priceMinor,
      custom_questions: (customQuestions ?? null) as Json | null,
    })
    .eq("id", eventId);

  if (eventError) {
    console.error("Error updating event:", eventError);
    return { success: false, error: eventError.message || "Failed to update event" };
  }

  try {
    const hackathon = await HackathonTeams.applyEventHackathon(eventId, {
      requested: Boolean(isHackathon),
      maxTeamSize: maxTeamSize ?? null,
      priceMinor: price.priceMinor,
      // From the stored event: this action never changes it, and hackathon mode
      // must refuse external events even if a request asks for it.
      registrationType: existingEvent?.registration_type ?? null,
    });
    if (!hackathon.ok) {
      return { success: false, error: hackathon.error };
    }
  } catch (hackathonError) {
    console.error("Failed to save hackathon settings:", hackathonError);
    return {
      success: false,
      error: hackathonError instanceof Error ? hackathonError.message : "Could not save hackathon mode",
    };
  }

  await saveEventReminders(eventId, reminderTimes ?? [], reminderMessage ?? null);

  if (paymentInstructions.instructions) {
    try {
      await saveEventPaymentInstructions(eventId, paymentInstructions.instructions);
    } catch (instructionsError) {
      console.error("Failed to save payment instructions:", instructionsError);
      return { success: false, error: "Failed to save payment instructions" };
    }
  }

  return { success: true, eventId, communitySlug, status };
}
