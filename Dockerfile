# syntax=docker/dockerfile:1

# ---- base -------------------------------------------------------------------
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

# ---- deps -------------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---- builder ----------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- runner (Next.js web) ---------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

# ---- worker (pg-boss scheduler) --------------------------------------------
# Keeps full deps + source so it can run migrations and tsx the worker entry.
FROM base AS worker
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
# Apply pending migrations on boot, then start the scheduler.
CMD ["sh", "-c", "npx prisma migrate deploy && npm run worker"]
