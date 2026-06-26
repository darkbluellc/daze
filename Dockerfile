# syntax=docker/dockerfile:1
#
# Single application image for Daze. Runs the Next.js web server by default; the
# worker service overrides the command (`prisma migrate deploy && npm run
# worker`). Building ONE image instead of separate web + worker images roughly
# halves deploy time. The npm cache mount keeps `npm ci` fast across builds.
#
# Debian "slim" (glibc) rather than Alpine (musl): Next.js's SWC/Turbopack
# native binaries, Prisma's engine, and @node-rs/argon2 all target glibc first,
# so this avoids a class of musl-only build/runtime failures.

FROM node:22-slim
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# openssl: Prisma engine. ca-certificates: outbound TLS (Google, Pushover, holidays).
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Install deps first so this layer is cached unless package*.json / schema change.
# The postinstall hook runs `prisma generate`, which needs the schema.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN --mount=type=cache,target=/root/.npm npm ci

# Build (source changes each deploy, so this is the unavoidable per-deploy cost).
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Web by default. `next start` binds 0.0.0.0 so the reverse proxy can reach it.
CMD ["npm", "run", "start", "--", "-H", "0.0.0.0", "-p", "3000"]
