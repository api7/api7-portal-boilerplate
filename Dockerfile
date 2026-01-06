FROM node:22-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/site/package.json ./apps/site/
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    corepack enable pnpm && pnpm i --frozen-lockfile

FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/site/node_modules ./apps/site/node_modules

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json ./
COPY apps/site ./apps/site

# Create config.yaml from example for build time
# This is required because Next.js analyzes API routes during build
RUN cd apps/site && \
    if [ ! -f config.yaml ]; then \
      cp config.yaml.example config.yaml && \
      sed -i 's|url: ""|url: "postgres://placeholder:placeholder@localhost:5432/placeholder"|' config.yaml && \
      sed -i 's|secret: ""|secret: "build-time-placeholder-secret-key-min-32-chars-long"|' config.yaml && \
      sed -i 's|token: \${PORTAL_TOKEN:}|token: \${PORTAL_TOKEN:build-time-placeholder}|' config.yaml; \
    fi

# NEXT_PUBLIC_TESTING enables testing features (default: true for e2e tests)
# For production builds, pass --build-arg NEXT_PUBLIC_TESTING=false
ARG NEXT_PUBLIC_TESTING=true
ENV NEXT_PUBLIC_TESTING=${NEXT_PUBLIC_TESTING}
ENV NEXT_TELEMETRY_DISABLED=1
RUN --mount=type=cache,id=nextjs-cache,target=/app/apps/site/.next/cache \
    corepack enable pnpm && \
    cd apps/site && \
    pnpm run build && \
    pnpm dlx esbuild scripts/preflight.ts --bundle --platform=node --outfile=dist/preflight.js

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/site/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/site/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/site/.next/static ./apps/site/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/site/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/apps/site/dist/preflight.js ./preflight.js

COPY --chown=nextjs:nodejs apps/site/docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nextjs

EXPOSE 3001

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "apps/site/server.js"]
