import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { supabaseProjectRef } from "./supabase-project-ref";

const run = promisify(execFile);

/**
 * Generates Supabase's own `Database` type for one database.
 *
 * This is not redundant with `kysely-codegen`. supabase-js infers `.from()`
 * results from Supabase's `Row`/`Insert`/`Update` shape, which Kysely's flat
 * table interfaces cannot satisfy, so both generators run off the same schema.
 *
 * `--project-id` rather than `--db-url`: the Management API introspects the
 * project over HTTPS, so codegen does not need a local Docker daemon. The
 * project ref is taken from `PRODUCTION_DATABASE_URL`.
 */
export async function generateSupabaseTypes(
  connectionString: string,
  outFile: string,
): Promise<string> {
  const projectId = supabaseProjectRef(connectionString);
  if (!projectId) {
    throw new Error(
      "PRODUCTION_DATABASE_URL must be a Supabase URI so codegen can derive --project-id.",
    );
  }

  const { stdout } = await run(
    "supabase",
    [
      "gen",
      "types",
      "typescript",
      "--project-id",
      projectId,
      "--schema",
      "public",
    ],
    { maxBuffer: 32 * 1024 * 1024, env: process.env },
  );

  await writeFile(outFile, stdout, "utf8");

  return stdout;
}
