import { createServiceRoleClient } from "~/shared/lib/supabase/server";

const BUCKET = "payment-receipts";
const VIEW_URL_SECONDS = 60;

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "application/pdf": "pdf",
};

export const MAX_RECEIPT_BYTES = 4 * 1024 * 1024;

/**
 * The payment-receipts bucket is private and has no access policies, so only
 * the service role reaches it. Callers must have authorised the request first.
 */
export async function upload(input: {
  eventId: string;
  registrationId: string;
  file: File;
}): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const extension = ALLOWED_TYPES[input.file.type];
  if (!extension) {
    return { ok: false, error: "Upload a photo or a PDF of the receipt." };
  }
  if (input.file.size > MAX_RECEIPT_BYTES) {
    return { ok: false, error: "The receipt must be 4 MB or smaller." };
  }

  const path = `${input.eventId}/${input.registrationId}.${extension}`;
  const { error } = await createServiceRoleClient()
    .storage.from(BUCKET)
    .upload(path, input.file, { upsert: true, contentType: input.file.type });

  if (error) {
    return { ok: false, error: "Could not store the receipt. Please try again." };
  }

  return { ok: true, path };
}

export async function createViewUrl(path: string): Promise<string | null> {
  const { data, error } = await createServiceRoleClient()
    .storage.from(BUCKET)
    .createSignedUrl(path, VIEW_URL_SECONDS);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function remove(path: string): Promise<void> {
  const { error } = await createServiceRoleClient()
    .storage.from(BUCKET)
    .remove([path]);

  if (error) {
    console.error("Failed to delete a payment receipt", { path, error: error.message });
  }
}
