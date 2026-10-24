export type TextLink = {
  href: string;
  label: string;
};

const LINK_PATTERN =
  /(?:https?:\/\/|www\.)[^\s<]+|(?<![@\w./])(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s<]*)?/gi;

const TRAILING_PUNCTUATION = /[.,!?;:)]+$/;

/** Turns written addresses into links. The label stays as typed, without a scheme. */
export function linkifyText(value: string): Array<string | TextLink> {
  const parts: Array<string | TextLink> = [];
  let cursor = 0;

  for (const match of value.matchAll(LINK_PATTERN)) {
    const start = match.index ?? 0;
    const raw = match[0];
    const written = raw.replace(TRAILING_PUNCTUATION, "");
    const trailing = raw.slice(written.length);
    if (!written) continue;

    if (start > cursor) parts.push(value.slice(cursor, start));
    parts.push({ href: toLinkHref(written), label: written.replace(/^https?:\/\//i, "") });
    if (trailing) parts.push(trailing);
    cursor = start + raw.length;
  }

  if (cursor < value.length) parts.push(value.slice(cursor));
  return parts;
}

function toLinkHref(written: string) {
  if (/^https?:\/\//i.test(written)) return written;
  return `https://${written}`;
}
