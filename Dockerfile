# syntax=docker/dockerfile:1.7

# ── Stage 1: dependencies ───────────────────────────────────────────────────
# Separated from the build so a source-only change reuses the npm cache layer.
FROM node:22-alpine AS deps
WORKDIR /app

# better-sqlite3 ships prebuilt binaries for musl/node22, but node-gyp needs to
# be available for the fallback path on architectures without one.
RUN apk add --no-cache libc6-compat python3 make g++

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ── Stage 2: build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
# A CX23 has 4GB total but the build runs alongside Postgres-less services;
# capping the heap keeps the OOM killer away from the container.
ENV NODE_OPTIONS="--max-old-space-size=1536"

# Static generation reads the catalog from source, not from the database, so no
# DB is needed at build time. DATABASE_URL only matters at runtime.
RUN npm run build

# ── Stage 3: runtime ────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat curl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# 384MB heap inside a 512MB container leaves headroom for the SQLite page cache
# and the native better-sqlite3 allocations, which live outside the V8 heap.
ENV NODE_OPTIONS="--max-old-space-size=384"

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# `output: standalone` emits only the files the server actually reaches —
# roughly 120MB instead of the full 800MB node_modules tree.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# The native module is not traced into standalone; copy it explicitly.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/bindings ./node_modules/bindings
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path

# Migration + seed tooling, so `docker compose exec` can run them in place.
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts ./drizzle.config.ts

RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data
VOLUME ["/app/data"]

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=4s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
