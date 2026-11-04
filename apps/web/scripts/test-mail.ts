// Reads test emails from testmail.app so people and agents can follow email
// flows (OTP codes, invite links) end to end. See docs/testing-emails.md.
//
//   pnpm test-mail address captain          → luhive.captain@inbox.testmail.app
//   pnpm test-mail latest captain           → newest email for that tag
//   pnpm test-mail latest captain --wait    → waits for one to arrive
//   pnpm test-mail otp captain --wait       → just the 6-digit code
//   pnpm test-mail list captain             → recent emails, one per line
//
// Flags: --since <seconds ago | ISO time>  only emails after that (default 15 min)
//        --subject <text>                  only emails whose subject contains it
//        --wait                            wait up to ~60s for a match
//        --json                            raw JSON (latest / list)
import { fail, readFlags, requireEnv } from "./test-env";

const API = "https://api.testmail.app/api/json";
const INBOX_DOMAIN = "inbox.testmail.app";
const DEFAULT_SINCE_SECONDS = 15 * 60;
const WAIT_LIMIT_MS = 60_000;

type TestmailEmail = {
  id: string;
  tag: string;
  subject: string;
  from: string;
  to: string;
  text: string | null;
  html: string | null;
  timestamp: number;
};

const { positional, flags } = readFlags(process.argv.slice(2));
const [command, tag] = positional;

function getNamespace() {
  return requireEnv("TESTMAIL_NAMESPACE", "Add it to apps/web/.env.test.local (see .env.test.example).");
}

function addressFor(emailTag: string) {
  if (!/^[a-z0-9-]+$/i.test(emailTag)) {
    fail(`Tag "${emailTag}" can only use letters, digits and dashes.`);
  }
  return `${getNamespace()}.${emailTag.toLowerCase()}@${INBOX_DOMAIN}`;
}

function sinceTimestamp(): number {
  const raw = flags.since;
  if (raw === undefined || raw === true) return Date.now() - DEFAULT_SINCE_SECONDS * 1000;
  if (/^\d+$/.test(raw)) return Date.now() - Number(raw) * 1000;
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) fail(`--since "${raw}" is not seconds or an ISO time.`);
  return parsed;
}

async function fetchEmails(emailTag: string): Promise<TestmailEmail[]> {
  const apiKey = requireEnv(
    "TESTMAIL_API_KEY",
    "Add it to apps/web/.env.test.local (see .env.test.example).",
  );
  const params = new URLSearchParams({
    apikey: apiKey,
    namespace: getNamespace(),
    tag: emailTag.toLowerCase(),
    timestamp_from: String(sinceTimestamp()),
    limit: "20",
  });
  const subject = typeof flags.subject === "string" ? flags.subject.toLowerCase() : null;
  const deadline = Date.now() + (flags.wait ? WAIT_LIMIT_MS : 0);

  // Polls instead of testmail's livequery so a --subject filter can keep waiting
  // past emails that don't match.
  for (;;) {
    const response = await fetch(`${API}?${params}`);
    if (!response.ok) fail(`testmail.app answered ${response.status}: ${await response.text()}`);
    const body = (await response.json()) as { result: string; message?: string; emails: TestmailEmail[] };
    if (body.result !== "success") fail(`testmail.app: ${body.message ?? body.result}`);

    const emails = body.emails
      .filter((email) => !subject || email.subject.toLowerCase().includes(subject))
      .sort((a, b) => b.timestamp - a.timestamp);
    if (emails.length || Date.now() >= deadline) return emails;
    await new Promise((done) => setTimeout(done, 3000));
  }
}

function findOtp(email: TestmailEmail) {
  const text = `${email.subject}\n${email.text ?? ""}`;
  return text.match(/\b\d{6}\b/)?.[0] ?? null;
}

function findLinks(email: TestmailEmail) {
  const links = new Set<string>();
  for (const match of (email.html ?? "").matchAll(/href="([^"]+)"/g)) {
    links.add(match[1].replace(/&amp;/g, "&"));
  }
  for (const match of (email.text ?? "").matchAll(/https?:\/\/[^\s)>\]]+/g)) {
    links.add(match[0]);
  }
  return [...links].filter((link) => /^https?:/.test(link) && !/unsubscribe/i.test(link));
}

function printEmail(email: TestmailEmail) {
  const otp = findOtp(email);
  console.log(`Subject: ${email.subject}`);
  console.log(`From:    ${email.from}`);
  console.log(`To:      ${email.to}`);
  console.log(`Time:    ${new Date(email.timestamp).toISOString()}`);
  if (otp) console.log(`OTP:     ${otp}`);
  const links = findLinks(email);
  if (links.length) {
    console.log("Links:");
    for (const link of links) console.log(`  ${link}`);
  }
  const text = (email.text ?? "").replace(/\n{3,}/g, "\n\n").trim();
  if (text) console.log(`\n${text.slice(0, 1500)}`);
}

function requireTag(): string {
  if (!tag) fail(`Give a tag, e.g. "pnpm test-mail ${command ?? "latest"} captain".`);
  return tag;
}

async function main() {
  switch (command) {
    case "address":
      console.log(addressFor(requireTag()));
      return;
    case "latest": {
      const [email] = await fetchEmails(requireTag());
      if (!email) fail(`No email for ${addressFor(tag)} in that window.`);
      if (flags.json) console.log(JSON.stringify(email, null, 2));
      else printEmail(email);
      return;
    }
    case "otp": {
      const [email] = await fetchEmails(requireTag());
      if (!email) fail(`No email for ${addressFor(tag)} in that window.`);
      const otp = findOtp(email);
      if (!otp) fail(`Newest email ("${email.subject}") has no 6-digit code.`);
      console.log(otp);
      return;
    }
    case "list": {
      const emails = await fetchEmails(requireTag());
      if (flags.json) {
        console.log(JSON.stringify(emails, null, 2));
        return;
      }
      if (!emails.length) console.log(`No emails for ${addressFor(tag)} in that window.`);
      for (const email of emails) {
        console.log(`${new Date(email.timestamp).toISOString()}  ${email.subject}`);
      }
      return;
    }
    default:
      fail('Usage: pnpm test-mail <address|latest|otp|list> <tag> [--wait] [--since 600] [--subject "text"] [--json]');
  }
}

await main();
