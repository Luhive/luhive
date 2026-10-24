import type { PublicEnv } from "~/shared/models/public-env";

export function PublicEnvScript({ env }: { env: PublicEnv }) {
  // "<" is escaped so no value can close the script tag early.
  const json = JSON.stringify(env).replace(/</g, "\\u003c");
  return <script dangerouslySetInnerHTML={{ __html: `window.ENV = ${json};` }} />;
}
