FROM node:20-slim AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# ---- deps: install production + dev dependencies ----
FROM base AS deps

# Install build tools for native modules (better-sqlite3)
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---- build: compile Next.js app ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm build

# ---- runner: minimal production image ----
FROM base AS runner
ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone server
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy drizzle migrations + migration runner
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/docker/migrate.cjs ./migrate.cjs
COPY --from=builder /app/docker/entrypoint.sh ./entrypoint.sh

# Create writable directories for runtime data
RUN mkdir -p data public/uploads && \
    chown -R nextjs:nodejs data public/uploads

USER nextjs

EXPOSE 3000

ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

ENTRYPOINT ["./entrypoint.sh"]
