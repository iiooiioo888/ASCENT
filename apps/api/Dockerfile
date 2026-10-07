# syntax=docker/dockerfile:1
# Build from monorepo root: docker build -f apps/api/Dockerfile .

FROM node:22-alpine AS base
RUN apk add --no-cache openssl libc6-compat
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm fetch

FROM base AS build
COPY --from=deps /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json ./
COPY --from=deps /app/apps/api/package.json apps/api/
COPY --from=deps /app/packages/shared/package.json packages/shared/
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm install --frozen-lockfile
# Production images target PostgreSQL (migrations are Postgres-native).
RUN sed -i 's/provider = "sqlite"/provider = "postgresql"/' apps/api/prisma/schema.prisma
RUN pnpm --filter @ascent/shared build \
  && pnpm --filter @ascent/api prisma:generate \
  && pnpm --filter @ascent/api build

FROM base AS runner
RUN apk add --no-cache wget
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/package.json ./packages/shared/
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/api/package.json ./apps/api/
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY apps/api/docker-entrypoint.sh /app/apps/api/docker-entrypoint.sh

RUN chmod +x /app/apps/api/docker-entrypoint.sh

WORKDIR /app/apps/api
EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=40s --retries=5 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/api/v1/state" >/dev/null || exit 1

ENTRYPOINT ["/app/apps/api/docker-entrypoint.sh"]
