# Build context is the repo root, not this directory:
#   az acr build -r luhiveprodacr -f apps/web/Dockerfile -t web:<tag> .
# The image carries no configuration. Browser config is read at runtime from
# the environment, so the same image runs in any environment.

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Only the lockfile and manifests, so both dependency stages stay cached until
# a dependency changes. Every workspace manifest is listed because the
# lockfile names them all; add new packages here.
FROM base AS manifests
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY apps/core-api/package.json apps/core-api/
COPY apps/integration-api/package.json apps/integration-api/
COPY packages/api-client/package.json packages/api-client/
COPY packages/db/package.json packages/db/
COPY packages/domain/package.json packages/domain/

# --ignore-scripts skips web's `prepare` typegen, which needs the source. The
# native packages the build uses ship prebuilt binaries as optional packages.
FROM manifests AS build-deps
RUN pnpm install --frozen-lockfile --filter "@luhive/web..." --ignore-scripts

# Workspace packages are bundled into the server build, so the deployed copy
# only needs their manifests. --legacy is required on pnpm 10 without injected
# workspace packages.
FROM manifests AS runtime-deps
RUN pnpm --filter @luhive/web deploy --prod --legacy --ignore-scripts /prod/web

FROM build-deps AS build
COPY . .
RUN pnpm --filter @luhive/web build

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=runtime-deps /prod/web ./
COPY --from=build /repo/apps/web/build ./build
USER node
EXPOSE 3000
# --ignore-scripts also skips linking node_modules/.bin, so start the CLI directly.
CMD ["node", "node_modules/@react-router/serve/bin.js", "./build/server/index.js"]
