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

// Azerbaijani: the hackathons that issue certificates are run for Azerbaijani-speaking
// participants.

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
		<EmailLayout preview={`${eventTitle}: sertifikatınız hazırdır`}>
			<Eyebrow>{eventTitle}</Eyebrow>
			<EmailTitle>{place ? `Təbriklər, ${recipientName}!` : `Təşəkkürlər, ${recipientName}!`}</EmailTitle>
			<Divider />
			<Paragraph>
				{place ? (
					<>
						Komandanız {team} «{eventTitle}» yarışında {ordinal(place)} yeri tutdu.
					</>
				) : (
					<>
						{team} komandası ilə «{eventTitle}» yarışında iştirak etdiyiniz üçün təşəkkür edirik.
					</>
				)}{" "}
				Tədbiri {communityName} təşkil edib. Adınıza yazılmış sertifikatınız hazırdır.
			</Paragraph>
			<Paragraph>
				Onu bir kliklə LinkedIn profilinizə əlavə edin və ya Instagram story-də paylaşıb{" "}
				<strong style={{ color: emailColors.heading }}>@luhivecom</strong>-u tag edin, hamısını repost
				edirik. Sertifikat Luhive profilinizdə nişan kimi də görünür.
			</Paragraph>
			<CtaButton href={certificateLink}>Sertifikatıma bax →</CtaButton>
			<FinePrint>
				Adınız səhv yazılıb? Luhive profilinizdə düzəldin və bu məktuba cavab yazın, sertifikatı
				yeniləyəcəyik. Linki olan hər kəs adınızı, komandanızı və nəticənizi görə bilər. Bu məktub{" "}
				{recipientEmail} ünvanına göndərildi.
			</FinePrint>
		</EmailLayout>
	);
};

export default HackathonCertificateEmail;
