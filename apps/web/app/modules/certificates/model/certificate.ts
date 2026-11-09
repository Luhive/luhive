// Hackathon certificate rules. Pure, no I/O.
// import * as Certificate from "~/modules/certificates/model/certificate"
// Spec: docs/hackathon-certificates.md

export const AWARDS = ["place_1", "place_2", "place_3", "participant"] as const;
export type Award = (typeof AWARDS)[number];

/** What the public page, OG image and profile badge show. No email, no ids beyond `code`. */
export type PublicCertificate = {
  code: string;
  recipientName: string;
  teamName: string;
  award: Award;
  eventTitle: string;
  /** `YYYY-MM-DD`, the event's local date. */
  eventDate: string;
  communityName: string;
  communitySlug: string;
  issuedAt: string;
  updatedAt: string;
};

export type Badge = Pick<PublicCertificate, "code" | "award" | "eventTitle" | "eventDate">;

const LABELS: Record<Award, string> = {
  place_1: "1st Place",
  place_2: "2nd Place",
  place_3: "3rd Place",
  participant: "Participant",
};

/** One accent per award; the design is otherwise identical. */
const ACCENTS: Record<Award, string> = {
  place_1: "#C9962B",
  place_2: "#8A949E",
  place_3: "#B06A35",
  participant: "#FF6D23",
};

export function label(award: Award): string {
  return LABELS[award];
}

export function accent(award: Award): string {
  return ACCENTS[award];
}

export function isAward(value: string): value is Award {
  return (AWARDS as readonly string[]).includes(value);
}

/** Rank 1–3 is a placement; anything else (blank, 4, "HM") is a participant. */
export function awardForRank(rank: number | null): Award {
  if (rank === 1) return "place_1";
  if (rank === 2) return "place_2";
  if (rank === 3) return "place_3";
  return "participant";
}

/** "1", "1st", " 2nd place ", "3." → number; anything else → null. */
export function parseRank(raw: unknown): number | null {
  const match = String(raw ?? "").trim().match(/^(\d+)/);
  return match ? Number(match[1]) : null;
}

/** Sentence used as the certificate's headline: "1st Place at Spring Hackathon". */
export function headline(cert: Pick<PublicCertificate, "award" | "eventTitle">): string {
  return cert.award === "participant"
    ? `Participant in ${cert.eventTitle}`
    : `${label(cert.award)} at ${cert.eventTitle}`;
}

/** "Team Lubot", but "Team Uno" stays as is rather than "Team Team Uno". */
export function teamLabel(teamName: string): string {
  return /^team\b/i.test(teamName.trim()) ? teamName.trim() : `Team ${teamName.trim()}`;
}

/** "12 October 2026". Parsed as a plain date so no timezone shifts the day. */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Display form of the code on the certificate: "abcd-efgh-ij". */
export function displayCode(code: string): string {
  return code.toUpperCase().replace(/(.{4})(.{4})(.+)/, "$1-$2-$3");
}

/** Where a share happened. Also the `channel` of a logged share (event_certificate_events). */
export const SHARE_CHANNELS = ["linkedin_profile", "linkedin_post", "instagram_story", "copy_link", "download"] as const;
export type ShareChannel = (typeof SHARE_CHANNELS)[number];

export function isShareChannel(value: string): value is ShareChannel {
  return (SHARE_CHANNELS as readonly string[]).includes(value);
}

/** The certificate link as it travels: tagged, so visits can be traced to the share. */
export function sharedUrl(pageUrl: string, source: "linkedin" | "instagram" | "copy", content?: string): string {
  const url = new URL(pageUrl);
  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", "certificate");
  if (content) url.searchParams.set("utm_content", content);
  return url.toString();
}

/** Where a visitor came from, for logging a view: the utm_source, else "direct". */
export function visitChannel(utmSource: string | null): string {
  const clean = (utmSource ?? "").toLowerCase().replace(/[^a-z_]/g, "").slice(0, 32);
  return clean || "direct";
}

/**
 * LinkedIn's "Add licence or certification" form, prefilled. It never posts anything.
 * With Luhive's company id the entry shows the Luhive logo and links to its page, so
 * the community moves into the certificate name.
 */
export function linkedInAddToProfileUrl(
  cert: PublicCertificate,
  certificateUrl: string,
  luhiveOrganizationId?: string,
): string {
  const [year, month] = cert.eventDate.split("-").map(Number);
  const params = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: luhiveOrganizationId ? `${headline(cert)} · ${cert.communityName}` : headline(cert),
    issueYear: String(year),
    issueMonth: String(month),
    certUrl: certificateUrl,
    certId: displayCode(cert.code),
  });
  if (luhiveOrganizationId) params.set("organizationId", luhiveOrganizationId);
  else params.set("organizationName", cert.communityName);
  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}

/** LinkedIn's post composer with the caption in it. The person still edits and posts. */
export function linkedInPostUrl(caption: string): string {
  return `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(caption)}`;
}

/** Luhive's LinkedIn company page (linkedin.com/company/108280257). Public, not a secret. */
export const LUHIVE_LINKEDIN_ORGANIZATION_ID = "108280257";
export const LUHIVE_INSTAGRAM = "luhivecom";
export const SHARE_HASHTAG = "#BuiltOnLuhive";

/**
 * A ready LinkedIn caption. LinkedIn won't turn prefilled text into a mention, so
 * it ends on "@Luhive" for the person to pick from the list; the hint says so.
 */
export function postCaption(cert: PublicCertificate, url: string): string {
  const opening =
    cert.award === "participant"
      ? `I took part in ${cert.eventTitle}, hosted by ${cert.communityName}, building with ${teamLabel(cert.teamName)}.`
      : `${teamLabel(cert.teamName)} won ${label(cert.award)} at ${cert.eventTitle}, hosted by ${cert.communityName}!`;
  return [
    opening,
    "Thanks to my teammates and the organizers for a great event.",
    `My certificate: ${url}`,
    `Issued via @Luhive ${SHARE_HASHTAG} #hackathon`,
  ].join("\n\n");
}

/** "@handle" from an Instagram profile URL or a bare handle; null when there isn't one. */
export function instagramHandle(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  const match = raw.match(/instagram\.com\/([A-Za-z0-9._]{1,30})/i) ?? raw.match(/^@?([A-Za-z0-9._]{1,30})$/);
  return match ? `@${match[1].toLowerCase()}` : null;
}

/** File name for the downloaded image: "spring-hackathon-1st-place.png". */
export function imageFileName(cert: Pick<PublicCertificate, "award" | "eventTitle">): string {
  const slug = `${cert.eventTitle} ${label(cert.award)}`
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "certificate"}.png`;
}
