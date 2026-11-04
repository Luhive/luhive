import type { LoaderFunctionArgs } from "react-router";
import { createServiceRoleClient } from "~/shared/lib/supabase/server";
import { requireEventManager } from "~/modules/events/server/require-event-manager.server";

/** Emails of an event's registered users, for that event's organizers only. */
export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url);
	const eventId = url.searchParams.get("eventId");
	const userIds = url.searchParams.get("userIds");
	if (!eventId || !userIds) {
		return Response.json({ error: "eventId and userIds parameters are required" }, { status: 400 });
	}

	const manager = await requireEventManager(request, eventId);
	if (!manager.ok) {
		const status = manager.error === "Unauthorized" ? 401 : 403;
		return Response.json({ error: manager.error }, { status });
	}

	try {
		const userIdArray = JSON.parse(userIds) as unknown;
		if (!Array.isArray(userIdArray) || userIdArray.length === 0) {
			return Response.json({ emails: {} });
		}

		const serviceClient = createServiceRoleClient();

		// Only people registered for this event; anyone else's id is ignored.
		const { data: registrations, error: registrationsError } = await serviceClient
			.from("event_registrations")
			.select("user_id")
			.eq("event_id", eventId)
			.in("user_id", userIdArray.filter((id): id is string => typeof id === "string"));
		if (registrationsError) throw registrationsError;

		const registeredIds = [
			...new Set((registrations ?? []).flatMap((row) => (row.user_id ? [row.user_id] : []))),
		];
		const emailMap: Record<string, string> = {};

		await Promise.all(
			registeredIds.map(async (userId) => {
				try {
					const { data: userData, error } = await serviceClient.auth.admin.getUserById(userId);
					if (!error && userData?.user?.email) {
						emailMap[userId] = userData.user.email;
					}
				} catch (err) {
					console.warn(`Failed to fetch email for user ${userId}:`, err);
				}
			})
		);

		return Response.json({ emails: emailMap });
	} catch (error) {
		console.error("Error fetching user emails:", error);
		return Response.json({ error: "Failed to fetch emails" }, { status: 500 });
	}
}
