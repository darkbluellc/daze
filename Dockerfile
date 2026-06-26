# syntax=docker/dockerfile:1
#
# Web image (Next.js). The LAST stage is `runner`, so a plain `docker build`
# (which is what Coolify/Nixpacks run with no --target) produces the web server.
# The pg-boss worker has its own Dockerfile.worker.

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

# ---- runner (Next.js web — final stage) -------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
# Bind to all interfaces so the reverse proxy can reach the container.
ENV HOSTNAME=0.0.0.0
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Ensure the Prisma query engine ships with the standalone bundle.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
