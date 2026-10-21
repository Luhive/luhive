import type { ActionFunctionArgs } from "react-router";
import { createClient } from "~/shared/lib/supabase/server";
import { notifyNewEvent } from "~/modules/events/server/notify-new-event.server";
import { saveEventReminders } from "~/modules/events/server/event-reminders.server";
import { GoogleMaps } from "~/modules/events/utils/google-maps";
import type { Database, Json } from "~/shared/models/database.types";
import { Routes } from "~/shared/lib/routing/routes";
import { ensureUniqueEventSlug } from "~/modules/events/server/ensure-event-slug.server";
import { publicEventSlug } from "~/modules/events/utils/event-slug";
import { resolveEventPrice } from "~/modules/events/server/resolve-event-price.server";
import { resolveEventPaymentInstructions } from "~/modules/events/server/payments/resolve-event-payment-instructions.server";
import { saveEventPaymentInstructions } from "~/modules/events/data/event-payment-instructions-repo.server";

type EventType = Database["public"]["Enums"]["event_type"];
type EventStatus = Database["public"]["Enums"]["event_status"];
type ReminderTime = Database["public"]["Enums"]["reminder_time"];

export interface EventCreatePayload {
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
  priceMinor?: number | null;
  paymentInstructions?: string | null;
  customQuestions?: Json | null;
  reminderTimes?: ReminderTime[];
  reminderMessage?: string | null;
  eventDate: string;
  eventTime: string;
  eventLinkBase: string;
}

export interface EventCreateResult {
  success: true;
  eventId: string;
  eventSlug: string;
  communitySlug: string;
}

export interface EventCreateError {
  success: false;
  error: string;
}

export async function eventCreateAction({
  request,
}: ActionFunctionArgs): Promise<EventCreateResult | EventCreateError | Response> {
  const { supabase } = createClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in" };
  }

  let payload: EventCreatePayload;
  try {
    payload = await request.json();
  } catch {
    return { success: false, error: "Invalid request body" };
  }

  const {
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
    priceMinor: requestedPriceMinor,
    paymentInstructions: requestedPaymentInstructions,
    customQuestions,
    reminderTimes,
    reminderMessage,
    eventDate,
    eventTime,
    eventLinkBase,
  } = payload;

  const price = await resolveEventPrice({
    supabase,
    communityId,
    requestedPriceMinor,
  });
  if (!price.ok) {
    return { success: false, error: price.error };
  }

  const paymentInstructions = await resolveEventPaymentInstructions({
    communityId,
    priceMinor: price.priceMinor,
    requestedInstructions: requestedPaymentInstructions,
  });
  if (!paymentInstructions.ok) {
    return { success: false, error: paymentInstructions.error };
  }

  const eventSlug = await ensureUniqueEventSlug(supabase, communityId, title);

  const { data: newEvent, error: eventError } = await supabase
    .from("events")
    .insert({
      community_id: communityId,
      created_by: user.id,
      title,
      slug: eventSlug,
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
      is_approve_required: price.priceMinor === null ? isApproveRequired : false,
      price_minor: price.priceMinor,
      custom_questions: (customQuestions ?? null) as Json | null,
    })
    .select("id, slug")
    .single();

  if (eventError || !newEvent) {
    console.error("Error creating event:", eventError);
    return { success: false, error: eventError?.message || "Failed to create event" };
  }

  const { error: collabError } = await supabase.from("event_collaborations").insert({
    event_id: newEvent.id,
    community_id: communityId,
    role: "host",
    status: "accepted",
    invited_by: user.id,
    invited_at: new Date().toISOString(),
    accepted_at: new Date().toISOString(),
  });

  if (collabError) {
    console.error("Error creating host collaboration:", collabError);
  }

  // The insert above passed RLS, so the caller manages this community.
  if (paymentInstructions.instructions) {
    try {
      await saveEventPaymentInstructions(newEvent.id, paymentInstructions.instructions);
    } catch (instructionsError) {
      console.error("Failed to save payment instructions:", instructionsError);
    }
  }

  if (reminderTimes && reminderTimes.length > 0) {
    await saveEventReminders(newEvent.id, reminderTimes, reminderMessage || null);
  }

  if (status === "published") {
    try {
      await notifyNewEvent({
        eventId: newEvent.id,
        communityId,
        eventTitle: title,
        eventDate,
        eventTime,
        eventLink: Routes.absolute(
          eventLinkBase,
          Routes.community.event(communitySlug, publicEventSlug(newEvent)),
        ),
        locationAddress: locationAddress || undefined,
        locationMapUrl: locationAddress
          ? GoogleMaps.mapsSearchUrl({
              name: locationName,
              address: locationAddress,
              placeId: locationPlaceId,
            })
          : undefined,
        onlineMeetingLink: onlineMeetingLink || undefined,
      });
    } catch (notifyError) {
      console.error("Failed to send new event notification emails:", notifyError);
    }
  }

  return {
    success: true,
    eventId: newEvent.id,
    eventSlug: publicEventSlug(newEvent),
    communitySlug,
  };
}
