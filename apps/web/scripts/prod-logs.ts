// Reads hackathon logs from production (Azure Log Analytics, where the web
// container's stdout and stderr land). Read-only; needs `az login`.
//
//   pnpm prod-logs                     warnings and errors from the last hour
//   pnpm prod-logs --follow            keep watching, new lines every 30s
//   pnpm prod-logs --level info        everything: joins, invites, decisions too
//   pnpm prod-logs --level error       only things that broke
//   pnpm prod-logs --event <event-id>  one event only
//   pnpm prod-logs --since 6h          any KQL timespan: 30m, 6h, 2d
//   pnpm prod-logs --web-errors        also any other error the web app printed (bot 404s hidden)
//   pnpm prod-logs --raw               the full JSON line (stack traces included)
//
// Logs reach Log Analytics 1–3 minutes after they happen.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fail, readFlags } from "./test-env";

const run = promisify(execFile);
const RESOURCE_GROUP = "luhive-prod-ne";
const ENVIRONMENT = "luhive-env";
const CONTAINER_APP = "web";
const POLL_MS = 30_000;
const LEVELS = ["info", "warn", "error"] as const;

const { flags } = readFlags(process.argv.slice(2));
const level = typeof flags.level === "string" ? flags.level : "warn";
if (!LEVELS.includes(level as (typeof LEVELS)[number])) fail(`--level must be one of ${LEVELS.join(", ")}.`);
const since = typeof flags.since === "string" ? flags.since : "1h";
if (!/^\d+[mhd]$/.test(since)) fail(`--since "${since}" should look like 30m, 6h or 2d.`);
const eventId = typeof flags.event === "string" ? flags.event : null;
if (eventId && !/^[0-9a-f-]{36}$/i.test(eventId)) fail("--event takes the event id (a uuid).");

async function az(args: string[]) {
  try {
    const { stdout } = await run("az", args, { maxBuffer: 50 * 1024 * 1024 });
    return stdout;
  } catch (error) {
    const stderr = (error as { stderr?: string }).stderr ?? String(error);
    if (/az login/i.test(stderr)) fail("Not signed in to Azure. Run `az login` first.");
    fail(stderr.split("\n").filter((line) => line && !/WARNING|SyntaxWarning|^\s/.test(line)).join("\n") || stderr);
  }
}

async function workspaceId() {
  const id = (
    await az([
      "containerapp", "env", "show",
      "-n", ENVIRONMENT, "-g", RESOURCE_GROUP,
      "--query", "properties.appLogsConfiguration.logAnalyticsConfiguration.customerId",
      "-o", "tsv",
    ])
  ).trim();
  if (!id) fail("Could not find the Log Analytics workspace for the web app.");
  return id;
}

function query(from: string) {
  const minLevel = LEVELS.indexOf(level as (typeof LEVELS)[number]);
  const levels = LEVELS.slice(minLevel).map((l) => `"${l}"`).join(", ");
  const hackathon = `Log_s startswith '{"source":"hackathon"'`;
  const webErrors = flags["web-errors"]
    ? ` or (Stream_s == "stderr" and not(${hackathon}) and Log_s !startswith "    at " and isnotempty(Log_s) and Log_s !contains "No route matches URL")`
    : "";
  return `
ContainerAppConsoleLogs_CL
| where TimeGenerated > ${from}
| where ContainerAppName_s == "${CONTAINER_APP}"
| where ${hackathon}${webErrors}
| extend j = parse_json(Log_s)
| extend level = iff(isnotempty(tostring(j.level)), tostring(j.level), "error")
| where level in (${levels})${eventId ? `\n| where tostring(j.eventId) == "${eventId}"` : ""}
| project TimeGenerated, level, action = tostring(j.action),
    message = coalesce(tostring(j.message), tostring(j.error), iff(isempty(tostring(j.source)), Log_s, "")),
    eventId = tostring(j.eventId), userId = tostring(j.userId), teamId = tostring(j.teamId), Log_s
| order by TimeGenerated asc
| take 500`;
}

type Row = {
  TimeGenerated: string;
  level: string;
  action: string;
  message: string;
  eventId: string;
  userId: string;
  teamId: string;
  Log_s: string;
};

async function fetchRows(workspace: string, from: string): Promise<Row[]> {
  const out = await az([
    "monitor", "log-analytics", "query",
    "-w", workspace,
    "--analytics-query", query(from),
    "-o", "json",
    "--only-show-errors",
  ]);
  return JSON.parse(out) as Row[];
}

const MARK: Record<string, string> = { error: "✗ ERROR", warn: "! warn ", info: "  info " };

function print(row: Row) {
  if (flags.raw) {
    console.log(`${row.TimeGenerated}  ${row.Log_s}`);
    return;
  }
  const ids = [
    row.eventId && `event=${row.eventId}`,
    row.teamId && `team=${row.teamId}`,
    row.userId && `user=${row.userId}`,
  ].filter(Boolean).join(" ");
  const time = row.TimeGenerated.replace("T", " ").slice(0, 19);
  console.log(`${time}  ${MARK[row.level] ?? row.level}  ${row.action || "web"}  ${row.message ?? ""}${ids ? `  (${ids})` : ""}`);
}

const workspace = await workspaceId();
let rows = await fetchRows(workspace, `ago(${since})`);
if (!rows.length && !flags.follow) console.log(`Nothing at level ${level} or above in the last ${since}.`);
rows.forEach(print);

if (flags.follow) {
  console.log(`— watching (every ${POLL_MS / 1000}s; logs arrive 1–3 min late). Ctrl+C to stop.`);
  let last = rows.at(-1)?.TimeGenerated ?? new Date(Date.now() - 60_000).toISOString();
  const seen = new Set(rows.map((row) => `${row.TimeGenerated}${row.Log_s}`));
  for (;;) {
    await new Promise((done) => setTimeout(done, POLL_MS));
    rows = await fetchRows(workspace, `datetime(${last}) - 5m`);
    for (const row of rows) {
      const key = `${row.TimeGenerated}${row.Log_s}`;
      if (seen.has(key)) continue;
      seen.add(key);
      print(row);
      if (row.TimeGenerated > last) last = row.TimeGenerated;
    }
  }
}
