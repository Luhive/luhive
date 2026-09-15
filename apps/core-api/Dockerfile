# Build context is the repo root, not this directory:
#   az acr build -r luhiveprodacr -f apps/core-api/Dockerfile -t core-api:<tag> .
# The pnpm workspace lockfile lives there, and the build needs it.

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /repo
COPY . .
# The trailing "..." also installs core-api's workspace dependencies.
RUN pnpm install --frozen-lockfile --filter "@luhive/core-api..."
RUN pnpm --filter @luhive/core-api build
# --legacy is required on pnpm 10 without injected workspace packages.
RUN pnpm --filter @luhive/core-api deploy --prod --legacy /prod/core-api

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /prod/core-api ./
USER node
EXPOSE 3000
# --import preloads OpenTelemetry so it can patch pg and node:http before the
# app's imports load them. See src/telemetry/start.ts.
CMD ["node", "--import", "./dist/telemetry/start.js", "dist/index.js"]
