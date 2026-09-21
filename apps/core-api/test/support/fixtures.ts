import { randomUUID } from "node:crypto";

const run = randomUUID().slice(0, 8);

/**
 * Validation is one shared database, so two CI runs execute at the same time
 * against the same tables. Rolled-back transactions keep tests from seeing
 * each other's rows, but identical literals still contend on the unique
 * indexes over `(community_id, external_id)` and `(community_id, email)`.
 * Derive every fixture identifier from here rather than hardcoding one.
 */
export function testEmail(label: string): string {
  return `${label}-${run}-${randomUUID().slice(0, 8)}@test.luhive.com`;
}

export function testExternalId(label: string): string {
  return `${label}-${run}-${randomUUID().slice(0, 8)}`;
}
