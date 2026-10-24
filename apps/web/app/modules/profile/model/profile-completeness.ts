import type { Json } from "~/shared/models/database.types";
import { ProfileLinks } from "~/modules/profile/model/profile-social-links";

/** The four fields `analytics.profile_completeness` counts, checked the same way here. */
export namespace ProfileCompleteness {
  export type Step = "name" | "avatar" | "bio" | "social";

  export const badge = "profile_complete";
  export const points = 50;

  const nextLabel: Record<Step, string> = {
    name: "Add your name",
    avatar: "Add a photo",
    bio: "Add a one-line bio",
    social: "Link one social profile",
  };

  /** Why the next step is worth doing, shown under the progress title. */
  const nextReason: Record<Step, string> = {
    name: "So people recognise you on event pages and in introductions.",
    avatar: "A face makes it easier for people you met to find you again.",
    bio: "Helps us introduce you to the right people after events.",
    social: "People you meet at events will be able to reach you.",
  };

  type Fields = {
    fullName: string | null | undefined;
    avatarUrl: string | null | undefined;
    bio: string | null | undefined;
    links: ProfileLinks.Map;
  };

  export function check({ fullName, avatarUrl, bio, links }: Fields) {
    const filled: Record<Step, boolean> = {
      name: Boolean(fullName?.trim()),
      avatar: Boolean(avatarUrl),
      bio: Boolean(bio?.trim()),
      social: ProfileLinks.ids.some((id) => links[id]),
    };
    const steps = Object.keys(filled) as Step[];
    const done = steps.filter((step) => filled[step]).length;
    const next = steps.find((step) => !filled[step]) ?? null;

    return {
      done,
      total: steps.length,
      percent: Math.round((done / steps.length) * 100),
      complete: next === null,
      next,
      nextLabel: next ? nextLabel[next] : null,
      nextReason: next ? nextReason[next] : null,
    };
  }

  export function hasBadge(gamification: Json | null | undefined) {
    return readBadges(gamification).includes(badge);
  }

  /** Adds the badge and its points once; later saves leave the record untouched. */
  export function award(gamification: Json | null | undefined): Json {
    const record = asRecord(gamification) ?? {};
    const badges = readBadges(gamification);
    if (badges.includes(badge)) return record;

    const current = typeof record.points === "number" ? record.points : 0;
    return { ...record, badges: [...badges, badge], points: current + points };
  }

  function readBadges(gamification: Json | null | undefined): string[] {
    const badges = asRecord(gamification)?.badges;
    return Array.isArray(badges) ? badges.filter((item): item is string => typeof item === "string") : [];
  }

  function asRecord(value: Json | null | undefined): Record<string, Json | undefined> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value;
  }
}
