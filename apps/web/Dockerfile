# Build context is the repo root, not this directory:
#   az acr build -r luhiveprodacr -f apps/web/Dockerfile -t web:<tag> .
# The image carries no configuration. Browser config is read at runtime from
# the environment, so the same image runs in any environment.

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /repo
COPY . .
# The trailing "..." also installs web's workspace dependencies.
RUN pnpm install --frozen-lockfile --filter "@luhive/web..."
RUN pnpm --filter @luhive/web build
# --legacy is required on pnpm 10 without injected workspace packages.
RUN pnpm --filter @luhive/web deploy --prod --legacy /prod/web

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /prod/web ./
# `pnpm deploy` follows publish rules and drops gitignored output, so the
# build is copied explicitly.
COPY --from=build /repo/apps/web/build ./build
USER node
EXPOSE 3000
CMD ["node_modules/.bin/react-router-serve", "./build/server/index.js"]
