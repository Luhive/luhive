// Issues certificates from a reviewed certificates-review.csv. Safe to re-run: one
// certificate per registration per event, existing codes stay, emails go once.
// Spec: docs/hackathon-certificates.md
//
//   pnpm certificates:issue certificates-review.csv --event <slug> --dry-run
//   pnpm certificates:issue certificates-review.csv --event <slug>
//   pnpm certificates:issue certificates-review.csv --event <slug> --send
//
// Validation by default; --prod for production (people only, never agents).
// --dry-run prints every name and award and writes nothing.
// --send also emails everyone whose certificate hasn't been emailed yet.
import { randomInt } from "node:crypto";
import { sql, type NodeClient } from "@luhive/db/node";
import * as Certificate from "../app/modules/certificates/model/certificate";
import { fail, readFlags } from "./test-env";
import { findHackathon, loadAppEnv, openDb, readCsv, tidyName } from "./certificates-lib";

const CODE_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"; // no 0/o, 1/l
const SEND_GAP_MS = 600; // stays under Resend's per-second limit

type Recipient = {
  registration_id: string;
  team_id: string;
  team_name: string;
  user_id: string | null;
  name: string | null;
  email: string | null;
  approval_status: string | null;
};

const { positional, flags } = readFlags(process.argv.slice(2));
const [csvPath] = positional;
const eventSlug = typeof flags.event === "string" ? flags.event : undefined;
const prod = flags.prod === true;
if (!csvPath || !eventSlug) {
  fail("Usage: pnpm certificates:issue <certificates-review.csv> --event <slug> [--dry-run] [--send] [--prod]");
}

function newCode(): string {
  return Array.from({ length: 10 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
}

/** Reviewed rows → award per team id. Refuses anything still undecided. */
function readDecisions(): Map<string, Certificate.Award> {
  const rows = readCsv(csvPath);
  const open = rows.filter((r) => r.status !== "matched" && r.status !== "skip");
  if (open.length) {
    fail(
      `Decide these rows first (status matched + team_id, or skip):\n${open
        .map((r) => `  rows ${r.excel_rows}: "${r.excel_team}" is ${r.status || "blank"}`)
        .join("\n")}`,
    );
  }
  const awards = new Map<string, Certificate.Award>();
  for (const row of rows.filter((r) => r.status === "matched")) {
    if (!row.team_id) fail(`Rows ${row.excel_rows}: "${row.excel_team}" is matched but has no team_id.`);
    if (awards.has(row.team_id)) fail(`Team ${row.team_id} appears twice in the CSV.`);
    awards.set(row.team_id, Certificate.awardForRank(Certificate.parseRank(row.rank)));
  }
  if (awards.size === 0) fail("No matched rows.");
  return awards;
}

async function loadRecipients(db: NodeClient, eventId: string, teamIds: string[]): Promise<Recipient[]> {
  const { rows } = await sql<Recipient & { event_id: string }>`
    select m.registration_id, t.id as team_id, t.name as team_name, t.event_id, r.user_id,
      nullif(btrim(coalesce(p.full_name, r.anonymous_name)), '') as name,
      lower(btrim(coalesce(u.email, r.anonymous_email))) as email,
      r.approval_status::text as approval_status
    from event_team_members m
    join event_teams t on t.id = m.team_id
    join event_registrations r on r.id = m.registration_id
    left join profiles p on p.id = r.user_id
    left join auth.users u on u.id = r.user_id
    where t.id = any(${teamIds}::uuid[])
    order by t.name, m.role, name`.execute(db);

  const foreign = rows.filter((r) => r.event_id !== eventId);
  if (foreign.length) fail(`team_id ${foreign[0].team_id} belongs to another event.`);
  const found = new Set(rows.map((r) => r.team_id));
  const missing = teamIds.filter((id) => !found.has(id));
  if (missing.length) fail(`No members found for team_id ${missing.join(", ")} (wrong id, or the team was deleted).`);
  const incomplete = rows.filter((r) => !r.name || !r.email);
  if (incomplete.length) {
    fail(`Missing name or email, fix these registrations first:\n${incomplete
      .map((r) => `  ${r.team_name}: registration ${r.registration_id}`)
      .join("\n")}`);
  }
  return rows.map((r) => ({ ...r, name: tidyName(r.name!) }));
}

function printPlan(recipients: Recipient[], awards: Map<string, Certificate.Award>) {
  for (const award of Certificate.AWARDS) {
    const people = recipients.filter((r) => awards.get(r.team_id) === award);
    if (!people.length) continue;
    console.log(`\n${Certificate.label(award)}: ${people.length}`);
    for (const p of people) {
      const flag = p.approval_status === "approved" ? "" : `  ! ${p.approval_status ?? "no status"}`;
      const account = p.user_id ? "" : "  (no account)";
      console.log(`  ${p.team_name.padEnd(28)} ${p.name}${account}${flag}`);
    }
  }
}

async function issue(db: NodeClient, eventId: string, recipients: Recipient[], awards: Map<string, Certificate.Award>) {
  await db.transaction().execute(async (trx) => {
    for (const r of recipients) {
      // The code is set on first insert only; a re-run updates text and keeps the link.
      await sql`
        insert into event_certificates (
          code, event_id, registration_id, user_id, recipient_email, recipient_name, team_name, award,
          event_title, event_date, community_name, community_slug)
        select ${newCode()}, e.id, ${r.registration_id}, ${r.user_id}, ${r.email}, ${r.name}, ${r.team_name},
          ${awards.get(r.team_id)}, e.title, (e.start_time at time zone coalesce(e.timezone, 'UTC'))::date,
          c.name, c.slug
        from events e join communities c on c.id = e.community_id
        where e.id = ${eventId}
        on conflict (event_id, registration_id) do update set
          user_id = coalesce(excluded.user_id, event_certificates.user_id),
          recipient_email = excluded.recipient_email,
          recipient_name = excluded.recipient_name,
          team_name = excluded.team_name,
          award = excluded.award,
          event_title = excluded.event_title,
          event_date = excluded.event_date,
          community_name = excluded.community_name,
          community_slug = excluded.community_slug,
          updated_at = now()
        where (event_certificates.recipient_name, event_certificates.team_name, event_certificates.award,
               event_certificates.event_title, event_certificates.community_name, event_certificates.recipient_email)
          is distinct from
              (excluded.recipient_name, excluded.team_name, excluded.award,
               excluded.event_title, excluded.community_name, excluded.recipient_email)`.execute(trx);
    }
  });

  const { rows } = await sql<{ total: number; stale: number }>`
    select count(*)::int as total,
      count(*) filter (where registration_id is null or registration_id <> all(${recipients.map((r) => r.registration_id)}::uuid[]))::int as stale
    from event_certificates where event_id = ${eventId} and revoked_at is null`.execute(db);
  console.log(`\nIssued. ${rows[0].total} live certificates for this event.`);
  if (rows[0].stale) {
    console.log(`! ${rows[0].stale} live certificates are not in this CSV. Revoke by hand if they shouldn't exist.`);
  }
}

async function send(db: NodeClient, eventId: string) {
  loadAppEnv(prod);
  const { sendHackathonCertificateEmail } = await import("../app/shared/lib/email.server");
  const CertificateOwner = await import("../app/modules/certificates/server/certificate-owner.server");
  const origin = (process.env.APP_URL ?? "https://luhive.com").replace(/\/$/, "");

  const { rows } = await sql<{
    id: string;
    code: string;
    recipient_email: string;
    recipient_name: string;
    team_name: string;
    award: Certificate.Award;
    event_title: string;
    community_name: string;
  }>`
    select id, code, recipient_email, recipient_name, team_name, award, event_title, community_name
    from event_certificates
    where event_id = ${eventId} and revoked_at is null and emailed_at is null
    order by award, team_name`.execute(db);

  console.log(`\nEmailing ${rows.length} people from ${origin}`);
  let failed = 0;
  for (const row of rows) {
    try {
      await sendHackathonCertificateEmail({
        eventTitle: row.event_title,
        communityName: row.community_name,
        teamName: row.team_name,
        recipientName: row.recipient_name,
        place: row.award === "participant" ? null : Number(row.award.replace("place_", "")),
        certificateLink: `${origin}/certificate/${row.code}?k=${CertificateOwner.key(row.code)}`,
        recipientEmail: row.recipient_email,
      });
      await sql`update event_certificates set emailed_at = now() where id = ${row.id}`.execute(db);
      console.log(`  ✓ ${row.recipient_name}`);
    } catch (error) {
      failed++;
      console.error(`  ✗ ${row.recipient_name}: ${error instanceof Error ? error.message : error}`);
    }
    await new Promise((done) => setTimeout(done, SEND_GAP_MS));
  }
  if (failed) console.log(`${failed} failed; run with --send again to retry only those.`);
}

async function main() {
  const awards = readDecisions();
  const db = openDb(prod);
  try {
    const event = await findHackathon(db, eventSlug!);
    const recipients = await loadRecipients(db, event.id, [...awards.keys()]);
    console.log(`${event.title}: ${recipients.length} certificates for ${awards.size} teams`);
    printPlan(recipients, awards);
    if (flags["dry-run"] === true) {
      console.log("\nDry run: nothing written.");
      return;
    }
    await issue(db, event.id, recipients, awards);
    if (flags.send === true) await send(db, event.id);
  } finally {
    await db.destroy();
  }
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
