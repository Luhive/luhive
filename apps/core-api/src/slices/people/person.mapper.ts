import type { PersonResponse } from "@luhive/domain/v1/person";
import type { Person } from "../../lib/person";

/** Leaves out `community_id`, `attributes`, `unsubscribed_at` and `deleted_at`. */
export function toPersonResponse(person: Person): PersonResponse {
  return {
    id: person.id,
    external_id: person.external_id,
    email: person.email,
    name: person.name,
    locale: person.locale,
    plan: person.plan,
    subscription_status: person.subscription_status,
    last_seen_at: person.last_seen_at?.toISOString() ?? null,
    created_at: person.created_at.toISOString(),
  };
}
