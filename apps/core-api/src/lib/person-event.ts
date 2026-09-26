import type { Selectable, Transaction } from "kysely";
import type { DB, JsonObject } from "@luhive/db";
import { Result } from "@luhive/domain";

export type PersonEventType =
  | "event_registered"
  | "event_checked_in"
  | "community_joined"
  | "email_sent"
  | "email_delivered"
  | "email_opened"
  | "email_clicked"
  | "email_bounced";

export type PersonEvent = Selectable<DB["person_events"]>;

export type RecordPersonEventCommand = {
  person_id: string;
  community_id: string;
  type: PersonEventType;
  properties?: JsonObject;
};

/** Identity lives on the person. Keeping it out of events makes erasure one row. */
const IDENTITY_FIELDS = ["email", "name", "phone", "external_id"];

export async function recordPersonEvent(
  transaction: Transaction<DB>,
  command: RecordPersonEventCommand,
): Promise<Result<PersonEvent>> {
  const properties = command.properties ?? {};

  if (hasIdentityFields(properties)) {
    return Result.failure("invalid_query", { message: "identity fields are not allowed in properties" });
  }

  const person = await transaction
    .selectFrom("people")
    .select("community_id")
    .where("id", "=", command.person_id)
    .executeTakeFirst();

  if (!person) return Result.failure("not_found", { message: "person not found" });
  if (person.community_id !== command.community_id) {
    return Result.failure("forbidden", { message: "person belongs to a different community" });
  }

  const event = await transaction
    .insertInto("person_events")
    .values({
      person_id: command.person_id,
      community_id: command.community_id,
      type: command.type,
      properties,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  return Result.success(event);
}

function hasIdentityFields(properties: JsonObject): boolean {
  return Object.keys(properties).some((key) => IDENTITY_FIELDS.includes(key.toLowerCase()));
}
