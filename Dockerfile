# syntax=docker/dockerfile:1
#
# Single application image for Daze. Runs the Next.js web server by default; the
# worker service overrides the command (`prisma migrate deploy && npm run
# worker`). Building ONE image instead of separate web + worker images roughly
# halves deploy time. The npm cache mount keeps `npm ci` fast across builds.

FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

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
