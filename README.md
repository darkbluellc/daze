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

Daze is **two images**: `Dockerfile` builds the web server (Next.js standalone,
listens on `3000`) and `Dockerfile.worker` builds the pg-boss scheduler. Don't
build a single Dockerfile expecting both — they are separate processes.

## Deploying on Coolify (or any PaaS)

Create **two applications from this repo** plus a Postgres database:

1. **Postgres** — create a Postgres resource; copy its internal connection URL.
2. **Web app** — Build Pack: Dockerfile · Dockerfile Location: `/Dockerfile` ·
   Ports Exposes: `3000` · assign your domain. Leave the start command blank
   (the image already runs `node server.js`).
3. **Worker app** — Build Pack: Dockerfile · Dockerfile Location:
   `/Dockerfile.worker` · no domain · **disable the health check** (it has no
   HTTP port).

Both apps need the **same** `DATABASE_URL` and `DAZE_ENCRYPTION_KEY` (the worker
decrypts tokens the web app encrypted). The worker runs migrations on boot, so
deploy it first (the web app self-heals once the schema exists). Set
`AUTH_URL` / `DAZE_APP_URL` to your public `https://` domain and add
`https://<domain>/api/connections/google/callback` to your Google OAuth client.

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
