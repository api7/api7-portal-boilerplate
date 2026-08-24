FROM node:22-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/site/package.json ./apps/site/
COPY packages/ui/package.json ./packages/ui/
# --ignore-scripts: packages/ui's own `prepare` (builds its dist/ .d.ts via
# moon) would otherwise run here and fail — this stage only has package.json
# files, not the source it needs, nor the .moon/ workspace config. `moon run
# site:build` in the builder stage below builds it for real, once the
# source and moon.yml files are copied in.
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

# Create config.yaml from example for build time.
# Required because Vite/Nitro (like Next.js) statically analyzes routes and
# server functions during build, and config loading happens at import time.
RUN node apps/site/scripts/prepare-build-config.mjs

# TESTING enables testing-only auth integrations such as magic-link sign-in
# through smtp4dev. Enable it explicitly for e2e builds.
ARG TESTING=false
ENV TESTING=${TESTING}

# Nitro/rolldown's build graph OOMs above ~3.5GB in constrained environments
# (see impl/tanstack-start.md) — cap it explicitly rather than relying on
# whatever headroom the build host happens to have.
ENV NODE_OPTIONS="--max-old-space-size=3072"

# No .git in this build context (see .dockerignore) — moon has no VCS to
# consult and hashes task inputs directly off the filesystem instead, so
# `ui:build` still runs correctly as `site:build`'s dependency.
RUN corepack enable pnpm && \
    pnpm run build && \
    cd apps/site && \
    pnpm exec esbuild ./scripts/preflight.ts --bundle --platform=node --outfile=dist/preflight.js

FROM base AS runner
# Nitro's output is self-contained and doesn't care where it runs from —
# WORKDIR is the config.yaml's home directory directly, so lilconfig's
# default cwd search just works.
WORKDIR /app/apps/site

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

# TESTING is read from process.env at request time by src/lib/auth/server.ts
# — the builder stage's ARG/ENV only affected the `pnpm run build` step, not
# this running process, so it must be set again here.
ARG TESTING=false
ENV TESTING=${TESTING}

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Nitro's node-server output is self-contained (its own package.json +
# vendored node_modules for the handful of deps it can't bundle) — no
# separate node_modules copy step needed.
COPY --from=builder --chown=nextjs:nodejs /app/apps/site/.output ./.output
COPY --from=builder --chown=nextjs:nodejs /app/apps/site/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/apps/site/dist/preflight.js ./preflight.js

COPY --chown=nextjs:nodejs apps/site/docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nextjs

EXPOSE 3001

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", ".output/server/index.mjs"]
