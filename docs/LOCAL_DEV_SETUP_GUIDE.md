# Local Dev Environment Setup Guide

**Scope:** Local development only. Staging and production on Azure come later.

---

## Mental model

Docker is **not** running your whole app. It only runs **PostgreSQL** so you don't have to install Postgres on your machine.

```text
┌──────────────────────────┐
│  Your computer (host)    │
│                          │
│  Next.js  →  :3000       │
│       │                  │
│       │ DATABASE_URL     │
│       ▼                  │
│  Docker container        │
│  PostgreSQL  →  :5432    │
└──────────────────────────┘
```

- `localhost:3000` — your app (`pnpm dev`)
- `localhost:5432` — the database (inside Docker)
- Connection string: `DATABASE_URL=postgresql://gmc:gmc@localhost:5432/gmc_site_access`

---

## Phase 0 — Prerequisites

### Node.js (LTS)

Node 20 or 22. Check:

```bash
node --version
```

### pnpm

```bash
pnpm --version
```

Install if missing (your preferred method on your OS).

### Docker

**Linux (e.g. Arch):**

```bash
sudo pacman -S docker docker-compose
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

Log out and back in after adding yourself to the `docker` group.

**macOS / Windows:** Install [Docker Desktop](https://www.docker.com/products/docker-desktop/).

Verify:

```bash
docker --version
docker compose version
docker ps
```

`docker ps` should show an empty table with no error.

---

## Phase 1 — Scaffold the Next.js app

From the project root (`gmc_site_access`):

```bash
pnpm create next-app@latest ./"
```


---

## Phase 2 — Docker Postgres

### Create `docker-compose.yml` at project root

```yaml
services:
  postgres:
    image: postgres:16
    container_name: gmc-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: gmc
      POSTGRES_PASSWORD: gmc
      POSTGRES_DB: gmc_site_access
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

| Line | Meaning |
|---|---|
| `image: postgres:16` | Official Postgres 16 image |
| `container_name: gmc-postgres` | Name shown in `docker ps` |
| `POSTGRES_*` | User, password, and database created on first start |
| `ports: "5432:5432"` | Host port 5432 → container port 5432 |
| `volumes: postgres_data` | Data persists across container restarts |

### Start the database

```bash
docker compose up -d
```

- `up` — start services
- `-d` — run in background

Check status:

```bash
docker ps
```

You should see `gmc-postgres` with status `Up`.

### Test connection

```bash
docker exec -it gmc-postgres psql -U gmc -d gmc_site_access
```

Expected prompt: `gmc_site_access=#`

Inside `psql`:

```sql
\dt    -- list tables (empty initially)
\q     -- quit
```

### Create `.env`

```env
DATABASE_URL=postgresql://gmc:gmc@localhost:5432/gmc_site_access
```

Add `.env` to `.gitignore`. Document the key in `.env.example` for other developers.

---

## Phase 3 — Drizzle

### Install packages

```bash
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit
```

### `drizzle.config.ts` (project root)

Paths match `context/architecture.md` (`lib/db/`, not `src/db/`):

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### `lib/db/client.ts`

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const client = postgres(process.env.DATABASE_URL!);

export const db = drizzle(client);
```

### `lib/db/schema.ts` (test table)

```ts
import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const visitors = pgTable("visitors", {
  id: uuid().defaultRandom().primaryKey(),
  firstName: text().notNull(),
  lastName: text().notNull(),
  createdAt: timestamp().defaultNow().notNull(),
});
```

Replace with domain tables later; this proves the pipeline works.

### Generate and apply migrations

Ensure Docker Postgres is running and `.env` exists:

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

- `generate` — SQL files under `drizzle/`
- `migrate` — applies them to local Postgres

### Verify table

```bash
docker exec -it gmc-postgres psql -U gmc -d gmc_site_access -c "\dt"
```

You should see `visitors`.

---

## Phase 4 — Run the app

```bash
pnpm dev
```

Open `http://localhost:3000`. A default Next.js page is fine — the goal is app + database + migrations working together.

---

## Day-to-day workflow

| Task | Command |
|---|---|
| Start database | `docker compose up -d` |
| Stop database (keeps data) | `docker compose down` |
| Run app | `pnpm dev` |
| Wipe database completely | `docker compose down -v` then `docker compose up -d` |

**Warning:** `docker compose down -v` deletes all local data. Only use on local dev.

Typical session:

```bash
docker compose up -d
pnpm dev
```

---


## Troubleshooting


## Checklist

- [ ] Node, pnpm, Docker installed — `docker ps` works
- [ ] Next.js app scaffolded
- [ ] `docker-compose.yml` added
- [ ] `docker compose up -d` — `psql` test passes
- [ ] `.env` with `DATABASE_URL`
- [ ] Drizzle packages installed
- [ ] `drizzle.config.ts`, `lib/db/client.ts`, `lib/db/schema.ts` created
- [ ] `pnpm drizzle-kit generate` and `migrate` succeed
- [ ] `\dt` shows `visitors`
- [ ] `pnpm dev` — app at `http://localhost:3000`

---
