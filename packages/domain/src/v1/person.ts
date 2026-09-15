import { z } from "zod";

export const PersonRequest = z.object({
  external_id: z.string().min(1).nullable(),
  email: z.email().nullable(),
  name: z.string().nullable(),
  locale: z.string().nullable(),
  plan: z.string().nullable(),
  subscription_status: z.string().nullable(),
  last_seen_at: z.iso.datetime().nullable(),
});

export type PersonRequest = z.infer<typeof PersonRequest>;

export const PersonResponse = PersonRequest.extend({
  id: z.uuid(),
  created_at: z.iso.datetime(),
});

export type PersonResponse = z.infer<typeof PersonResponse>;
