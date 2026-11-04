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

interface HackathonTeammateJoinedEmailProps {
	eventTitle: string;
	communityName: string;
	teamName: string;
	memberName: string;
	/** e.g. "3 of 4" or "3"; members plus open invites. */
	teamCount: string;
	teamLink: string;
	recipientEmail: string;
}

export const HackathonTeammateJoinedEmail = ({
	eventTitle = "Spring Hackathon",
	communityName = "Tech Community",
	teamName = "Team Uno",
	memberName = "Aysel Mammadova",
	teamCount = "2 of 4",
	teamLink = "https://luhive.com/c/community/event",
	recipientEmail = "captain@example.com",
}: HackathonTeammateJoinedEmailProps) => (
	<EmailLayout preview={`${memberName} joined ${teamName}`}>
		<Eyebrow>Your team</Eyebrow>
		<EmailTitle>{memberName} joined</EmailTitle>
		<Divider />
		<Paragraph>
			{memberName} joined{" "}
			<strong style={{ color: emailColors.heading }}>{teamName}</strong> for {eventTitle},
			hosted by {communityName}. Your team is now {teamCount}.
		</Paragraph>
		<Paragraph>
			When your team is complete, the organizer reviews it together. Everyone gets the
			decision by email.
		</Paragraph>
		<CtaButton href={teamLink}>Open your team →</CtaButton>
		<FinePrint>You're getting this because you're the captain of {teamName}. Sent to {recipientEmail}.</FinePrint>
	</EmailLayout>
);

export default HackathonTeammateJoinedEmail;
