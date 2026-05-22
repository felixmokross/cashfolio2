# syntax = docker/dockerfile:1

ARG NODE_VERSION=24
ARG DOTENV_VERSION=17.4.2
ARG PRISMA_VERSION=7.8.0
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="TanStack Start"

WORKDIR /app

ENV NODE_ENV="production"

FROM base AS build

# Install packages needed to generate Prisma client and build the application.
RUN --mount=type=cache,id=apt-cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,id=apt-lists,target=/var/lib/apt/lists,sharing=locked \
    apt-get update -qq && \
    apt-get install --no-install-recommends -y openssl

# Install latest corepack to work around this issue: https://github.com/nodejs/corepack/issues/612
RUN npm install -g corepack@latest
RUN corepack enable pnpm

# Install node modules
COPY --link package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --link apps/cashfolio-app2/package.json apps/cashfolio-app2/
RUN pnpm config set store-dir /pnpm/store
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store,sharing=locked \
    pnpm --filter cashfolio-app2 install --prod=false --frozen-lockfile

# Copy application code
COPY --link apps/cashfolio-app2 apps/cashfolio-app2

RUN pnpm --filter cashfolio-app2 prisma:generate

# Build application
RUN pnpm --filter cashfolio-app2 build

FROM base AS migration-tools

ARG DOTENV_VERSION
ARG PRISMA_VERSION

RUN npm install --omit=dev --no-audit --no-fund \
    dotenv@${DOTENV_VERSION} \
    prisma@${PRISMA_VERSION}

FROM base

# Install openssl needed to run Prisma
RUN --mount=type=cache,id=apt-cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,id=apt-lists,target=/var/lib/apt/lists,sharing=locked \
    apt-get update -qq && \
    apt-get install --no-install-recommends -y openssl

# Copy built application
COPY --from=build /app/apps/cashfolio-app2/.output .output

# Copy the minimal release-command payload for Prisma migrations.
COPY --from=migration-tools /app/node_modules node_modules
COPY --from=build /app/apps/cashfolio-app2/prisma apps/cashfolio-app2/prisma
COPY --from=build /app/apps/cashfolio-app2/prisma.config.ts apps/cashfolio-app2/prisma.config.ts
COPY --from=build /app/apps/cashfolio-app2/scripts/prisma-migrate-deploy-with-retry.sh apps/cashfolio-app2/scripts/prisma-migrate-deploy-with-retry.sh

EXPOSE 3000
CMD [ "node", ".output/server/index.mjs" ]
