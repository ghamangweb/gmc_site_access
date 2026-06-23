# Build Plan

Ordered steps for building GMC Site Access. Follow in order unless a step is already done.


---

## Step 0 — Project scaffold & local dev

**Owner:** Developer — scaffold the project manually. This step is a checklist of what to set up, not a script to run.

### Stack & structure

Use the stack and folder layout in `context/architecture.md`. Key points:

- Next.js (App Router), TypeScript strict, Tailwind + shadcn/ui
- PostgreSQL via Drizzle
- Azure services (Blob, Queue, Graph, Functions) — wired when needed; stubs are fine at first

### What to create

| Item | Notes |
|---|---|
| Next.js app | App Router; `app/`, `components/`, `lib/`, etc. per `context/architecture.md` |
| `package.json` + lockfile | pnpm |
| `docker-compose.yml` | PostgreSQL only — not the Next.js app |
| `.env.example` | `DATABASE_URL` and Azure env var placeholders |
| `.gitignore` | `.env`, `node_modules`, `.next`, and other build artifacts |

### Local dev layout

| Piece | Where it runs |
|---|---|
| PostgreSQL | Docker Compose → `localhost:5432` |
| Next.js app | Host machine → `localhost:3000` |

Local `DATABASE_URL`:

```text
postgresql://gmc:gmc@localhost:5432/gmc_site_access
```

`docker-compose.yml` should provision a Postgres 16 instance with user `gmc`, password `gmc`, database `gmc_site_access`.

### Azure services (local)

| Service | Approach |
|---|---|
| Entra ID | Azure app registration with dev redirect URIs |
| Blob / Queue / Graph | Azure dev resources, or skip/stub until needed |
| Azure Functions | Run separately when testing background jobs |

### Rules

- Do not run Next.js inside Docker for local dev.
- Do not commit `.env` or secrets.
- Blob containers stay private in all environments.

### Done when

- [ ] Folder structure matches `context/architecture.md`
- [ ] `pnpm dev` serves the app at `http://localhost:3000`
- [ ] Postgres is up via Docker and reachable at `localhost:5432`
- [ ] `.env.example` documents required env vars; `.env` is gitignored

---

## Step 1 — (pending)

First feature milestone after scaffold — TBD.
