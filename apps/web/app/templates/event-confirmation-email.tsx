import { Img, Link, Section, Text } from "@react-email/components";
import * as React from "react";
import {
	CtaButton,
	DetailsCard,
	Divider,
	EmailLayout,
	EmailTitle,
	Eyebrow,
	FinePrint,
	Paragraph,
	SectionLabel,
	emailColors,
	type DetailRowData,
} from "./components/email-layout";

interface EventConfirmationEmailProps {
	eventTitle: string;
	communityName: string;
	eventDate: string;
	eventTime: string;
	eventLink: string;
	recipientName: string;
	registerAccountLink: string;
	locationAddress?: string;
	locationMapUrl?: string;
	onlineMeetingLink?: string;
	hasQrCode?: boolean;
	ticketPrice?: string;
	/** The organiser confirmed the payment by hand instead of a payment provider. */
	isPaidManually?: boolean;
	/** Confirmed now, money collected in cash at the door. */
	isPayAtDoor?: boolean;
}

export const EventConfirmationEmail = ({
	eventTitle = "Tech Meetup 2024",
	communityName = "Tech Community",
	eventDate = "Saturday, January 20, 2024",
	eventTime = "2:00 PM PST",
	eventLink = "https://luhive.com/events/123",
	recipientName = "there",
	locationAddress,
	locationMapUrl,
	onlineMeetingLink,
	hasQrCode = false,
	ticketPrice,
	isPaidManually = false,
	isPayAtDoor = false,
}: EventConfirmationEmailProps) => {
	const rows: DetailRowData[] = [
		{ label: "Date", value: eventDate },
		{ label: "Time", value: eventTime },
	];
	if (ticketPrice) {
		rows.push({
			label: "Ticket",
			value: isPayAtDoor ? `${ticketPrice}, pay at the door` : ticketPrice,
		});
	}
	if (locationAddress)
		rows.push({
			label: "Location",
			value: locationMapUrl ? (
				<>
					{locationAddress}{" "}
					<Link
						href={locationMapUrl}
						style={{ color: emailColors.accent, textDecoration: "underline" }}
					>
						Map
					</Link>
				</>
			) : (
				locationAddress
			),
		});
	if (onlineMeetingLink)
		rows.push({
			label: "Online",
			value: (
				<Link
					href={onlineMeetingLink}
					style={{ color: emailColors.accent, textDecoration: "underline" }}
				>
					Join meeting
				</Link>
			),
		});
	rows.push({ label: "Host", value: communityName });

	return (
		<EmailLayout preview={`You're registered — ${eventTitle}`}>
			<Eyebrow>Registration confirmed</Eyebrow>
			<EmailTitle>{eventTitle}</EmailTitle>
			<Divider />
			<Paragraph>
				Hi {recipientName},{" "}
				{isPayAtDoor
					? `your spot at `
					: ticketPrice
						? isPaidManually
							? `${communityName} confirmed your payment and your spot at `
							: "your payment went through and your spot at "
						: "your spot at "}
				<strong style={{ color: emailColors.heading }}>{eventTitle}</strong> is
				confirmed.
				{isPayAtDoor
					? ` Bring ${ticketPrice} in cash to pay at the door. A calendar invite is attached.`
					: " A calendar invite is attached."}
			</Paragraph>
			<SectionLabel>Event details</SectionLabel>
			<DetailsCard rows={rows} />
			{hasQrCode && (
				<Section style={{ marginBottom: "32px" }}>
					<SectionLabel>Check-in</SectionLabel>
					<Text
						style={{
							margin: "0 0 16px 0",
							fontSize: "14px",
							color: emailColors.body,
							lineHeight: 1.7,
						}}
					>
						Show this QR code at the door. It's also attached to this email.
					</Text>
					<Img
						src="cid:event-qr"
						width="180"
						height="180"
						alt="Your check-in QR code"
						style={{
							display: "block",
							border: `1px solid ${emailColors.cardBorder}`,
							borderRadius: "8px",
						}}
					/>
				</Section>
			)}
			<CtaButton href={eventLink}>View event →</CtaButton>
			<FinePrint>See you there.</FinePrint>
		</EmailLayout>
	);
};

export default EventConfirmationEmail;
