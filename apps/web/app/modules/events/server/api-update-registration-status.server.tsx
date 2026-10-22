import type { ActionFunctionArgs } from "react-router";
import { createClient } from "~/shared/lib/supabase/server";
import { sendEventStatusUpdateEmail } from "~/shared/lib/email.server";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { Routes } from "~/shared/lib/routing/routes";
import { publicEventSlug } from "~/modules/events/utils/event-slug";
import { findTicketOrderByRegistrationId } from "~/modules/events/data/ticket-orders-repo.server";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export async function action({ request }: ActionFunctionArgs) {
	if (request.method !== "POST") {
		return { success: false, error: "Method not allowed" };
	}

	const { supabase } = createClient(request);
	const { data: { user }, error: authError } = await supabase.auth.getUser();
	if (authError || !user) {
		return { success: false, error: "Unauthorized" };
	}

	const formData = await request.formData();
	const registrationId = formData.get("registrationId") as string;
	const eventId = formData.get("eventId") as string;
	const status = formData.get("status") as "approved" | "rejected";

	if (!registrationId || !eventId || !status) {
		return { success: false, error: "Missing required fields" };
	}
	if (!["approved", "rejected"].includes(status)) {
		return { success: false, error: "Invalid status" };
	}

	try {
		const { data: existingRegistration, error: existingRegistrationError } = await supabase
			.from("event_registrations")
			.select("checkin_token")
			.eq("id", registrationId)
			.eq("event_id", eventId)
			.single();
		if (existingRegistrationError || !existingRegistration) {
			return { success: false, error: "Registration not found" };
		}

		const { data: event, error: eventError } = await supabase
			.from("events")
			.select("*, community_id")
			.eq("id", eventId)
			.single();
		if (eventError || !event) {
			return { success: false, error: "Event not found" };
		}

		// Check if user's community is host or co-host
		const { data: collaboration } = await supabase
			.from("event_collaborations")
			.select("role")
			.eq("event_id", eventId)
			.eq("community_id", event.community_id)
			.in("role", ["host", "co-host"])
			.eq("status", "accepted")
			.single();

		if (!collaboration) {
			return { success: false, error: "You do not have permission to manage this event" };
		}

		// Verify user is owner/admin of the community
		const { data: membership, error: membershipError } = await supabase
			.from("community_members")
			.select("role")
			.eq("community_id", event.community_id)
			.eq("user_id", user.id)
			.single();
		if (membershipError || !membership || !["owner", "admin"].includes(membership.role || "")) {
			// Also check if user is the community creator
			const { data: community } = await supabase
				.from("communities")
				.select("created_by")
				.eq("id", event.community_id)
				.single();
			if (!community || community.created_by !== user.id) {
				return { success: false, error: "You do not have permission to manage this event" };
			}
		}

		if (status === "approved") {
			const order = await findTicketOrderByRegistrationId(registrationId);
			if (order?.status === "refunded" && order.event_id === eventId) {
				return {
					success: false,
					error: "This ticket was refunded.",
				};
			}
			if (order?.status === "pending" && order.event_id === eventId) {
				return {
					success: false,
					error: "This registration is waiting for payment. Use Mark as paid.",
				};
			}
		}

		const updatePayload: { approval_status: "approved" | "rejected"; checkin_token?: string } = {
			approval_status: status,
		};
		if (status === "approved" && !existingRegistration.checkin_token) {
			updatePayload.checkin_token = crypto.randomUUID();
		}

		const { data: updatedRegistration, error: updateError } = await supabase
			.from("event_registrations")
			.update(updatePayload)
			.eq("id", registrationId)
			.eq("event_id", eventId)
			.select("checkin_token")
			.single();
		if (updateError) {
			console.error("Error updating registration:", updateError);
			return { success: false, error: "Failed to update status" };
		}

		const { data: registration, error: regError } = await supabase
			.from("event_registrations")
			.select(`
        id,
        anonymous_name,
        anonymous_email,
        user_id,
        profiles!event_registrations_user_id_fkey1 ( full_name, id )
      `)
			.eq("id", registrationId)
			.single();

		if (regError || !registration) {
			return { success: true, message: "Status updated, but failed to send email (details not found)" };
		}

		let recipientEmail = registration.anonymous_email;
		let recipientName = registration.anonymous_name;

		if (!recipientEmail && registration.user_id) {
			const { createServiceRoleClient } = await import("~/shared/lib/supabase/server");
			const adminSupabase = createServiceRoleClient();
			const { data: targetUser, error: userError } = await adminSupabase.auth.admin.getUserById(registration.user_id);
			if (!userError && targetUser?.user) {
				recipientEmail = targetUser.user.email!;
				recipientName = (registration as any).profiles?.full_name || recipientName || "there";
			}
		}

		if (recipientEmail) {
			const { data: communityData } = await supabase
				.from("communities")
				.select("slug, name")
				.eq("id", event.community_id)
				.single();
			const url = new URL(request.url);
			const finalEventLink = communityData
				? Routes.absolute(url.origin, Routes.community.event(communityData.slug, publicEventSlug(event)))
				: Routes.absolute(url.origin, Routes.community.event("community", publicEventSlug(event)));
			const eventDate = dayjs(event.start_time).tz(event.timezone);

			await sendEventStatusUpdateEmail({
				eventTitle: event.title,
				communityName: communityData?.name || "Community",
				eventLink: finalEventLink,
				recipientName: recipientName || "there",
				recipientEmail,
				status,
				eventDate: eventDate.format("dddd, MMMM D, YYYY"),
				eventTime: eventDate.format("h:mm A z"),
				locationAddress: event.location_address || undefined,
				onlineMeetingLink: event.online_meeting_link || undefined,
				startTimeISO: event.start_time,
				endTimeISO: event.end_time || event.start_time,
				checkinToken: updatedRegistration?.checkin_token || existingRegistration.checkin_token,
			});
		}

		return { success: true };
	} catch (error: any) {
		console.error("Error in update-registration-status:", error);
		return { success: false, error: error.message || "Internal server error" };
	}
}
