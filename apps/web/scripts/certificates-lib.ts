// Shared by certificates-match.ts and certificates-issue.ts. Spec: docs/hackathon-certificates.md
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createNodeClient, sql, type NodeClient } from "@luhive/db/node";
import { fail } from "./test-env";

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function readEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const values: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match) values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return values;
}

/** Validation by default, like `pnpm test-db`; `--prod` is for people, never agents. */
export function openDb(prod: boolean): NodeClient {
  const name = prod ? "PRODUCTION_DATABASE_URL" : "VALIDATION_DATABASE_URL";
  const url = readEnvFile(resolve(appDir, "../../packages/db/.env"))[name];
  if (!url) fail(`${name} is missing in packages/db/.env`);
  console.error(prod ? "— production database" : "— validation database");
  return createNodeClient({ connectionString: url, max: 2 });
}

/** The app's env, for sending emails: .env.production with --prod, the dev files otherwise. */
export function loadAppEnv(prod: boolean) {
  const files = prod ? [".env.production"] : [".env.development", ".env.development.local"];
  for (const file of files) Object.assign(process.env, readEnvFile(resolve(appDir, file)));
}

export type HackathonEvent = { id: string; title: string; community_slug: string };

export async function findHackathon(db: NodeClient, slug: string): Promise<HackathonEvent> {
  const { rows } = await sql<HackathonEvent>`
    select e.id, e.title, c.slug as community_slug
    from events e join communities c on c.id = e.community_id
    where e.slug = ${slug} and e.is_hackathon`.execute(db);
  if (rows.length === 0) fail(`No hackathon with slug "${slug}".`);
  if (rows.length > 1) fail(`Slug "${slug}" matches ${rows.length} hackathons; ask for a --community flag.`);
  return rows[0];
}

/** Case, accents, punctuation and spacing don't count: "Team  Uno!" = "team uno". */
export function normalizeName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Dice coefficient on letter pairs, 0–1. Good enough to suggest, never to decide. */
export function similarity(a: string, b: string): number {
  const pairs = (s: string) => {
    const out = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const pair = s.slice(i, i + 2);
      out.set(pair, (out.get(pair) ?? 0) + 1);
    }
    return out;
  };
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const left = pairs(a);
  const right = pairs(b);
  let shared = 0;
  for (const [pair, count] of left) shared += Math.min(count, right.get(pair) ?? 0);
  return (2 * shared) / (a.length - 1 + (b.length - 1));
}

// --- CSV (RFC 4180 enough for names with commas and quotes) ---

export function writeCsv(path: string, header: string[], rows: Record<string, string | number>[]) {
  const cell = (value: string | number) => {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [header.join(","), ...rows.map((row) => header.map((key) => cell(row[key] ?? "")).join(","))];
  writeFileSync(path, `${lines.join("\n")}\n`);
}

export function readCsv(path: string): Record<string, string>[] {
  if (!existsSync(path)) fail(`${path} not found.`);
  const text = readFileSync(path, "utf8").replace(/^﻿/, "");
  const records: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') (field += '"'), i++;
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") row.push(field), (field = "");
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      records.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field || row.length) row.push(field), records.push(row);
  const [header, ...body] = records.filter((r) => r.some((c) => c.trim() !== ""));
  if (!header) fail(`${path} is empty.`);
  return body.map((cells) => Object.fromEntries(header.map((key, i) => [key.trim(), (cells[i] ?? "").trim()])));
}
