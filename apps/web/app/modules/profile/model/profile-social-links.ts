import type { Json } from "~/shared/models/database.types";

export namespace ProfileLinks {
  export type Id = "x" | "linkedin" | "instagram" | "omicron";
  export type Map = Record<Id, string | null>;

  export const ids: Id[] = ["x", "linkedin", "instagram", "omicron"];

  export const omicronDefaultInstance = "omicron.blog";

  const prefixById: Record<Exclude<Id, "omicron">, string> = {
    x: "x.com/",
    linkedin: "linkedin.com/in/",
    instagram: "instagram.com/",
  };

  /** Pages that show the signed-in person their own handle, for people who don't know it. */
  const findUrlById: Record<Id, string> = {
    x: "https://x.com/settings/screen_name",
    linkedin: "https://www.linkedin.com/in/me/",
    instagram: "https://www.instagram.com/accounts/edit/",
    omicron: `https://${omicronDefaultInstance}/settings?tab=profile`,
  };

  const placeholderById: Record<Id, string> = {
    x: "handle or paste link",
    linkedin: "paste your profile link",
    instagram: "handle or paste link",
    omicron: "handle or paste link",
  };

  const empty: Map = { x: null, linkedin: null, instagram: null, omicron: null };

  /** A bare Omicron handle defaults to omicron.blog; a full `user@instance` keeps its instance. */
  export function prefix(id: Id, value = "") {
    if (id === "omicron") {
      return omicronHasInstance(value) ? "" : `${omicronDefaultInstance}/`;
    }
    return prefixById[id];
  }

  export function findUrl(id: Id, value = "") {
    if (id === "omicron" && omicronHasInstance(value)) {
      const instance = omicronIdentifier(value).split("@")[1];
      if (instance) return `https://${instance}/settings?tab=profile`;
    }
    return findUrlById[id];
  }

  export function placeholder(id: Id) {
    return placeholderById[id];
  }

  export function handle(id: Id, url: string | null) {
    if (!url) return "";
    if (id === "omicron") {
      const identifier = usernameFromPaste(id, url);
      const suffix = `@${omicronDefaultInstance}`;
      return identifier.toLowerCase().endsWith(suffix)
        ? identifier.slice(0, -suffix.length)
        : identifier;
    }
    return usernameFromPaste(id, url);
  }

  /** Keeps a typed handle as-is, and pulls the username out of a pasted profile URL. */
  export function usernameFromPaste(id: Id, pasted: string) {
    const trimmed = pasted.trim();
    if (!trimmed) return "";

    if (id === "omicron") return omicronIdentifier(trimmed);

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
    if (id === "omicron") {
      const identifier = omicronIdentifier(handleValue);
      const match = identifier.match(/^([^@\s/]+)@([^@\s/]+\.[^@\s/]+)$/);
      if (!match) return null;
      return normalizeUrl(`https://${match[2]}/@${match[1]}`);
    }

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

  /** Reads an Omicron handle or profile URL as `username@instance`, defaulting the instance. */
  function omicronIdentifier(input: string) {
    const trimmed = input.trim();
    if (!trimmed) return "";

    const withoutAt = trimmed.replace(/^[@/]+/, "");
    const looksLikeAddress = /^(https?:\/\/|www\.)/i.test(trimmed) || withoutAt.includes("/");

    if (looksLikeAddress) {
      const href = /^https?:\/\//i.test(withoutAt) ? withoutAt : `https://${withoutAt}`;
      try {
        const url = new URL(href);
        const firstPart = url.pathname.split("/").filter(Boolean)[0] ?? "";
        const candidate = decodeURIComponent(firstPart).replace(/^@/, "");
        if (!candidate) return "";
        const [username, instance] = candidate.split("@");
        if (username && instance && isOmicronInstance(instance)) {
          return `${username}@${instance.toLowerCase()}`;
        }
        return `${candidate}@${normalizeHost(url.hostname)}`;
      } catch {
        return withoutAt;
      }
    }

    const match = withoutAt.match(/^([^@\s/]+)@([^@\s/]+\.[^@\s/]+)$/);
    if (match) return `${match[1]}@${match[2].toLowerCase()}`;

    if (/^[^@\s/]+$/.test(withoutAt)) {
      return `${withoutAt}@${omicronDefaultInstance}`;
    }
    return withoutAt;
  }

  function omicronHasInstance(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return false;
    const withoutAt = trimmed.replace(/^[@/]+/, "");
    return /^(https?:\/\/|www\.)/i.test(trimmed) || withoutAt.includes("/") || withoutAt.includes("@");
  }

  function isOmicronInstance(value: string) {
    return /^[^@\s/]+\.[^@\s/]+$/.test(value);
  }

  function normalizeHost(value: string) {
    return value.toLowerCase().replace(/^www\./, "");
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
