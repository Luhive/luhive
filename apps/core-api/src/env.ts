import { z } from "zod";

const LogLevel = z.enum([
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
  "silent",
]);

export const CoreEnv = z.object({
  DATABASE_URL: z.url(),
  SUPABASE_URL: z.url(),
  SUPABASE_ANON_KEY: z.string().min(20),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  LOG_LEVEL: LogLevel.default("info"),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(10).default(5),
});

export type CoreEnv = z.infer<typeof CoreEnv>;

export function parseEnv(
  source: Record<string, string | undefined> = process.env,
): CoreEnv {
  return CoreEnv.parse(source);
}
