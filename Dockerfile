# syntax=docker/dockerfile:1

############################
# 1) Dependencies-stage
############################
FROM node:22-bookworm-slim AS deps
WORKDIR /app

# better-sqlite3 er et native modul og skal kompileres -> kraever build-vaerktoejer.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
# Hvis der ikke findes en lockfile, falder vi tilbage til 'npm install'.
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

############################
# 2) Build-stage
############################
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

############################
# 3) Runner-stage (slankt image)
############################
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Standard DB-sti inde i containeren (peges mod en volume i Coolify).
ENV DATABASE_PATH=/app/data/bygherrer.db

# Kør som ikke-root bruger.
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# Standalone-output fra Next indeholder kun det noedvendige + en server.js.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Seed-script + entrypoint (seeder kun hvis databasen er tom).
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Datamappe til SQLite-volumen.
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

USER nextjs
EXPOSE 3000
VOLUME ["/app/data"]

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
