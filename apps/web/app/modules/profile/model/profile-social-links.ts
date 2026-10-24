import type { Json } from "~/shared/models/database.types";

export namespace ProfileLinks {
  export type Id = "x" | "linkedin" | "instagram";
  export type Map = Record<Id, string | null>;

  export const ids: Id[] = ["x", "linkedin", "instagram"];

  const prefixById: Record<Id, string> = {
    x: "x.com/",
    linkedin: "linkedin.com/in/",
    instagram: "instagram.com/",
  };

  /** Pages that show the signed-in person their own handle, for people who don't know it. */
  const findUrlById: Record<Id, string> = {
    x: "https://x.com/settings/screen_name",
    linkedin: "https://www.linkedin.com/in/me/",
    instagram: "https://www.instagram.com/accounts/edit/",
  };

  const placeholderById: Record<Id, string> = {
    x: "handle or paste link",
    linkedin: "paste your profile link",
    instagram: "handle or paste link",
  };

  const empty: Map = { x: null, linkedin: null, instagram: null };

  export function prefix(id: Id) {
    return prefixById[id];
  }

  export function findUrl(id: Id) {
    return findUrlById[id];
  }

  export function placeholder(id: Id) {
    return placeholderById[id];
  }

  export function handle(id: Id, url: string | null) {
    if (!url) return "";
    return usernameFromPaste(id, url);
  }

  /** Keeps a typed handle as-is, and pulls the username out of a pasted profile URL. */
  export function usernameFromPaste(id: Id, pasted: string) {
    const trimmed = pasted.trim();
    if (!trimmed) return "";

    const withoutAt = trimmed.replace(/^@/, "");
    const looksLikeAddress = /^(https?:\/\/|www\.)/i.test(trimmed) || withoutAt.includes("/");
    if (!looksLikeAddress) return withoutAt;

    const href = /^https?:\/\//i.test(withoutAt) ? withoutAt : `https://${withoutAt}`;
    try {
      const url = new URL(href);
      const parts = url.pathname
        .split("/")
        .filter(Boolean)
        .map((part) => decodeURIComponent(part));

      if (id === "linkedin") {
        const marker = parts.findIndex((part) => part.toLowerCase() === "in");
        return marker >= 0 ? (parts[marker + 1] ?? "") : (parts.at(-1) ?? "");
      }

      const reserved = new Set(["p", "reel", "reels", "stories", "share"]);
      const username = parts.find((part) => !reserved.has(part.toLowerCase()));
      return (username ?? "").replace(/^@/, "");
    } catch {
      return withoutAt;
    }
  }

  export function url(id: Id, handleValue: string) {
    const trimmed = handleValue.trim().replace(/^@/, "").replace(/^\//, "");
    if (!trimmed) return null;
    const username = usernameFromPaste(id, trimmed);
    if (!username) return null;
    return normalizeUrl(`${prefixById[id]}${username}`);
  }

  export function read(metadata: Json | null | undefined): Map {
    const record = asRecord(metadata);
    const socials = asRecord(record?.social_links);
    if (!socials) return { ...empty };

    const links = { ...empty };
    for (const id of ids) {
      const value = socials[id];
      links[id] = typeof value === "string" && value.length > 0 ? value : null;
    }
    return links;
  }

  function normalizeUrl(value: string) {
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    try {
      const parsed = new URL(withProtocol);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
      return parsed.toString();
    } catch {
      return null;
    }
  }

  function asRecord(value: Json | null | undefined): Record<string, Json | undefined> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value;
  }
}
