import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/shared/models/database.types";

/** Someone who signed up through a one-time code has no profile yet. Their name starts as the email's local part. */
export async function createProfileIfMissing(
  supabase: SupabaseClient<Database>,
  user: { id: string; email?: string },
) {
  const { error } = await supabase.from("profiles").upsert(
    { id: user.id, full_name: user.email?.split("@")[0] || "User" },
    { onConflict: "id", ignoreDuplicates: true },
  );
  return { error };
}
