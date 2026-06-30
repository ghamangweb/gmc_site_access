# Architecture

## Stack

| Layer            | Tool                                     | Purpose                                              |
| ---------------- | ---------------------------------------- | ---------------------------------------------------- |
| Framework        | Next.js (App Router)                     | UI + API routes + server logic                       |
| Database         | PostgreSQL                               | Persons, engagements, workflow, audit, staff users   |
| ORM              | Drizzle                                  | PostgreSQL access                                    |
| File storage     | Azure Blob Storage                       | Document uploads                                     |
| Background jobs  | Azure Functions                          | Visa expiry, hospital timeout, email worker          |
| Email            | Storage Queue + Microsoft Graph API      | Async outbound notifications                         |
| Authentication   | Entra ID + 4-digit PIN + role gates      | Staff access                                         |
| Styling          | Tailwind CSS + shadcn/ui                 | UI components and styling                            |
| Language         | TypeScript strict                        | Throughout                                           |

---

## Folder Structure

All Next.js application code lives under `src/`. The `@/` alias resolves to `./src/`.
Azure Functions and Drizzle migrations sit at project root (outside `src/`).

```
/
├── AGENTS.md
├── CLAUDE.md
├── context/
├── docs/
├── drizzle/                              → migration files
├── drizzle.config.ts
├── docker-compose.yml                    → local Postgres only (see build-plan.md Step 0)
├── .env.example
├── functions/                            → Azure Functions (not Next.js code)
│   ├── check-visa-expiry/
│   ├── check-hospital-timeout/
│   └── send-email/
└── src/
    ├── middleware.ts                     → single Next.js middleware pipeline
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx                      → redirect to dashboard or sign-in
    │   ├── (auth)/                       → sign-in, PIN, PIN setup, unauthorized
    │   ├── dashboard/
    │   │   ├── [layer]/                  → per workflow role queues
    │   │   └── admin/                    → System Admin pages (users, terminations)
    │   └── api/
    │       ├── auth/[...nextauth]/       → NextAuth catch-all route
    │       ├── documents/                → multipart upload handler
    │       └── notifications/            → mark-read endpoint
    ├── actions/
    │   ├── auth.ts                       → requestAccess, verifyPin, setupPin
    │   ├── engagements.ts                → workflow mutations (Server Actions)
    │   └── admin.ts                      → provisioning, PIN reset, termination approval
    ├── lib/
    │   ├── domain/
    │   │   └── types.ts                  → SystemRole, WorkflowRole, and shared type aliases
    │   ├── services/
    │   │   ├── workflow-service.ts       → transitions, guards, path routing
    │   │   ├── person-registry-service.ts → passport lookup
    │   │   ├── document-service.ts
    │   │   ├── notification-service.ts   → dashboard alerts (sync) + email enqueue
    │   │   └── termination-service.ts
    │   ├── azure/
    │   │   ├── blob.ts
    │   │   ├── queue.ts                  → used in Slice 10 (async email)
    │   │   └── graph-mail.ts             → Microsoft Graph email (sync for local dev)
    │   ├── email/
    │   │   ├── enqueue.ts                → used in Slice 10; direct send.ts call until then
    │   │   ├── send.ts
    │   │   └── templates.ts              → one function per workflow event
    │   ├── auth/
    │   │   ├── entra.ts                  → NextAuth config
    │   │   ├── pin.ts                    → hash, verify, validate, lockout
    │   │   ├── session.ts                → SessionUser type + getSession helper
    │   │   └── guards.ts                 → requireWriteAccess, requireSystemAdmin, etc.
    │   └── db/
    │       ├── client.ts
    │       ├── schema.ts                 → all Drizzle table definitions
    │       └── seed.ts                   → first System Admin seed (local only)
    └── components/
        ├── ui/                           → shadcn/ui components
        ├── layout/                       → sidebar, dashboard shell
        └── workflow/                     → per-layer forms and queue components
```

---

## System Boundaries

| Folder | Owns |
|---|---|
| `src/app/` | Pages and API routes only. No business logic. |
| `src/actions/` | Server Actions for form mutations only. No file uploads. |
| `src/lib/domain/` | Shared types and role/state string unions. No React, no Azure SDK, no Drizzle. |
| `src/lib/services/` | Business logic — workflow transitions, flagging, notifications. |
| `src/lib/azure/` | Thin Azure SDK clients only (Blob, Queue, Graph). |
| `src/lib/email/` | All outbound email — templates, send, enqueue (Slice 10). |
| `src/lib/auth/` | All authentication — Entra ID, PIN, session, guards. |
| `src/lib/db/` | Drizzle client, schema, seed. |
| `src/components/` | UI only. No direct DB or workflow logic. |
| `src/middleware.ts` | Single Next.js middleware pipeline — reads JWT token only, no DB calls. |
| `functions/` | Azure Functions — timer and queue-triggered background jobs. |

---

## Data Flow

### Dashboard reads (Server Components)

```
src/app/dashboard/[layer]/page.tsx
        ↓
src/lib/services/workflow-service.ts
        ↓
src/lib/db/schema.ts (Drizzle queries inline in services)
        ↓
PostgreSQL
```

### Workflow mutations (Server Actions)

Form submissions — transitions, approvals, layer field updates. No file bytes.

```
src/components/workflow/
        ↓
src/actions/engagements.ts
        ↓
src/lib/auth/guards.ts
        ↓
src/lib/services/workflow-service.ts
        ↓
PostgreSQL
        ↓
src/lib/services/notification-service.ts   → notifications table
src/lib/email/send.ts                      → Graph API (local dev, sync)
        ↓                                  → lib/email/enqueue.ts (Slice 10, async)
revalidatePath or redirect
```

### Document uploads (API Routes)

Multipart file uploads only — never Server Actions.

```
src/components/workflow/
        ↓
src/app/api/documents/route.ts
        ↓
src/middleware.ts (auth check)
        ↓
src/lib/services/document-service.ts
        ↓
src/lib/azure/blob.ts
        ↓
PostgreSQL (documents table)
```

### Background jobs (Azure Functions)

Timers and queue workers — no HTTP request from the browser.

```
functions/check-visa-expiry/
functions/check-hospital-timeout/
        ↓
src/lib/services/workflow-service.ts
        ↓
PostgreSQL
        ↓
src/lib/services/notification-service.ts
src/lib/email/send.ts (or enqueue.ts after Slice 10)
```

### Email delivery

**Local dev (Slices 1–9):** synchronous Graph API call from `src/lib/email/send.ts`

**Production (Slice 10+):** async queue worker

```
functions/send-email/
        ↓
src/lib/email/send.ts
        ↓
src/lib/azure/graph-mail.ts
        ↓
Microsoft Graph API
```

---

## PostgreSQL Database Schema

### `staff_users`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| entra_object_id | text | Unique |
| email | text | |
| display_name | text | |
| system_role | text | User \| Guest \| Admin \| SystemAdmin |
| workflow_roles | text[] | Receptionist, Hospital, etc. |
| pin_hash | text | Never plaintext |
| pin_failed_attempts | int | |
| pin_locked_until | timestamptz | Null when not locked |
| provisioned_at | timestamptz | When System Admin granted access |
| created_at | timestamptz | |

### `persons`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| passport_no | text | Unique lookup key |
| full_name | text | |
| date_of_birth | date | |
| gender | text | |
| nationality | text | |
| email | text | |
| phone | text | |
| emergency_contact_name | text | |
| emergency_contact_phone | text | |

### `engagements`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| person_id | uuid | FK → persons |
| access_purpose | text | work \| visit \| visit_mine |
| arrival_date | date | |
| departure_date | date | |
| workflow_state | text | See Workflow States |
| access_state | text | See Workflow States |
| is_visa_flagged | boolean | |
| reception_data | jsonb | Reception form fields — see `docs/form-fields.schema.json` |
| created_at | timestamptz | |

### `documents`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| engagement_id | uuid | FK |
| workflow_cycle_id | uuid | Nullable |
| doc_type | text | passport_biodata, hospital_fitness_form, etc. |
| blob_url | text | |
| uploaded_by | uuid | FK → staff_users |
| uploaded_at | timestamptz | |

### `stakeholder_approvals`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| engagement_id | uuid | FK |
| approver_role | text | HCM \| GMM \| DMD |
| approver_staff_user_id | uuid | FK |
| approver_name | text | |
| signature | text | |
| approved_at | timestamptz | |

### `workflow_cycles`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| engagement_id | uuid | FK |
| cycle_number | int | |
| archived_at | timestamptz | Null while active |

### `hospital_clearances`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| workflow_cycle_id | uuid | FK |
| clearance_status | text | Fit \| Unfit \| FitWithConditions |
| doctor_comments | text | Mandatory |
| clearance_date | timestamptz | |

### `workflow_transitions`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| engagement_id | uuid | FK |
| workflow_cycle_id | uuid | FK |
| from_state | text | |
| to_state | text | |
| performed_by | uuid | FK → staff_users |
| performed_at | timestamptz | |
| comments | text | Append-only |

### `notifications`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| recipient_staff_user_id | uuid | FK → staff_users |
| engagement_id | uuid | Nullable FK — null for auth notifications |
| message | text | |
| read_at | timestamptz | Null until read |
| created_at | timestamptz | |

### `termination_requests`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| engagement_id | uuid | FK |
| requested_by | uuid | FK → staff_users |
| reason | text | |
| status | text | Pending \| Approved \| Rejected |
| decided_by | uuid | Nullable |
| decided_at | timestamptz | |

---

## Blob Storage

| Path | Contents |
|---|---|
| `documents/engagements/{engagementId}/{docType}/{filename}` | All layer uploads |

Access: private containers; upload via `app/api/documents/`; view via short-lived SAS URLs.

---

## Authentication

- Provider: Microsoft Entra ID (org MFA) + 4-digit app PIN (hashed in `staff_users`)
- Sign-in flow: Entra → provisioned check → PIN confirmed → dashboard
- Unprovisioned users (`system_role = User`): `/unauthorized` — role selector + access request CTA
- Middleware: `src/middleware.ts` — single Next.js middleware; reads JWT only (no DB calls per request)
- Protected routes: `/dashboard/*`
- PIN lockout: 3 failed attempts → 15-minute lock
- PIN rules: no all-zeros, no repeating digits, no ascending/descending sequences
- First login: PIN setup screen before dashboard
- PIN reset: System Admin only — clears `pin_hash`; user re-creates on next login
- All auth logic lives in `src/lib/auth/` — nowhere else

---

## Workflow States

Defined as typed string unions in `src/lib/domain/types.ts`.

**workflow_state:** `Draft`, `AtReception`, `AtHospital`, `AtTraining`, `AtSecurity`, `AwaitingProvisioning`, `Completed`

**access_state:** `Pending`, `Active`, `Expired`, `TerminationRequested`, `Terminated`

Path-specific transitions — see `context/project_overview.md` Core User Flow.

---

## Email Pattern

- All outbound mail through `src/lib/email/` — HTTP handlers never call Graph directly
- `notification-service` writes dashboard alerts (sync), then calls `src/lib/email/send.ts`
- **Local dev (Slices 1–9):** `send.ts` calls `graph-mail.ts` directly (synchronous)
- **Production (Slice 10+):** `notification-service` calls `enqueue.ts` → Storage Queue → `functions/send-email` → `send.ts` → `graph-mail.ts`
- Timer jobs (visa expiry, hospital timeout) use the same email path

---

## Invariants

Rules the AI agent must never violate:

- Server Actions for form mutations — API routes for file uploads only
- Server Actions never call Azure SDK directly — go through services
- API route handlers contain no business logic — delegate to services
- Route handlers and Server Actions never write to DB directly — use repositories via services
- Engagement is the aggregate root — child records modified only through engagement service methods
- `workflow_transitions` is append-only — never update or delete audit rows
- One active `workflow_cycles` row per engagement at a time
- Email is async — enqueue via `lib/email/`; never block HTTP on Graph API
- API routes contain no UI logic — components contain no direct DB logic
- Secrets never in git
- Blob containers are private — no public document access
- All auth logic in `lib/auth/` — no scattered auth checks
