// Env loading for the test scripts in this folder: the testmail.app keys live
// in .env.test.local (git-ignored).
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseEnvFile(file: string): Record<string, string> {
  const path = resolve(appDir, file);
  if (!existsSync(path)) return {};
  const values: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return values;
}

const env = parseEnvFile(".env.test.local");

export function requireEnv(name: string, hint: string): string {
  const value = process.env[name] || env[name];
  if (!value) fail(`${name} is missing. ${hint}`);
  return value;
}

export function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

export function readFlags(args: string[]) {
  const positional: string[] = [];
  const flags: Record<string, string | true> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    const [key, inline] = arg.slice(2).split("=", 2);
    if (inline !== undefined) flags[key] = inline;
    else if (args[i + 1] && !args[i + 1].startsWith("--")) flags[key] = args[++i];
    else flags[key] = true;
  }
  return { positional, flags };
}
