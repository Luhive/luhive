import * as React from "react";
import {
	CtaButton,
	DetailsCard,
	Divider,
	EmailLayout,
	EmailTitle,
	Eyebrow,
	Paragraph,
	SectionLabel,
	emailColors,
	type DetailRowData,
} from "./components/email-layout";

interface EventRegistrationNotificationEmailProps {
	eventTitle: string;
	registrantName: string;
	registrantEmail: string;
	hostCommunityName: string;
	coHostCommunityNames: string[];
	eventDate: string;
	eventTime: string;
	eventLink: string;
	recipientName: string;
	ticketPrice?: string;
	registrationCount?: number;
	totalGain?: string;
	/**
	 * Manual payments only. `awaiting_payment`: registered, money not received
	 * yet. `marked_paid`: an organiser confirmed the payment.
	 */
	paymentStatus?: "receipt_sent" | "pays_at_door" | "marked_paid";
}

export const EventRegistrationNotificationEmail = ({
	eventTitle = "Tech Meetup 2024",
	registrantName = "John Doe",
	registrantEmail = "user@example.com",
	hostCommunityName = "Tech Community",
	coHostCommunityNames = [],
	eventDate = "Saturday, January 20, 2024",
	eventTime = "2:00 PM PST",
	eventLink = "https://luhive.com/events/123",
	recipientName = "there",
	ticketPrice,
	registrationCount,
	totalGain,
	paymentStatus,
}: EventRegistrationNotificationEmailProps) => {
	const isReceiptSent = paymentStatus === "receipt_sent";
	const isPayAtDoor = paymentStatus === "pays_at_door";
	const isMarkedPaid = paymentStatus === "marked_paid";

	const rows: DetailRowData[] = [
		{ label: "Name", value: registrantName },
		{ label: "Email", value: registrantEmail },
	];
	if (ticketPrice) {
		rows.push({ label: "Ticket", value: ticketPrice });
	}
	if (isReceiptSent) {
		rows.push({ label: "Status", value: "Receipt sent" });
	}
	if (isPayAtDoor) {
		rows.push({ label: "Status", value: "Pays at the door" });
	}
	if (registrationCount !== undefined) {
		rows.push({ label: "Registrations", value: String(registrationCount) });
	}
	if (totalGain) {
		rows.push({ label: "Total gain", value: totalGain });
	}
	rows.push({ label: "Date", value: eventDate });
	rows.push({ label: "Time", value: eventTime });
	rows.push({ label: "Host", value: hostCommunityName });
	if (coHostCommunityNames.length > 0) {
		rows.push({ label: "Co-hosts", value: coHostCommunityNames.join(", ") });
	}

	const registrationLabel =
		registrationCount === undefined
			? undefined
			: registrationCount === 1
				? "1 registration"
				: `${registrationCount} registrations`;
	const totals =
		registrationLabel && totalGain
			? ` This event now has ${registrationLabel} and ${totalGain} in total.`
			: "";

	let eyebrow = "New registration";
	let preview: string;
	let summary: string;
	if (isReceiptSent) {
		eyebrow = "Receipt received";
		preview = `${registrantName} sent a receipt for ${eventTitle}`;
		summary = ` sent a receipt for ${ticketPrice}. Check it and mark them as paid.`;
	} else if (isPayAtDoor) {
		eyebrow = "Pays at the door";
		preview = `${registrantName} will pay ${ticketPrice} in cash at the door`;
		summary = ` will pay ${ticketPrice} in cash at the door. Their spot is already confirmed. Mark them as paid when you have the cash.`;
	} else if (isMarkedPaid) {
		eyebrow = "Payment confirmed";
		preview =
			registrationLabel && totalGain
				? `${registrationLabel} · ${totalGain} total — ${registrantName}'s payment was marked as paid`
				: `${registrantName}'s payment for ${eventTitle} was marked as paid`;
		summary = `'s payment for ${eventTitle} was marked as paid.${totals}`;
	} else if (ticketPrice) {
		preview =
			registrationLabel && totalGain
				? `${registrationLabel} · ${totalGain} total — ${registrantName} bought a ticket for ${eventTitle}`
				: `${registrantName} bought a ticket for ${eventTitle}`;
		summary = ` bought a ticket for ${eventTitle}.${totals}`;
	} else {
		preview = `${registrantName} registered for ${eventTitle}`;
		summary = ` registered for ${eventTitle}.`;
	}

	return (
		<EmailLayout preview={preview}>
			<Eyebrow>{eyebrow}</Eyebrow>
			<EmailTitle>{eventTitle}</EmailTitle>
			<Divider />
			<Paragraph>
				Hi {recipientName},{" "}
				<strong style={{ color: emailColors.heading }}>
					{registrantName}
				</strong>
				{summary}
			</Paragraph>
			<SectionLabel>Registration details</SectionLabel>
			<DetailsCard rows={rows} />
			<CtaButton href={eventLink}>View registrants →</CtaButton>
		</EmailLayout>
	);
};

export default EventRegistrationNotificationEmail;
