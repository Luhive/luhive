import type { Community } from "~/modules/hub/model/hub-types";

const SAMPLES = [
  {
    name: "Reading Rhythms Baku",
    description: "Not a book club. A reading party. Read with friends to live music and curated playlists.",
    verified: true,
    memberCount: 1240,
  },
  {
    name: "GDG Baku",
    description: "Google Developer Group for Android, web and cloud builders. Monthly talks and study jams.",
    verified: true,
    memberCount: 3180,
  },
  {
    name: "Women in Tech Azerbaijan",
    description: "Mentorship, meetups and hiring circles for women building careers in tech.",
    verified: false,
    memberCount: 860,
  },
  {
    name: "Baku Product Club",
    description: "Product managers trading notes on discovery, metrics and shipping in small markets.",
    verified: false,
    memberCount: 412,
  },
  {
    name: "Startup Grind Baku",
    description: "Fireside chats with founders and investors, every last Thursday of the month.",
    verified: true,
    memberCount: 2050,
  },
  {
    name: "Design Circle",
    description: "Critiques, portfolio reviews and coffee for product and brand designers.",
    verified: false,
    memberCount: 297,
  },
];

/**
 * Pads the live list so the variants can be judged at a realistic size. Samples
 * have no logo and link to a real community so no card is a dead end.
 */
export function withSampleCommunities(communities: Community[]): Community[] {
  const fallbackSlug = communities[0]?.slug ?? "";
  const samples = SAMPLES.map(
    (sample, index) =>
      ({
        id: `sample-${index}`,
        slug: fallbackSlug,
        name: sample.name,
        description: sample.description,
        tagline: null,
        logo_url: null,
        verified: sample.verified,
        isAdmin: false,
        memberCount: sample.memberCount,
        eventCount: 0,
      }) as unknown as Community,
  );
  return [...communities, ...samples];
}

export function formatMemberCount(count: number) {
  if (count >= 1000) return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}K members`;
  return count === 1 ? "1 member" : `${count} members`;
}
