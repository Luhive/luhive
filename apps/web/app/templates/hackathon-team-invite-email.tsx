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

interface HackathonTeamInviteEmailProps {
	eventTitle: string;
	communityName: string;
	teamName: string;
	recipientEmail: string;
	joinLink: string;
	captainName: string;
	eventDate: string;
	eventTime: string;
}

export const HackathonTeamInviteEmail = ({
	eventTitle = "Spring Hackathon",
	communityName = "Tech Community",
	teamName = "Team Uno",
	recipientEmail = "guest@example.com",
	joinLink = "https://luhive.com/c/community/event/join/code",
	captainName = "Ali Aliyev",
	eventDate = "Friday, January 1, 2026",
	eventTime = "6:00 PM UTC",
}: HackathonTeamInviteEmailProps) => {
	const rows: DetailRowData[] = [
		{ label: "Team", value: teamName },
		{ label: "Captain", value: captainName },
		{ label: "Date", value: eventDate },
		{ label: "Time", value: eventTime },
		{ label: "Host", value: communityName },
	];

	return (
		<EmailLayout preview={`${captainName} added you to ${teamName} for ${eventTitle}`}>
			<Eyebrow>Join your team</Eyebrow>
			<EmailTitle>{teamName}</EmailTitle>
			<Divider />
			<Paragraph>
				Hi, {captainName} added you to{" "}
				<strong style={{ color: emailColors.heading }}>{teamName}</strong> for{" "}
				{eventTitle}, hosted by {communityName}.
			</Paragraph>
			<Paragraph>
				Confirm your spot. It takes about a minute: confirm your email and add
				your LinkedIn. The organizer reviews the whole team together.
			</Paragraph>
			<SectionLabel>Details</SectionLabel>
			<DetailsCard rows={rows} />
			<CtaButton href={joinLink}>Join {teamName} →</CtaButton>
			<FinePrint>This invitation was sent to {recipientEmail}.</FinePrint>
		</EmailLayout>
	);
};

export default HackathonTeamInviteEmail;
