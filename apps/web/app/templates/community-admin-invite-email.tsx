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

interface CommunityAdminInviteEmailProps {
	communityName: string;
	inviterName: string;
	recipientEmail: string;
	acceptLink: string;
}

export const CommunityAdminInviteEmail = ({
	communityName = "Tech Community",
	inviterName = "Ali Aliyev",
	recipientEmail = "partner@example.com",
	acceptLink = "https://luhive.com/c/community/admin-invite/id",
}: CommunityAdminInviteEmailProps) => (
	<EmailLayout preview={`${inviterName} invited you to be an admin of ${communityName}`}>
		<Eyebrow>Admin invite</Eyebrow>
		<EmailTitle>{communityName}</EmailTitle>
		<Divider />
		<Paragraph>
			Hi, {inviterName} invited you to be an admin of{" "}
			<strong style={{ color: emailColors.heading }}>{communityName}</strong> on
			Luhive.
		</Paragraph>
		<Paragraph>
			As an admin you can open the community dashboard and follow its members,
			events, and statistics. You'll confirm this email address with a one-time
			code.
		</Paragraph>
		<CtaButton href={acceptLink}>Accept invite →</CtaButton>
		<FinePrint>This invitation was sent to {recipientEmail}.</FinePrint>
	</EmailLayout>
);

export default CommunityAdminInviteEmail;
