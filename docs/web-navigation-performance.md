# Web navigation performance

Clicking from the hub into a community, an event, the profile or sign out used to
take about a second before anything changed on screen. This document records why,
what has been fixed, and what is left.

## Why navigation was slow (measured 17 October 2026)

React Router keeps the current page on screen until every awaited loader of the
next page has finished. Skeletons inside the next page only appear for data a
loader returns as an un-awaited promise.

Production measurements, logged out, median of a reused connection:

| Request | Wait for first byte |
| --- | --- |
| Static file from the Netlify CDN | 78 ms |
| `/privacy-policy.data` (server function, no database work) | 211 ms |
| `/c/<slug>.data` (community page) | about 1,000–1,250 ms |
| Event page data | about 890 ms |

Three causes add up:

- **Distance.** The Netlify functions run in `us-east-1` (Virginia) while Supabase
  production is in `eu-west-1` (Dublin). Every query is one transatlantic round trip.
- **Queries in a row.** The community home loader runs 4–5 queries back to back;
  the event detail loader 4–6. Each query itself is fast; the wait is round trips.
- **Fresh connections per function call.** Production took about 400–500 ms longer
  than its query count explains, most likely from connection setup in short-lived
  functions. Not measured directly.

## Done

- **Navigation progress bar.** `shared/components/navigation-progress.tsx`, shown
  for page changes and form submissions that take longer than 150 ms.
- **One Supabase client per request.** React Router middleware
  (`future.v8_middleware`) in `shared/lib/supabase/supabase-middleware.server.ts`
  creates the client once, resolves the user once, refreshes an expired session
  before loaders stream, and attaches refreshed cookies to the response. Before,
  every loader built its own client and refreshed cookies were thrown away.
- **Local session checks.** `findAuthUser()` uses `getClaims()`. With asymmetric
  signing keys the token is verified locally: 2 ms instead of 282–835 ms per check
  on dev. Dev rotated to an ECC key; production rotation is pending.

## Next

### 1. Client cache and prefetch, community pages first (2–3 days)

The part that makes navigation feel instant regardless of server location.

- A `clientLoader` per page that returns cached TanStack Query data immediately
  and refreshes it in the background. Repeat and back visits become instant.
- Invalidate the cache after joining a community and similar actions, so counts
  and membership do not go stale.
- Seed the community header from the hub card data, so a first visit shows real
  content at once.
- Prefetch through the query cache on hover and touch, like
  `usePrefetchHubEventPreview`. `<Link prefetch>` and `PrefetchPageLinks` rely on
  `<link rel="prefetch">`, which Safari and every iOS browser do not support.
- Event pages follow, but `app/modules/events/**` is frozen and needs sign-off.

### 2. Move to Azure and upgrade to React Router v8 (about 1 day for the upgrade)

Running next to the database turns each round trip into 1–2 ms. Doing both at
once replaces the build setup only once.

- Docker image on Node 24. The current Dockerfile uses Node 20 and `npm ci`; the
  repo uses pnpm.
- Remove `@netlify/vite-plugin-react-router` and the `ensureServerBuildEntry`
  plugin in `vite.config.ts`; it relies on `isSsrBuild`, which the Vite
  Environment API replaces.
- In v8, `request.url` keeps the `.data` suffix and `?_routes=` on client
  navigations. Move the server files that parse `new URL(request.url)` to the new
  `url` argument; `legacy-community-slug-redirect.server.ts` breaks otherwise.
- Rename `meta({ data })` to `loaderData` in the profile, community and event
  detail meta files.
- Delete the `v8_middleware` flag line; middleware is the default in v8.
- Re-run the measurements above against the Azure deployment.

### 3. Targeted page prefetch (half a day, after the cache)

`PrefetchPageLinks` for the first communities on the hub or for search results.
Helps Chrome and Android first visits once the server is fast. Every prefetch runs
all loaders of that page, so keep it to a few likely pages.

### 4. Remaining Supabase clients

Twelve auth-flow files (login, register, verify, OTP, password reset, logout) and
the frozen events module still create their own client. The middleware already
saves refreshed cookies for them. Migrate the auth flows when they are next
touched; the events and community-join files move to core-api in stage 1 #9
instead.

### 5. Stream slow loader data (only if timings after the move call for it)

Await only what the first paint needs and stream the rest, as the hub loader
does. On Azure five queries in a row cost about 10 ms, so this is likely
unnecessary.
