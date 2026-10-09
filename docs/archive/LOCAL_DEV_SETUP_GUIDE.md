# Local Dev Environment Setup Guide

**Scope:** Local development only. Staging and production on Azure come later.

---

## Mental model

The database is **Neon** (serverless Postgres, hosted) — nothing to run locally.

```text
┌──────────────────────────┐
│  Your computer (host)    │
│                          │
│  Next.js  →  :3000       │
│       │                  │
│       │ DATABASE_URL     │
│       ▼                  │
│  Neon (hosted Postgres)  │
└──────────────────────────┘
```

- `localhost:3000` — your app (`bun dev`)
- Connection string: copy `.env.example` to `.env` and set `DATABASE_URL` to your Neon pooled connection string (Neon console → Connect)

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

### Neon account

Create a free project at [neon.tech](https://neon.tech) and grab the pooled connection
string from the console (Dashboard → Connect). No local install needed.

---

## Phase 1 — Scaffold the Next.js app

From the project root (`gmc_site_access`):

```bash
pnpm create next-app@latest ./"
```


---

## Phase 2 — Neon Postgres

### Environment file

Copy the example env file and set `DATABASE_URL`:

```bash
cp .env.example .env
```

Edit `.env` — paste your Neon pooled connection string into `DATABASE_URL`. `.env` is
gitignored; never commit secrets.

### Test connection

```bash
bunx drizzle-kit studio
```

Opens a browser UI against your Neon database. Empty tables initially (before migrations).

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

Ensure `.env` has a valid Neon `DATABASE_URL`:

```bash
bunx drizzle-kit generate
bunx drizzle-kit migrate
```

- `generate` — SQL files under `drizzle/`
- `migrate` — applies them to Neon

### Verify table

```bash
bunx drizzle-kit studio
```

You should see `visitors` in the browser UI.

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
| Run app | `bun dev` |
| Browse database | `bunx drizzle-kit studio` |

Typical session:

```bash
bun dev
```

---


## Troubleshooting


## Checklist

- [ ] Node, bun installed
- [ ] Next.js app scaffolded
- [ ] Neon project created, pooled connection string in hand
- [ ] `.env` created from `.env.example` with `DATABASE_URL` set to the Neon string
- [ ] Drizzle packages installed
- [ ] `drizzle.config.ts`, `lib/db/client.ts`, `lib/db/schema.ts` created
- [ ] `bunx drizzle-kit generate` and `migrate` succeed
- [ ] `drizzle-kit studio` shows `visitors`
- [ ] `bun dev` — app at `http://localhost:3000`

---
