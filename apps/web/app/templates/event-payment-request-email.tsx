import { Section, Text } from "@react-email/components";
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

interface EventPaymentRequestEmailProps {
	eventTitle: string;
	communityName: string;
	eventLink: string;
	recipientName: string;
	ticketPrice: string;
	paymentInstructions: string | null;
	eventDate: string;
	eventTime: string;
}

export const EventPaymentRequestEmail = ({
	eventTitle = "Tech Meetup 2024",
	communityName = "Tech Community",
	eventLink = "https://luhive.com/events/123",
	recipientName = "there",
	ticketPrice = "20,00 ₼",
	paymentInstructions = "Card number: 4169 0000 0000 0000\nName on card: Ali Aliyev",
	eventDate = "Saturday, January 20, 2024",
	eventTime = "2:00 PM +04",
}: EventPaymentRequestEmailProps) => {
	const rows: DetailRowData[] = [
		{ label: "Ticket", value: ticketPrice },
		{ label: "Date", value: eventDate },
		{ label: "Time", value: eventTime },
		{ label: "Host", value: communityName },
	];

	return (
		<EmailLayout preview={`Pay ${ticketPrice} for ${eventTitle}`}>
			<Eyebrow>Payment needed</Eyebrow>
			<EmailTitle>{eventTitle}</EmailTitle>
			<Divider />
			<Paragraph>
				Hi {recipientName}, we received your registration for{" "}
				<strong style={{ color: emailColors.heading }}>{eventTitle}</strong>.
				Transfer {ticketPrice} using the details below, then upload the receipt
				on the event page. Or choose to pay cash at the door. The payment goes
				directly to {communityName}. Luhive does not process or check it.
			</Paragraph>
			<SectionLabel>How to pay</SectionLabel>
			<Section
				style={{
					border: `1px solid ${emailColors.cardBorder}`,
					borderRadius: "8px",
					padding: "22px 24px",
					marginBottom: "32px",
				}}
			>
				<Text
					style={{
						margin: 0,
						fontSize: "14px",
						color: emailColors.body,
						lineHeight: 1.7,
					}}
				>
					{paymentInstructions
						? paymentInstructions.split("\n").map((line, index) => (
								<React.Fragment key={index}>
									{index > 0 && <br />}
									{line}
								</React.Fragment>
							))
						: `${communityName} will send you the payment details.`}
				</Text>
			</Section>
			<SectionLabel>Event details</SectionLabel>
			<DetailsCard rows={rows} />
			<CtaButton href={eventLink}>Upload receipt or choose cash →</CtaButton>
			<FinePrint>
				Your ticket arrives after {communityName} marks the payment. Cover the
				full card number on the screenshot. It is not a tax receipt.
			</FinePrint>
		</EmailLayout>
	);
};

export default EventPaymentRequestEmail;
