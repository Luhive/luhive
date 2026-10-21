import { createServiceRoleClient } from "~/shared/lib/supabase/server";
import { sendEventRegistrationNotificationEmail } from "~/shared/lib/email.server";

export type SendRegistrationOrganizerNotificationsInput = {
	hostCommunityId: string;
	hostCommunityName: string;
	coHostCommunityNames: string[];
	eventTitle: string;
	registrantName: string;
	registrantEmail: string;
	eventDate: string;
	eventTime: string;
	eventLink: string;
	ticketPrice?: string;
	registrationCount?: number;
	totalGain?: string;
	paymentStatus?: "receipt_sent" | "pays_at_door" | "marked_paid";
};

export async function sendRegistrationOrganizerNotifications(
	input: SendRegistrationOrganizerNotificationsInput,
) {
	const {
		hostCommunityId,
		hostCommunityName,
		coHostCommunityNames,
		eventTitle,
		registrantName,
		registrantEmail,
		eventDate,
		eventTime,
		eventLink,
		ticketPrice,
		registrationCount,
		totalGain,
		paymentStatus,
	} = input;

	const serviceClient = createServiceRoleClient();

	const { data: hostAdmins } = await serviceClient
		.from("community_members")
		.select("user_id")
		.eq("community_id", hostCommunityId)
		.in("role", ["owner", "admin"])
		.eq("notify_registrations", true);

	let coHostAdminIds: string[] = [];
	if (coHostCommunityNames.length > 0) {
		const { data: coHostCommunities } = await serviceClient
			.from("communities")
			.select("id")
			.in("name", coHostCommunityNames);

		if (coHostCommunities && coHostCommunities.length > 0) {
			const coHostIds = coHostCommunities.map((c) => c.id);
			const { data: coHostAdmins } = await serviceClient
				.from("community_members")
				.select("user_id")
				.in("community_id", coHostIds)
				.in("role", ["owner", "admin"])
				.eq("notify_registrations", true);

			if (coHostAdmins) {
				coHostAdminIds = coHostAdmins
					.map((a) => a.user_id)
					.filter((id): id is string => !!id);
			}
		}
	}

	let allAdminIds: string[] = [];
	if (hostAdmins) {
		allAdminIds = hostAdmins
			.map((a) => a.user_id)
			.filter((id): id is string => !!id);
	}
	allAdminIds = [...new Set([...allAdminIds, ...coHostAdminIds])];

	const registrationPayloads = [];

	for (const adminId of allAdminIds) {
		try {
			const { data: ownerData } =
				await serviceClient.auth.admin.getUserById(adminId);
			if (ownerData?.user?.email) {
				const { data: profile } = await serviceClient
					.from("profiles")
					.select("full_name")
					.eq("id", adminId)
					.maybeSingle();

				registrationPayloads.push({
					eventTitle,
					registrantName,
					registrantEmail,
					hostCommunityName,
					coHostCommunityNames,
					eventDate,
					eventTime,
					eventLink,
					ticketPrice,
					registrationCount,
					totalGain,
					paymentStatus,
					recipientEmail: ownerData.user.email,
					recipientName:
						profile?.full_name || ownerData.user.email.split("@")[0],
				});
			}
		} catch (error) {
			console.error(
				"Failed to prepare registration notification for admin:",
				adminId,
				error,
			);
		}
	}

	if (registrationPayloads.length > 0) {
		await sendEventRegistrationNotificationEmail(registrationPayloads);
	}
}
