import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/shared/models/database.types";
import type { Profile } from "~/shared/models/entity.types";
import type { EventPageUserState } from "~/modules/events/model/event-detail-view.types";
import { getApprovedRegistrationCount } from "~/modules/events/data/registrations-repo.server";
import { findPendingTicketPayment } from "~/modules/events/server/payments/find-pending-ticket-payment.server";
import type { PendingTicketPayment } from "~/modules/events/model/ticket-order.types";

type DbClient = SupabaseClient<Database>;

type CanRegisterEvent = {
	status: string;
	registration_deadline: string | null;
	start_time: string;
	capacity: number | null;
};

export function computeCanRegister(
	event: CanRegisterEvent,
	registrationCount: number,
	isUserRegistered: boolean,
): boolean {
	if (isUserRegistered) return false;

	const now = new Date();
	const eventStartTime = new Date(event.start_time);
	const registrationDeadline = event.registration_deadline
		? new Date(event.registration_deadline)
		: eventStartTime;

	return (
		event.status === "published" &&
		now < registrationDeadline &&
		(!event.capacity || registrationCount < event.capacity)
	);
}

export async function fetchEventPageUserState(
	supabase: DbClient,
	serviceClient: DbClient,
	eventId: string,
	communityId: string,
): Promise<EventPageUserState> {
	const [
		registrationCount,
		{
			data: { user },
		},
		{ data: event },
	] = await Promise.all([
		getApprovedRegistrationCount(serviceClient, eventId),
		supabase.auth.getUser(),
		supabase
			.from("events")
			.select(
				"status, registration_deadline, start_time, capacity, registration_type, price_minor",
			)
			.eq("id", eventId)
			.single(),
	]);

	let isUserRegistered = false;
	let userRegistrationStatus: string | null = null;
	let userCheckinToken: string | null = null;
	let userProfile: Profile | null = null;
	let isCommunityMember = false;
	let pendingTicketPayment: PendingTicketPayment | null = null;
	let authUser: { id: string; email?: string | null } | null = null;

	if (user) {
		authUser = { id: user.id, email: user.email };

		const registrationQuery =
			event?.registration_type !== "external"
				? supabase
						.from("event_registrations")
						.select("id, approval_status, checkin_token")
						.eq("event_id", eventId)
						.eq("user_id", user.id)
						.maybeSingle()
				: Promise.resolve({ data: null });

		const [{ data: registration }, { data: membership }, { data: profile }] =
			await Promise.all([
				registrationQuery,
				supabase
					.from("community_members")
					.select("id")
					.eq("community_id", communityId)
					.eq("user_id", user.id)
					.maybeSingle(),
				supabase.from("profiles").select("*").eq("id", user.id).single(),
			]);

		if (event?.registration_type !== "external") {
			isUserRegistered = !!registration;
			userRegistrationStatus = registration?.approval_status || null;
			userCheckinToken = registration?.checkin_token || null;

			if (
				registration &&
				(registration.approval_status === "pending" ||
					(registration.approval_status === "approved" &&
						event?.price_minor != null &&
						event.price_minor > 0))
			) {
				pendingTicketPayment = await findPendingTicketPayment(registration.id);
			}
		}

		isCommunityMember = !!membership;
		userProfile = profile || null;
	}

	const canRegister = event
		? computeCanRegister(event, registrationCount, isUserRegistered)
		: false;

	return {
		isUserRegistered,
		userRegistrationStatus,
		userCheckinToken,
		registrationCount,
		user: authUser,
		userProfile,
		isCommunityMember,
		canRegister,
		pendingTicketPayment,
	};
}
