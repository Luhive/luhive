/**
 * TEMPORARY — delete when #8 lands and `packages/api-client` exists.
 *
 * Measures the round trip from web's SSR server to core-api. That number
 * decides whether `apps/web` moves to Container Apps; see `docs/spec/16`.
 *
 * The loader is inline rather than re-exported from a module, unlike every
 * other route here, because this is a diagnostic rather than domain logic and
 * it should leave nothing behind when removed.
 *
 * `/health` is unauthenticated, so this covers DNS, TLS and reachability only.
 * It says nothing about whether bearer auth works.
 */

const CORE_URL =
  process.env.CORE_API_URL ??
  "https://core-api.nicefield-2b9a3355.northeurope.azurecontainerapps.io";

export async function loader() {
  const startedAt = performance.now();

  try {
    const response = await fetch(`${CORE_URL}/health`, {
      signal: AbortSignal.timeout(5_000),
    });

    return {
      coreUrl: CORE_URL,
      reachable: response.ok,
      status: response.status,
      body: await response.text(),
      roundTripMs: Math.round((performance.now() - startedAt) * 100) / 100,
    };
  } catch (error) {
    return {
      coreUrl: CORE_URL,
      reachable: false,
      status: 0,
      body: error instanceof Error ? error.message : String(error),
      roundTripMs: Math.round((performance.now() - startedAt) * 100) / 100,
    };
  }
}
