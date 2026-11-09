// Matches the organizer's rankings Excel to Luhive teams. Writes a review CSV and
// nothing else: no database writes. Spec: docs/hackathon-certificates.md
//
//   pnpm certificates:match rankings.xlsx --event <slug>
//   pnpm certificates:match rankings.xlsx --event <slug> --prod
//
// Flags: --sheet <name>        sheet to read (default: the first)
//        --team-col <header>   column holding the team name (default: a header with "team")
//        --rank-col <header>   column holding the rank (default: a header with rank/place/position)
//        --out <path>          default certificates-review.csv
//
// Then edit the CSV: every `review` / `unmatched` row becomes `matched` (with a
// team_id) or `skip`, and run certificates-issue.ts on it.
import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import { sql } from "@luhive/db/node";
import * as Certificate from "../app/modules/certificates/model/certificate";
import { fail, readFlags } from "./test-env";
import { findHackathon, normalizeName, openDb, similarity, writeCsv } from "./certificates-lib";

const SUGGEST_AT = 0.55;
const REVIEW_COLUMNS = [
  "excel_rows",
  "excel_team",
  "rank",
  "award",
  "status",
  "team_id",
  "luhive_team",
  "members",
  "note",
];

type LuhiveTeam = { id: string; name: string; members: number; captain: string | null };

const { positional, flags } = readFlags(process.argv.slice(2));
const [excelPath] = positional;
const eventSlug = typeof flags.event === "string" ? flags.event : undefined;
if (!excelPath || !eventSlug) fail("Usage: pnpm certificates:match <rankings.xlsx> --event <slug> [--prod]");

function pickColumn(headers: string[], flag: string | true | undefined, pattern: RegExp, what: string): string {
  if (typeof flag === "string") {
    if (!headers.includes(flag)) fail(`No column "${flag}". Columns: ${headers.join(" | ")}`);
    return flag;
  }
  const found = headers.filter((h) => pattern.test(h));
  if (found.length !== 1) {
    fail(`Can't tell which column is the ${what} (${found.length} candidates). Pass --${what}-col. Columns: ${headers.join(" | ")}`);
  }
  return found[0];
}

function readExcel() {
  // XLSX.read, not readFile: the ESM build has no fs access.
  const book = XLSX.read(readFileSync(excelPath));
  const sheetName = typeof flags.sheet === "string" ? flags.sheet : book.SheetNames[0];
  const sheet = book.Sheets[sheetName];
  if (!sheet) fail(`No sheet "${sheetName}". Sheets: ${book.SheetNames.join(" | ")}`);
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const headers = Object.keys(rows[0] ?? {});
  const teamCol = pickColumn(headers, flags["team-col"], /team|komanda/i, "team");
  const rankCol = pickColumn(headers, flags["rank-col"], /rank|place|position|yer/i, "rank");

  // One entry per team; a per-person sheet collapses into its teams. Excel row 1 is the header.
  const teams = new Map<string, { name: string; rank: number | null; rows: number[] }>();
  rows.forEach((row, index) => {
    const name = String(row[teamCol] ?? "").trim();
    if (!name) return;
    const key = normalizeName(name);
    const rank = Certificate.parseRank(row[rankCol]);
    const entry = teams.get(key) ?? { name, rank: null, rows: [] };
    entry.rows.push(index + 2);
    if (rank !== null) entry.rank = entry.rank === null ? rank : Math.min(entry.rank, rank);
    teams.set(key, entry);
  });
  return [...teams.values()];
}

async function main() {
  const excelTeams = readExcel();
  const db = openDb(flags.prod === true);
  try {
    const event = await findHackathon(db, eventSlug!);
    const { rows: luhiveTeams } = await sql<LuhiveTeam>`
      select t.id, t.name, count(m.id)::int as members,
        max(coalesce(p.full_name, r.anonymous_name)) filter (where m.role = 'captain') as captain
      from event_teams t
      left join event_team_members m on m.team_id = t.id
      left join event_registrations r on r.id = m.registration_id
      left join profiles p on p.id = r.user_id
      where t.event_id = ${event.id}
      group by t.id, t.name
      order by t.name`.execute(db);

    const byName = new Map<string, LuhiveTeam[]>();
    for (const team of luhiveTeams) {
      const key = normalizeName(team.name);
      byName.set(key, [...(byName.get(key) ?? []), team]);
    }
    const describe = (t: LuhiveTeam) => `${t.name} [${t.id}] ${t.members} members, captain ${t.captain ?? "?"}`;

    const out = excelTeams.map((excel) => {
      const base = {
        excel_rows: excel.rows.join(" "),
        excel_team: excel.name,
        rank: excel.rank ?? "",
        award: Certificate.label(Certificate.awardForRank(excel.rank)),
      };
      const exact = byName.get(normalizeName(excel.name)) ?? [];
      if (exact.length === 1) {
        const [team] = exact;
        return { ...base, status: "matched", team_id: team.id, luhive_team: team.name, members: team.members, note: "" };
      }
      const candidates =
        exact.length > 1
          ? exact
          : luhiveTeams
              .map((team) => ({ team, score: similarity(normalizeName(excel.name), normalizeName(team.name)) }))
              .filter(({ score }) => score >= SUGGEST_AT)
              .sort((a, b) => b.score - a.score)
              .slice(0, 3)
              .map(({ team }) => team);
      return {
        ...base,
        status: candidates.length ? "review" : "unmatched",
        team_id: "",
        luhive_team: "",
        members: "",
        note: candidates.length ? `Maybe: ${candidates.map(describe).join(" | ")}` : "No similar Luhive team",
      };
    });

    // Two Excel teams on one Luhive team would give someone two certificates.
    const claimed = new Map<string, string>();
    for (const row of out) {
      if (!row.team_id) continue;
      const other = claimed.get(row.team_id);
      if (other) {
        row.status = "review";
        row.note = `Same Luhive team as Excel "${other}"`;
      } else claimed.set(row.team_id, row.excel_team);
    }

    const path = typeof flags.out === "string" ? flags.out : "certificates-review.csv";
    writeCsv(path, REVIEW_COLUMNS, out);

    const count = (status: string) => out.filter((r) => r.status === status).length;
    console.log(`${event.title}: ${excelTeams.length} Excel teams, ${luhiveTeams.length} Luhive teams`);
    console.log(`  matched ${count("matched")} · review ${count("review")} · unmatched ${count("unmatched")}`);
    for (const award of Certificate.AWARDS) {
      const label = Certificate.label(award);
      const teams = out.filter((r) => r.award === label);
      if (award !== "participant" && teams.length !== 1) {
        console.log(`  ! ${teams.length} teams ranked ${label}${teams.length > 1 ? " (tie?)" : ""}`);
      }
    }
    const notInExcel = luhiveTeams.filter((t) => !claimed.has(t.id));
    if (notInExcel.length) {
      console.log(`  ${notInExcel.length} Luhive teams are not in the Excel and get no certificate:`);
      for (const team of notInExcel) console.log(`    - ${describe(team)}`);
    }
    console.log(`Wrote ${path}`);
  } finally {
    await db.destroy();
  }
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
