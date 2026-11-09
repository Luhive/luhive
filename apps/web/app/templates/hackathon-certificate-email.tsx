import * as React from "react";
import {
	CtaButton,
	Divider,
	EmailLayout,
	EmailTitle,
	Eyebrow,
	FinePrint,
	Paragraph,
	emailColors,
} from "./components/email-layout";

interface HackathonCertificateEmailProps {
	eventTitle: string;
	communityName: string;
	teamName: string;
	recipientName: string;
	/** "1st Place", "2nd Place", "3rd Place" or "Participant". */
	awardLabel: string;
	certificateLink: string;
	recipientEmail: string;
}

export const HackathonCertificateEmail = ({
	eventTitle = "Spring Hackathon",
	communityName = "Tech Community",
	teamName = "Team Uno",
	recipientName = "Aysel Mammadova",
	awardLabel = "1st Place",
	certificateLink = "https://luhive.com/certificate/abcd1234ef",
	recipientEmail = "aysel@example.com",
}: HackathonCertificateEmailProps) => {
	const placed = awardLabel !== "Participant";
	return (
		<EmailLayout preview={`Your certificate for ${eventTitle}`}>
			<Eyebrow>{eventTitle}</Eyebrow>
			<EmailTitle>{placed ? `${awardLabel}, ${recipientName}!` : `Thanks for building, ${recipientName}`}</EmailTitle>
			<Divider />
			<Paragraph>
				{placed ? (
					<>
						Your team <strong style={{ color: emailColors.heading }}>{teamName}</strong> won{" "}
						{awardLabel} at {eventTitle}, hosted by {communityName}.
					</>
				) : (
					<>
						You took part in {eventTitle} with{" "}
						<strong style={{ color: emailColors.heading }}>{teamName}</strong>, hosted by{" "}
						{communityName}.
					</>
				)}{" "}
				Your certificate is ready, with your name on it.
			</Paragraph>
			<Paragraph>
				Add it to your LinkedIn profile in one step, or share it to your Instagram story and tag{" "}
				<strong style={{ color: emailColors.heading }}>@luhivecom</strong>. We repost every one. It
				also shows as a badge on your Luhive profile.
			</Paragraph>
			<CtaButton href={certificateLink}>View your certificate →</CtaButton>
			<FinePrint>
				Name spelled wrong? Fix it on your Luhive profile and reply to this email, and we'll update
				your certificate. Anyone with the link can see your name, team and award. Sent to{" "}
				{recipientEmail}.
			</FinePrint>
		</EmailLayout>
	);
};

export default HackathonCertificateEmail;
