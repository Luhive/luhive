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

interface HackathonRemovedFromTeamEmailProps {
	eventTitle: string;
	communityName: string;
	teamName: string;
	recipientName: string;
	eventLink: string;
	recipientEmail: string;
}

export const HackathonRemovedFromTeamEmail = ({
	eventTitle = "Spring Hackathon",
	communityName = "Tech Community",
	teamName = "Team Uno",
	recipientName = "there",
	eventLink = "https://luhive.com/c/community/event",
	recipientEmail = "guest@example.com",
}: HackathonRemovedFromTeamEmailProps) => (
	<EmailLayout preview={`You're no longer on ${teamName}`}>
		<Eyebrow>Team update</Eyebrow>
		<EmailTitle>You're no longer on {teamName}</EmailTitle>
		<Divider />
		<Paragraph>
			Hi {recipientName}, you were removed from{" "}
			<strong style={{ color: emailColors.heading }}>{teamName}</strong> for {eventTitle},
			hosted by {communityName}. Your registration for the event was cancelled with it.
		</Paragraph>
		<Paragraph>
			You can still take part: register again to join another team with its join link, or
			start your own team.
		</Paragraph>
		<CtaButton href={eventLink}>Register again →</CtaButton>
		<FinePrint>This email was sent to {recipientEmail}.</FinePrint>
	</EmailLayout>
);

export default HackathonRemovedFromTeamEmail;
