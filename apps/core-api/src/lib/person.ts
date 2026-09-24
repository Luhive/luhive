import type { Selectable, Transaction } from "kysely";
import type { DB } from "@luhive/db";
import { Result } from "@luhive/domain";

export type Person = Selectable<DB["people"]>;

export type ResolvePersonCommand = {
  community_id: string;
  external_id: string | null;
  email: string | null;
  name: string | null;
};

/**
 * Finds the person by external id, then by email, and creates one if neither
 * matches. An existing person only has empty fields filled in, so opt-outs
 * and retirements are never undone.
 */
export async function resolvePerson(
  transaction: Transaction<DB>,
  command: ResolvePersonCommand,
): Promise<Result<Person>> {
  const normalizedCommand = normalizePersonDetails(command);
  const { community_id, external_id, email } = normalizedCommand;

  const personWithExternalId = await findPersonByExternalId(transaction, community_id, external_id);
  const personWithEmail = await findPersonByEmail(transaction, community_id, email);

  if (personWithExternalId) {
    if (personWithEmail && personWithEmail.id !== personWithExternalId.id) {
      return Result.failure("conflict", { message: "email is linked to a different person" });
    }
    return Result.success(
      await fillMissingPersonDetails(transaction, personWithExternalId, normalizedCommand),
    );
  }

  if (personWithEmail) {
    if (isLinkedToDifferentAccount(personWithEmail, external_id)) {
      return Result.failure("conflict", { message: "email is linked to a different account" });
    }
    // An email-only person gains the account's external id here.
    return Result.success(
      await fillMissingPersonDetails(transaction, personWithEmail, normalizedCommand),
    );
  }

  return Result.success(await createPerson(transaction, normalizedCommand));
}

/** The unique key on `(community_id, email)` depends on emails being stored in this form. */
function normalizePersonDetails(command: ResolvePersonCommand): ResolvePersonCommand {
  return {
    ...command,
    email: command.email?.trim().toLowerCase() || null,
    name: command.name?.trim() || null,
  };
}

function isLinkedToDifferentAccount(person: Person, externalId: string | null): boolean {
  if (person.external_id === null) return false;
  if (externalId === null) return false;
  return person.external_id !== externalId;
}

async function findPersonByExternalId(
  transaction: Transaction<DB>,
  communityId: string,
  externalId: string | null,
): Promise<Person | undefined> {
  if (externalId === null) return undefined;

  return transaction
    .selectFrom("people")
    .selectAll()
    .where("community_id", "=", communityId)
    .where("external_id", "=", externalId)
    .executeTakeFirst();
}

async function findPersonByEmail(
  transaction: Transaction<DB>,
  communityId: string,
  email: string | null,
): Promise<Person | undefined> {
  if (email === null) return undefined;

  return transaction
    .selectFrom("people")
    .selectAll()
    .where("community_id", "=", communityId)
    .where("email", "=", email)
    .executeTakeFirst();
}

function createPerson(
  transaction: Transaction<DB>,
  command: ResolvePersonCommand,
): Promise<Person> {
  return transaction
    .insertInto("people")
    .values({
      community_id: command.community_id,
      external_id: command.external_id,
      email: command.email,
      name: command.name,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

/** Only empty columns are written, so nothing a person already has is replaced. */
function fillMissingPersonDetails(
  transaction: Transaction<DB>,
  person: Person,
  command: ResolvePersonCommand,
): Promise<Person> {
  return transaction
    .updateTable("people")
    .set({
      external_id: person.external_id ?? command.external_id,
      email: person.email ?? command.email,
      name: person.name ?? command.name,
    })
    .where("id", "=", person.id)
    .returningAll()
    .executeTakeFirstOrThrow();
}
