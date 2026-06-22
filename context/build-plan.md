# Build Plan

Ordered steps for scaffolding and building GMC Site Access. Agents: follow in order unless a step is already done.

---

## Step 0 — Local dev environment

**Docker runs PostgreSQL only.** The Next.js app runs on the host.

### Prerequisites

- Node.js (LTS)
- Docker + Docker Compose
- Azure app registration values for Entra ID (dev redirect URIs)

### First run

```text
cp .env.example .env
docker compose up -d
npm install
npx drizzle-kit migrate    # after drizzle schema exists
npm run dev
```

App: `http://localhost:3000`  
Postgres: `localhost:5432`

### `DATABASE_URL` (local)

```text
postgresql://gmc:gmc@localhost:5432/gmc_site_access
```

### Reset local database

```text
docker compose down -v
docker compose up -d
```

### Notes

- Do not run Next.js inside Docker for local dev.
- Blob, Queue, and Graph use Azure dev resources (or stubs) — not Docker on day one.
- Full spec: `docs/superpowers/specs/2026-06-17-LOCAL-DEV-SETUP-DESIGN.md`

---

## Step 1 — (pending)

Scaffold Next.js app, folder structure per `context/architecture.md`.
