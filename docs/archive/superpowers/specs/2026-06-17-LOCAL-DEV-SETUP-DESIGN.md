# Local Dev Setup — Design

**Date:** 2026-06-17
**Status:** Approved
**Scope:** How two developers run the app locally with minimal setup

---

## Decision

Use **Docker Compose for PostgreSQL only**. Next.js runs on the host via `pnpm dev`.

**Package manager:** pnpm

Production is unchanged: Azure App Service + managed PostgreSQL. Docker is **local dev only**.

---

## Why

| Goal | How Docker helps |
|---|---|
| Easy setup for 2 devs | No local Postgres install |
| Same DB on every machine | Fixed image + port in compose file |
| Fast iteration | App on host — hot reload, simple debugging |
| Matches production | Same engine (PostgreSQL) as Azure |

Docker does **not** run the Next.js app, Entra ID, Graph, or Blob locally on day one.

---

## Local stack

```text
docker compose up -d   → PostgreSQL on localhost:5432
pnpm dev               → Next.js on localhost:3000
```

Azure services in local dev:

| Service | Local approach |
|---|---|
| PostgreSQL | Docker Compose |
| Entra ID | Azure app registration (dev redirect URIs) |
| Blob / Queue / Graph | Azure dev resources, or stub/skip until needed |
| Azure Functions | Run separately when testing timers/email worker |

---

## Files to add at scaffold

| File | Purpose |
|---|---|
| `package.json` + lockfile | pnpm |
| `docker-compose.yml` | Postgres service only |
| `.env.example` | `DATABASE_URL` + Azure env var placeholders |
| `.gitignore` | `.env` |

### `docker-compose.yml` (shape)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-gmc}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in .env}
      POSTGRES_DB: ${POSTGRES_DB:-gmc_site_access}
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  postgres_data:
```

### `.env` / `DATABASE_URL`

Credentials live in `.env` (from `.env.example`). `DATABASE_URL` password must match `POSTGRES_PASSWORD`:

```text
postgresql://gmc:<your-password>@localhost:5432/gmc_site_access
```

---

## First-run steps (both devs)

```text
git clone <repo>
cp .env.example .env          # fill Azure values
docker compose up -d
pnpm install
pnpm dlx drizzle-kit migrate  # once migrations exist
pnpm dev
```

Reset local DB: `docker compose down -v && docker compose up -d`

---

## Where agents read this

| File | Content |
|---|---|
| `context/build-plan.md` | Step 0 — local dev setup (canonical for agents) |
| `context/architecture.md` | Lists `docker-compose.yml` in folder structure only |
| `docs/DEVOPS_NOTES.md` | Production Azure deploy (separate from local Docker) |

Docker is **not** a row in the stack table.

---

## Out of scope

- Full-stack Docker (app + DB in containers)
- Azurite (Blob/Queue emulator) — add only if Azure dev resources become painful
- SQLite as local database
