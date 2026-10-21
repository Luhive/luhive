import { createServiceRoleClient } from "~/shared/lib/supabase/server";

/**
 * event_payment_instructions is closed to anon/authenticated roles: the text
 * holds card details meant only for registrants. Callers must have authorised
 * the request before calling into this file.
 */

export async function findEventPaymentInstructions(
  eventId: string,
): Promise<string | null> {
  const { data, error } = await createServiceRoleClient()
    .from("event_payment_instructions")
    .select("instructions")
    .eq("event_id", eventId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read payment instructions: ${error.message}`);
  }

  return data?.instructions ?? null;
}

export async function saveEventPaymentInstructions(
  eventId: string,
  instructions: string,
): Promise<void> {
  const { error } = await createServiceRoleClient()
    .from("event_payment_instructions")
    .upsert({
      event_id: eventId,
      instructions,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    throw new Error(`Failed to save payment instructions: ${error.message}`);
  }
}
