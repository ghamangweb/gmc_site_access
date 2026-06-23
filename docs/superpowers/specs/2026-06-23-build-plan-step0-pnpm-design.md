# Build Plan Step 0 — Scaffold Guide (Design)

**Date:** 2026-06-23  
**Status:** Approved  
**Scope:** Step 0 documents *what* the developer should set up; the developer scaffolds manually

---

## Decision

| Area | Decision |
|---|---|
| Package manager | pnpm (project decision — no install/setup instructions in build plan) |
| Step 0 role | Developer checklist: files, local dev layout, done criteria |
| Scaffold owner | Developer — not automated by agents |
| Tooling how-to | Out of scope (no Corepack, no command recipes) |

---

## What Step 0 covers

- Stack and folder structure pointers (`context/architecture.md`)
- Files to create (`docker-compose.yml`, `.env.example`, etc.)
- Local dev layout (Postgres in Docker, app on host)
- Done-when checklist

## What Step 0 does not cover

- How to install pnpm, Node, or Docker
- Exact CLI commands for scaffolding
- Agent-driven project generation

---

## Canonical source

`context/build-plan.md` — agents and developers read Step 0 there.
