// import * as Certificates from "~/modules/certificates/data/certificates-repo.server"
// Certificates are written by apps/web/scripts/certificates-issue.ts; this reads them
// and logs views and shares (event_certificate_events).
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "~/shared/lib/supabase/server";
import type { Award, Badge, PublicCertificate } from "~/modules/certificates/model/certificate";

type CertificateRecord = {
  code: string;
  user_id: string | null;
  recipient_email: string;
  recipient_name: string;
  team_name: string;
  award: Award;
  event_title: string;
  event_date: string;
  community_name: string;
  community_slug: string;
  issued_at: string;
  revoked_at: string | null;
  updated_at: string;
};

// `database.types.ts` gets this table after production has migration 0017 and codegen runs.
type CertificatesDatabase = {
  public: {
    Tables: {
      event_certificates: {
        Row: CertificateRecord;
        Insert: never;
        Update: { user_id?: string };
        Relationships: [];
      };
      event_certificate_events: {
        Row: { id: number; certificate_code: string; kind: string; channel: string; created_at: string };
        Insert: { certificate_code: string; kind: "view" | "share"; channel: string };
        Update: never;
        Relationships: [];
      };
      communities: {
        Row: { slug: string; social_links: { instagram?: string | null } | null };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

function client() {
  return createServiceRoleClient() as unknown as SupabaseClient<CertificatesDatabase>;
}

function table() {
  return client().from("event_certificates");
}

const PUBLIC_COLUMNS =
  "code, recipient_name, team_name, award, event_title, event_date, community_name, community_slug, issued_at, updated_at";

function toPublic(row: Omit<CertificateRecord, "user_id" | "recipient_email" | "revoked_at">): PublicCertificate {
  return {
    code: row.code,
    recipientName: row.recipient_name,
    teamName: row.team_name,
    award: row.award,
    eventTitle: row.event_title,
    eventDate: row.event_date,
    communityName: row.community_name,
    communitySlug: row.community_slug,
    issuedAt: row.issued_at,
    updatedAt: row.updated_at,
  };
}

/** A live certificate by its public code; null when unknown or revoked. */
export async function findByCode(code: string): Promise<PublicCertificate | null> {
  return (await findWithOwner(code))?.cert ?? null;
}

/** Same, plus the account it belongs to (null before the person has one). Server only. */
export async function findWithOwner(
  code: string,
): Promise<{ cert: PublicCertificate; ownerId: string | null } | null> {
  const { data, error } = await table()
    .select(`${PUBLIC_COLUMNS}, user_id`)
    .eq("code", code)
    .is("revoked_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { cert: toPublic(data), ownerId: data.user_id } : null;
}

/** The community's Instagram link, live (it isn't frozen on the certificate). */
export async function findCommunityInstagram(slug: string): Promise<string | null> {
  const { data } = await client().from("communities").select("slug, social_links").eq("slug", slug).maybeSingle();
  return data?.social_links?.instagram ?? null;
}

/** A visitor view or an owner's share. Best effort: a failed write never breaks the page. */
export async function recordEvent(code: string, kind: "view" | "share", channel: string): Promise<void> {
  const { error } = await client()
    .from("event_certificate_events")
    .insert({ certificate_code: code, kind, channel });
  if (error) console.error("Failed to record certificate event:", error.message);
}

export async function listBadgesForUser(userId: string): Promise<Badge[]> {
  const { data, error } = await table()
    .select("code, award, event_title, event_date")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("event_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    code: row.code,
    award: row.award,
    eventTitle: row.event_title,
    eventDate: row.event_date,
  }));
}

/** Attach certificates issued to this email before the person had an account. */
export async function linkByEmail(userId: string, email: string): Promise<void> {
  // updated_at stays: it versions the OG image, and linking changes nothing visible.
  const { error } = await table()
    .update({ user_id: userId })
    .eq("recipient_email", email.trim().toLowerCase())
    .is("user_id", null);
  if (error) throw new Error(error.message);
}
