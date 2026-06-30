# Slice 1 — Auth Design Spec

**Date:** 2026-06-30
**Status:** Approved for implementation
**Build plan ref:** `context/build-plan.md` → Slice 1

---

## Overview

Slice 1 delivers the complete authentication loop for GMC Site Access. When this slice is
done, a new staff member can sign in with Microsoft, request access from a System Admin,
get provisioned, set a PIN, and reach the dashboard. A System Admin (seeded into the DB) can
receive access requests and provision users without needing any other slice to exist first.

This slice also sets up email (Microsoft Graph API) and UI tokens — both are used by every
subsequent slice.

---

## Scope

**In scope:**
- `staff_users` and `notifications` tables
- Seed script for first System Admin
- NextAuth + Entra ID (Azure AD) sign-in
- 4-digit PIN: create, verify, validate, lockout
- Next.js middleware pipeline
- Auth guard functions
- Sign-in, PIN entry, PIN setup, unauthorized pages
- System Admin: user list, provision user, assign roles, reset PIN
- Email infrastructure (Graph API, synchronous for local dev)
- UI token definitions + base shadcn/ui component install

**Out of scope:**
- Delegated approval granting (Slice 2)
- Termination approval (Slice 7)
- Any workflow or engagement features
- Async email queue (Slice 10)

---

## Data Model

### `staff_users`

```sql
id                uuid        PK default gen_random_uuid()
entra_object_id   text        NOT NULL UNIQUE
email             text        NOT NULL
display_name      text        NOT NULL
system_role       text        NOT NULL  -- 'User' | 'Guest' | 'Admin' | 'SystemAdmin'
workflow_roles    text[]      NOT NULL DEFAULT '{}'
pin_hash          text        NULL      -- null until user creates PIN
pin_failed_attempts int       NOT NULL DEFAULT 0
pin_locked_until  timestamptz NULL      -- null when not locked
provisioned_at    timestamptz NULL      -- null for system_role = User
created_at        timestamptz NOT NULL DEFAULT now()
```

### `notifications`

```sql
id                      uuid        PK default gen_random_uuid()
recipient_staff_user_id uuid        NOT NULL FK → staff_users
engagement_id           uuid        NULL      -- null for auth notifications
message                 text        NOT NULL
read_at                 timestamptz NULL
created_at              timestamptz NOT NULL DEFAULT now()
```

### Domain types (`src/lib/domain/types.ts`)

```typescript
export type SystemRole = 'User' | 'Guest' | 'Admin' | 'SystemAdmin';

export type WorkflowRole =
  | 'Receptionist'
  | 'HCM'
  | 'GMM'
  | 'DMD'
  | 'HospitalStaff'
  | 'TrainingStaff'
  | 'SecurityStaff'
  | 'ITStaff';
```

---

## Seed Script

**File:** `src/lib/db/seed.ts`

Inserts one `SystemAdmin` row directly into `staff_users`. Used once locally after running
migrations to bootstrap the first admin before the provisioning UI is testable.

The seed reads `SEED_ADMIN_ENTRA_ID` and `SEED_ADMIN_EMAIL` from `.env`. Running it twice
must be idempotent — upsert on `entra_object_id`.

Add to `.env.example`:
```
SEED_ADMIN_ENTRA_ID=
SEED_ADMIN_EMAIL=
```

Add a seed script to `package.json`: `"db:seed": "tsx src/lib/db/seed.ts"`
Run with: `pnpm db:seed` (requires `tsx` as a dev dependency: `pnpm add -D tsx`)

---

## Email Infrastructure

Set up once in this slice. Every subsequent slice adds templates to `templates.ts`.

### `src/lib/azure/graph-mail.ts`

Thin wrapper around Microsoft Graph API. Accepts `{ to, subject, html }` and sends one email.
Uses client credentials flow (`AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`,
`GRAPH_SENDER_EMAIL`).

Synchronous for local dev — no queue. Slice 10 moves this to async.

### `src/lib/email/send.ts`

```typescript
export async function sendEmail(template: EmailTemplate): Promise<void>
```

Renders the template and calls `graph-mail.ts`. Called by `notification-service` (Slice 2
onwards) and directly from Server Actions in this slice.

### `src/lib/email/templates.ts`

```typescript
// Auth templates (added in this slice)
export function accessRequestedTemplate(opts: {
  requesterName: string;
  requesterEmail: string;
  requestedRole: string;
}): EmailTemplate

export function accessApprovedTemplate(opts: {
  recipientName: string;
  systemRole: SystemRole;
  workflowRoles: WorkflowRole[];
}): EmailTemplate

export function pinResetTemplate(opts: {
  recipientName: string;
}): EmailTemplate
```

### Required env vars (add to `.env.example`)

```
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
GRAPH_SENDER_EMAIL=          # shared mailbox or licensed user with Mail.Send
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
```

---

## UI Tokens

Before building any auth pages, fill `context/ui-tokens.md` with the CSS variables for:
- Brand colours (primary, secondary, destructive, muted, background, foreground, border)
- Border radius, font sizes, spacing scale

Install and configure shadcn/ui base components used in this slice:
`Button`, `Input`, `Label`, `Card`, `CardHeader`, `CardContent`, `Form`, `Alert`

Update `context/ui-registry.md` with each component installed.

---

## Auth Library + Config

### `src/app/api/auth/[...nextauth]/route.ts`

NextAuth catch-all route. Exports `GET` and `POST` handlers from the NextAuth config.
Required by NextAuth App Router integration.

### `src/lib/auth/entra.ts`

NextAuth configuration. Azure AD provider using `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`,
`AZURE_CLIENT_SECRET`. JWT strategy.

Callbacks:
- `signIn`: always allow (provisioned check happens in middleware, not here)
- `jwt`: on first sign-in, look up or create `staff_users` row by `entra_object_id`; embed
  `staffUserId`, `systemRole`, `workflowRoles`, `pinConfirmed: false` in token
- `session`: expose `SessionUser` shape from token

### `src/lib/auth/session.ts`

```typescript
export type SessionUser = {
  staffUserId: string;
  systemRole: SystemRole;
  workflowRoles: WorkflowRole[];
  pinConfirmed: boolean;
};

export async function getSession(): Promise<SessionUser | null>
```

`getSession` is a server-side helper used by Server Components and Server Actions.

### `src/lib/auth/pin.ts`

```typescript
export function validatePin(pin: string): { valid: boolean; reason?: string }
// Rejects: '0000', all same digit, ascending (1234), descending (4321),
// any two-digit repeating pattern (1122), or sequential run (1235)

export async function hashPin(pin: string): Promise<string>
// bcrypt, cost factor 12

export async function verifyPin(pin: string, hash: string): Promise<boolean>

export function isLocked(user: Pick<StaffUser, 'pinLockedUntil'>): boolean

export async function handleFailedAttempt(staffUserId: string): Promise<{
  locked: boolean;
  attemptsRemaining: number;
}>
// Increments pin_failed_attempts; if reaches 3, sets pin_locked_until = now + 15 min

export async function clearLockout(staffUserId: string): Promise<void>
// Resets pin_failed_attempts = 0, pin_locked_until = null on correct PIN
```

### `src/lib/auth/guards.ts`

```typescript
export async function requireProvisioned(): Promise<SessionUser>
// Throws if no session or system_role = User

export async function requirePinConfirmed(): Promise<SessionUser>
// Throws if !pinConfirmed

export async function requireSystemAdmin(): Promise<SessionUser>
// Throws if system_role !== SystemAdmin

export async function requireWriteAccess(layer: WorkflowRole): Promise<SessionUser>
// Throws if user is Guest or doesn't have the specified workflow role
```

All guards return the `SessionUser` on success so callers don't need a second `getSession` call.

---

## Middleware Pipeline

**File:** `src/middleware.ts` (Next.js middleware — runs on the edge)

Protected path pattern: `/dashboard/:path*`

Pipeline for every protected request:

```
1. Valid NextAuth session?         No → redirect /sign-in
2. system_role = User?             Yes → redirect /unauthorized
3. pinConfirmed in token?          No → redirect /pin
4. Accessing /dashboard/admin/*?   system_role !== SystemAdmin → 403
5. Accessing /dashboard/[layer]/*? user lacks that workflow role → 403
6. Pass through
```

The middleware reads from the JWT token only — no DB call on every request.
PIN confirmation is stored in the token and refreshed on successful PIN entry.

---

## Pages

### `src/app/(auth)/sign-in/page.tsx`

Server Component. Renders a centred card with the GMC logo and a single
"Sign in with Microsoft" button (calls `signIn('azure-ad')` from a Client Component).
Redirects to `/dashboard` if already authenticated.

### `src/app/(auth)/pin/page.tsx`

Client Component (`"use client"`). 4-digit PIN entry.

- Auto-focuses first digit; advances focus on each digit entry
- Submits to `verifyPinAction` Server Action on 4th digit
- On failure: shows remaining attempts or lockout duration
- On success: NextAuth token updated with `pinConfirmed: true`; redirect to dashboard

### `src/app/(auth)/pin/setup/page.tsx`

Client Component. First-login PIN creation.

- Two PIN fields: "Set PIN" and "Confirm PIN"
- Validates blocked patterns client-side (fast feedback) and server-side (authoritative)
- Blocked pattern error messages are specific: "PIN cannot be all the same digit", etc.
- On success: PIN stored (hashed); redirect to dashboard

### `src/app/(auth)/unauthorized/page.tsx`

Client Component. Shown to `system_role = User` users.

- Displays a message explaining they need System Admin approval
- Role selector: dropdown of available system roles (Guest, Admin) and workflow roles
- "Request Access" button → calls `requestAccessAction`
- On submit: success message shown; button disabled to prevent double-requests
- If user has already submitted a request (check via notifications or a flag), show
  "Your request is pending" instead of the form

---

## System Admin — User Management

Minimal implementation: just enough to close the auth loop.

### `src/app/dashboard/admin/users/page.tsx`

Server Component. Lists all `staff_users` rows.

Columns: name, email, system role, workflow roles, status (provisioned / pending), actions.

Pending access requests (unread notifications to System Admin) highlighted at the top.

Actions per row:
- **Provision** — opens a modal to set system_role + workflow_roles; calls `provisionUserAction`
- **Reset PIN** — calls `resetPinAction`; shows confirmation dialog first

### `src/app/dashboard/admin/layout.tsx`

Wraps all `/dashboard/admin/*` pages. Calls `requireSystemAdmin()` guard at the top of the
layout — non-System-Admin users hitting any admin route get a 403 page.

---

## Server Actions

### `src/actions/auth.ts`

```typescript
export async function requestAccessAction(formData: FormData): Promise<ActionResult>
```

- Reads `requestedRole` from formData
- Finds all `SystemAdmin` users in `staff_users`
- Writes a `notifications` row for each System Admin
- Calls `sendEmail(accessRequestedTemplate(...))` for each System Admin
- Returns `{ success: true }` or `{ success: false, error: string }`

### `src/actions/admin.ts`

```typescript
export async function provisionUserAction(
  staffUserId: string,
  systemRole: SystemRole,
  workflowRoles: WorkflowRole[]
): Promise<ActionResult>
// - requireSystemAdmin() guard
// - Updates staff_users: system_role, workflow_roles, provisioned_at = now()
// - Sends access approved email to the provisioned user
// - revalidatePath('/dashboard/admin/users')

export async function resetPinAction(staffUserId: string): Promise<ActionResult>
// - requireSystemAdmin() guard
// - Sets pin_hash = null, pin_failed_attempts = 0, pin_locked_until = null
// - Sends PIN reset email to the user
// - revalidatePath('/dashboard/admin/users')
```

Internal PIN verification action (not in admin.ts):

```typescript
// src/actions/auth.ts
export async function verifyPinAction(pin: string): Promise<ActionResult>
// - getSession(); if no session → error
// - if isLocked(user) → return error with lockout duration
// - verifyPin(pin, user.pin_hash)
//   - correct: clearLockout(); update JWT pinConfirmed = true; return success
//   - wrong: handleFailedAttempt(); return error with attempts remaining

export async function setupPinAction(pin: string, confirmPin: string): Promise<ActionResult>
// - Validates pins match
// - validatePin(pin) — blocked patterns
// - hashPin(pin) → store in staff_users
// - Update JWT pinConfirmed = true
// - Return success
```

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Graph API email fails | Log error with `[email]` prefix; do NOT block the action; user still gets provisioned |
| PIN entry while locked | Return remaining lockout time in minutes; do not increment counter further |
| Duplicate access request | Check for existing unread notification before writing; return "already pending" |
| NextAuth session error | Middleware catches missing session; redirect to `/sign-in` |
| System Admin guard fails | Return 403 page — do not expose which admin routes exist |

---

## Verification

Run these checks when the slice is complete:

- [ ] `pnpm db:generate` + `pnpm db:migrate` → `staff_users` and `notifications` tables created
- [ ] `pnpm tsx src/lib/db/seed.ts` → System Admin row inserted; idempotent on re-run
- [ ] New Microsoft account signs in → lands on `/unauthorized` with role selector
- [ ] Role selected + "Request Access" submitted → System Admin receives dashboard notification + email
- [ ] System Admin signs in (seeded account) → sees access request in `/dashboard/admin/users`
- [ ] System Admin provisions user with role → provisioned user receives email
- [ ] Provisioned user signs in → lands on `/pin/setup`
- [ ] Blocked PIN (e.g. `1234`) rejected with specific error message
- [ ] Valid PIN set → redirected to dashboard; session active
- [ ] Sign out and sign in again → `/pin` entry (not setup)
- [ ] Enter wrong PIN 3 times → 15-minute lockout message displayed
- [ ] After 15 min (or manual DB reset) → can enter PIN again
- [ ] Correct PIN → `pinConfirmed = true`; idle for 1 hour → session expires; redirected to `/sign-in`
- [ ] System Admin resets a user's PIN → user lands on `/pin/setup` on next login
- [ ] Non-SystemAdmin hitting `/dashboard/admin/*` → 403
- [ ] `tsc --noEmit` → zero errors

---

## Developer Steps

Manual steps a human must complete — the AI cannot do these.

### Before the AI starts building

**1. Azure App Registration** (Azure Portal)

- Go to Entra ID → App Registrations → New registration
- Add redirect URI: `http://localhost:3000/api/auth/callback/azure-ad` (type: Web)
- Grant API permission: `User.Read` (Microsoft Graph, Delegated) → Grant admin consent
- Create a Client Secret under Certificates & Secrets; copy the value immediately (shown once)
- Note down: Directory (Tenant) ID, Application (Client) ID, Client Secret value
- For `GRAPH_SENDER_EMAIL`: the mailbox account must have a Microsoft 365 licence with `Mail.Send`

**2. Create `.env.local`** (copy from `.env.example`, fill in real values)

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/gmc_site_access
NEXTAUTH_SECRET=          # generate: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
AZURE_TENANT_ID=          # from App Registration
AZURE_CLIENT_ID=          # from App Registration
AZURE_CLIENT_SECRET=      # from App Registration
GRAPH_SENDER_EMAIL=       # licensed M365 mailbox with Mail.Send
SEED_ADMIN_ENTRA_ID=      # your Entra Object ID: Azure Portal → Users → your user → Object ID
SEED_ADMIN_EMAIL=         # your email address
```

**3. Start Docker**

```bash
docker compose up -d
```

### After the AI writes the schema

**4. Run migrations**

```bash
pnpm db:generate
pnpm db:migrate
```

**5. Seed the first System Admin**

```bash
pnpm db:seed
```

Idempotent — safe to re-run.

### After the AI configures shadcn/ui

**6. Initialise shadcn/ui** (interactive prompt — cannot be scripted)

```bash
npx shadcn@latest init
```

When prompted: Style → Default · Base colour → Neutral · CSS variables → Yes

**7. Install Slice 1 components**

```bash
npx shadcn@latest add button input label card form alert
```

### During testing

**8.** Sign in with a real Microsoft account and confirm the Entra redirect works.

**9.** Sign in as the seeded System Admin and confirm access to `/dashboard/admin/users`.
