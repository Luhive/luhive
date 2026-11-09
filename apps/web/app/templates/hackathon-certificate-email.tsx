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

// Azerbaijani, casual "sən": the hackathons that issue certificates are run for young,
// Azerbaijani-speaking participants.

interface HackathonCertificateEmailProps {
	eventTitle: string;
	communityName: string;
	teamName: string;
	recipientName: string;
	/** 1, 2 or 3 for a placement; null for a participant. */
	place: number | null;
	certificateLink: string;
	recipientEmail: string;
}

/** "1-ci", "2-ci", "3-cü": the Azerbaijani ordinal suffix follows the number's vowel. */
function ordinal(place: number): string {
	return `${place}-${place === 3 ? "cü" : "ci"}`;
}

export const HackathonCertificateEmail = ({
	eventTitle = "Spring Hackathon",
	communityName = "Tech Community",
	teamName = "Team Uno",
	recipientName = "Aysel Məmmədova",
	place = 1,
	certificateLink = "https://luhive.com/certificate/abcd1234ef",
	recipientEmail = "aysel@example.com",
}: HackathonCertificateEmailProps) => {
	const team = <strong style={{ color: emailColors.heading }}>{teamName}</strong>;
	return (
		<EmailLayout preview="Adına yazılıb, paylaşmağa hazırdır">
			<Eyebrow>{eventTitle}</Eyebrow>
			<EmailTitle>{place ? `Halal olsun, ${recipientName}!` : `Əla iş idi, ${recipientName}!`}</EmailTitle>
			<Divider />
			<Paragraph>
				{place ? (
					<>
						Komandan {team} «{eventTitle}» yarışında {ordinal(place)} yeri götürdü. Bu, ciddi nəticədir!
					</>
				) : (
					<>
						{team} ilə «{eventTitle}» yarışında qurduğun hər şey üçün sağ ol. İdeyadan demoya qədər
						keçdiyin yol əsl təcrübədir.
					</>
				)}{" "}
				Sertifikatın hazırdır, özü də adına yazılıb.
			</Paragraph>
			<Paragraph>
				LinkedIn profilinə bir kliklə əlavə et, ya da Instagram story-də paylaş və{" "}
				<strong style={{ color: emailColors.heading }}>@luhivecom</strong>-u tag et, hamısını repost
				edəcəyik. Sertifikat Luhive profilində də nişan kimi görünür.
			</Paragraph>
			<CtaButton href={certificateLink}>Sertifikatı aç →</CtaButton>
			<FinePrint>
				Adın səhv yazılıb? Luhive profilində düzəlt və bu məktuba cavab yaz, dərhal yeniləyərik.
				Tədbiri {communityName} təşkil edib. Linki olan hər kəs adını, komandanı və nəticəni görə
				bilər. Bu məktub {recipientEmail} ünvanına göndərildi.
			</FinePrint>
		</EmailLayout>
	);
};

export default HackathonCertificateEmail;
