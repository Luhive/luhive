import type { Kysely } from "kysely";
import type { DB } from "@luhive/db";
import { Result } from "@luhive/domain";
import type { PersonResponse } from "@luhive/domain/v1/person";
import { resolvePerson } from "../../lib/person";
import { runInTransaction } from "../../lib/transaction";
import type { UpsertPersonCommand } from "./contracts";
import { toPersonResponse } from "./person.mapper";

export class PersonService {
  constructor(private readonly deps: { db: Kysely<DB> }) {}

  async upsert(command: UpsertPersonCommand): Promise<Result<PersonResponse>> {
    const person = await runInTransaction(this.deps.db, (transaction) =>
      resolvePerson(transaction, {
        community_id: command.communityId,
        external_id: command.external_id,
        email: command.email,
        name: command.name,
        locale: command.locale,
        plan: command.plan,
        subscription_status: command.subscription_status,
        last_seen_at: command.last_seen_at === null ? null : new Date(command.last_seen_at),
      }),
    );
    if (!person.ok) return person;

    return Result.success(toPersonResponse(person.data));
  }
}
