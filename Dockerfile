FROM node:24-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/site/package.json ./apps/site/
COPY packages/ui/package.json ./packages/ui/

RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    corepack enable pnpm && pnpm i --frozen-lockfile --ignore-scripts

FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/site/node_modules ./apps/site/node_modules
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json ./
COPY .moon ./.moon
COPY apps/site ./apps/site
COPY packages/ui ./packages/ui

RUN node apps/site/scripts/prepare-build-config.mjs

ENV NODE_OPTIONS="--max-old-space-size=3072"

RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    --mount=type=cache,id=moon-cache,target=/app/.moon/cache \
    corepack enable pnpm && pnpm run build

FROM base AS runtime-deps

WORKDIR /app/apps/site
COPY --from=builder /app/apps/site/.output ./.output
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    if [ -f .output/server/package.json ]; then \
      cd .output/server && corepack enable pnpm && pnpm install --prod; \
    fi

FROM gcr.io/distroless/nodejs24-debian12:nonroot AS runner
WORKDIR /app/apps/site

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

ARG TESTING=false
ENV TESTING=${TESTING}

COPY --from=runtime-deps --chown=65532:65532 /app/apps/site/.output ./.output
COPY --from=builder --chown=65532:65532 /app/apps/site/drizzle ./drizzle

EXPOSE 3001

CMD [".output/server/index.mjs"]
