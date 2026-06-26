# Daze

Multi-user web app that watches your contacts' birthdays and public holidays and
sends configurable [Pushover](https://pushover.net) notifications — day-of and/or a
user-defined set of lead times ahead (1 day, 1 week, 1 month, …). Google Contacts is
the first contact source; holidays come from a public holiday API now and ICS
calendars later. New birthdays are detected automatically but never notify until you
opt in.

## Stack

- **Next.js 16** (App Router) + **Tailwind v4** + **shadcn/ui**
- **Prisma 6** + **Postgres**
- **Auth.js** (email/password, with an optional linked Google account)
- **pg-boss** — Postgres-backed job queue (sync / materializer / dispatcher); no Redis
- **googleapis** (People API), **node-ical** (ICS later)

## Local development

```bash
# 1. Postgres — either Docker or a local instance
docker compose up -d db                 # publishes 5433, OR use local Postgres on 5432
cp .env.example .env                     # fill in secrets (openssl rand -hex 32)

# 2. Schema + seed
npm install
npm run db:migrate
npm run db:seed                          # demo@daze.local / password123

# 3. Run
npm run dev                              # web on http://localhost:3000
npm run worker:dev                       # scheduler (separate terminal)
```

## Self-hosting (Docker)

```bash
docker compose --profile full up --build
```

Point `DATABASE_URL` at your Postgres. The `worker` service runs
`prisma migrate deploy` on boot before starting the scheduler.

Daze ships as **one image** (`Dockerfile`). It runs the Next.js web server by
default (`npm start`, port `3000`); the worker is the *same image* with its
command overridden to `npx prisma migrate deploy && npm run worker`. Building one
image and running it two ways keeps deploys fast.

## Deploying on Coolify

The simplest path is the **Docker Compose** build pack — see below. If you prefer
two separate applications, create both from this repo using the **same**
`Dockerfile`; on the worker app set the start command to
`sh -c "npx prisma migrate deploy && npm run worker"`, give it no domain, and
disable its health check. Both need identical `DATABASE_URL` and
`DAZE_ENCRYPTION_KEY`.

### Docker Compose resource (recommended)

Use Coolify's **Docker Compose** build pack and point "Docker Compose Location"
at [`docker-compose.coolify.yml`](docker-compose.coolify.yml). It defines the
`web` and `worker` services (the image is built once and the worker reuses it)
and expects an **existing Postgres** via `DATABASE_URL`. Coolify fills in the domain via `SERVICE_*` magic variables;
you set the secrets under Environment Variables: `DATABASE_URL`, `AUTH_SECRET`,
`DAZE_ENCRYPTION_KEY`, `DAZE_PUSHOVER_APP_TOKEN`, `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`. The Postgres must be reachable from these containers on
the Docker network — if it's a separate Coolify resource, connect them to a
shared network and use its container/service name as the host in `DATABASE_URL`.

## Required configuration

| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (same on web + worker) |
| `AUTH_SECRET` | Auth.js session secret |
| `AUTH_URL` | Public base URL, e.g. `https://daze.example.com` |
| `DAZE_ENCRYPTION_KEY` | 32-byte hex; encrypts tokens at rest (same on web + worker) |
| `DAZE_APP_URL` | Public base URL for notification deep links (defaults to `AUTH_URL`) |
| `DAZE_PUSHOVER_APP_TOKEN` | One Pushover application token for the instance |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth with People API enabled |
| `GOOGLE_REDIRECT_URI` | `https://<domain>/api/connections/google/callback` |
| `DAZE_ALLOWED_EMAILS` | Optional registration allowlist |
| `DAZE_DRY_RUN` | `1` logs notifications instead of sending |
