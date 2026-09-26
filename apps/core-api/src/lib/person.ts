import type { Selectable, Transaction } from "kysely";
import type { DB } from "@luhive/db";
import { Result } from "@luhive/domain";

export type Person = Selectable<DB["people"]>;

export type ResolvePersonCommand = {
  community_id: string;
  external_id: string | null;
  email: string | null;
  name: string | null;
  locale?: string | null;
  plan?: string | null;
  subscription_status?: string | null;
  last_seen_at?: Date | null;
};

type PersonDetails = Required<ResolvePersonCommand>;

/**
 * Finds the person by external id, then by email, and creates one if neither
 * matches. `unsubscribed_at` and `deleted_at` are never written here, so
 * opt-outs and retirements are never undone.
 */
export async function resolvePerson(
  transaction: Transaction<DB>,
  command: ResolvePersonCommand,
): Promise<Result<Person>> {
  const details = normalizePersonDetails(command);
  const { community_id, external_id, email } = details;

  const personWithExternalId = await findPersonByExternalId(transaction, community_id, external_id);
  const personWithEmail = await findPersonByEmail(transaction, community_id, email);

  if (personWithExternalId) {
    if (personWithEmail && personWithEmail.id !== personWithExternalId.id) {
      return Result.failure("conflict", { message: "email is linked to a different person" });
    }
    return Result.success(await updatePersonDetails(transaction, personWithExternalId, details));
  }

  if (personWithEmail) {
    if (isLinkedToDifferentAccount(personWithEmail, external_id)) {
      return Result.failure("conflict", { message: "email is linked to a different account" });
    }
    // An email-only person gains the account's external id here.
    return Result.success(await updatePersonDetails(transaction, personWithEmail, details));
  }

  return Result.success(await createPerson(transaction, details));
}

/** The unique key on `(community_id, email)` depends on emails being stored in this form. */
function normalizePersonDetails(command: ResolvePersonCommand): PersonDetails {
  return {
    community_id: command.community_id,
    external_id: command.external_id,
    email: command.email?.trim().toLowerCase() || null,
    name: command.name?.trim() || null,
    locale: command.locale ?? null,
    plan: command.plan ?? null,
    subscription_status: command.subscription_status ?? null,
    last_seen_at: command.last_seen_at ?? null,
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

function createPerson(transaction: Transaction<DB>, details: PersonDetails): Promise<Person> {
  return transaction
    .insertInto("people")
    .values(details)
    .returningAll()
    .executeTakeFirstOrThrow();
}

/**
 * Identity and name are only filled when empty, so a known person is never
 * relinked or renamed. Locale, plan and subscription status are the sender's
 * current state, so a sent value replaces the stored one; null means not sent.
 */
function updatePersonDetails(
  transaction: Transaction<DB>,
  person: Person,
  details: PersonDetails,
): Promise<Person> {
  return transaction
    .updateTable("people")
    .set({
      external_id: person.external_id ?? details.external_id,
      email: person.email ?? details.email,
      name: person.name ?? details.name,
      locale: details.locale ?? person.locale,
      plan: details.plan ?? person.plan,
      subscription_status: details.subscription_status ?? person.subscription_status,
      last_seen_at: pickLaterDate(person.last_seen_at, details.last_seen_at),
    })
    .where("id", "=", person.id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

/** Batches can arrive out of order, so an older report must not move `last_seen_at` back. */
function pickLaterDate(stored: Date | null, reported: Date | null): Date | null {
  if (stored === null) return reported;
  if (reported === null) return stored;
  if (reported > stored) return reported;
  return stored;
}
