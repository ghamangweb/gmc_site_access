# Progress Tracker

Update this file after each slice is complete. Mark components done as they are built — not
in bulk at the end of a slice.
Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

---

## Step 0 — Scaffold ✅

- [x] Next.js 16, TypeScript strict, Tailwind, shadcn/ui, pnpm
- [x] Docker Compose PostgreSQL
- [x] Drizzle ORM configured; `src/lib/db/` in place
- [x] `.env.example` with `DATABASE_URL`
- [x] `@/` alias resolves to `./src/`
- [x] Branded landing page

---

## Slice 1 — Auth 🔲

**Spec:** `docs/superpowers/specs/2026-06-30-slice-1-auth-design.md`

### Schema
- [ ] `staff_users` table
- [ ] `notifications` table

### Seed
- [ ] `src/lib/db/seed.ts` — first System Admin

### Email infrastructure
- [ ] `src/lib/azure/graph-mail.ts`
- [ ] `src/lib/email/send.ts`
- [ ] `src/lib/email/templates.ts` (auth templates)

### UI tokens
- [ ] `context/ui-tokens.md` filled
- [ ] shadcn/ui base components installed (Button, Input, Label, Card, Form, Alert)
- [ ] `context/ui-registry.md` updated

### Auth library
- [ ] `src/lib/domain/types.ts` (SystemRole, WorkflowRole)
- [ ] `src/lib/auth/entra.ts`
- [ ] `src/lib/auth/pin.ts`
- [ ] `src/lib/auth/session.ts`
- [ ] `src/lib/auth/guards.ts`
- [ ] `src/app/api/auth/[...nextauth]/route.ts`
- [ ] `src/middleware.ts`

### Pages
- [ ] `src/app/(auth)/sign-in/page.tsx`
- [ ] `src/app/(auth)/pin/page.tsx`
- [ ] `src/app/(auth)/pin/setup/page.tsx`
- [ ] `src/app/(auth)/unauthorized/page.tsx`

### System Admin (minimal)
- [ ] `src/app/dashboard/admin/users/page.tsx`
- [ ] `src/app/dashboard/admin/layout.tsx`

### Server Actions
- [ ] `src/actions/auth.ts` (requestAccess, verifyPin, setupPin)
- [ ] `src/actions/admin.ts` (provisionUser, assignRoles, resetPin)

### Verification
- [ ] Full auth loop tested end-to-end (see spec Done When checklist)
- [ ] `tsc --noEmit` clean

---

## Slice 2 — Reception 🔲

*Not started. Start after Slice 1 verification is complete.*

---

## Slice 3 — Hospital 🔲

*Not started.*

---

## Slice 4 — Training School 🔲

*Not started.*

---

## Slice 5 — Security 🔲

*Not started.*

---

## Slice 6 — IT 🔲

*Not started.*

---

## Slice 7 — Access Termination 🔲

*Not started.*

---

## Slice 8 — Visa / Permit Expiry Flagging 🔲

*Not started.*

---

## Slice 9 — Hospital Timeout 🔲

*Not started.*

---

## Slice 10 — Async Email 🔲

*Not started.*
