# Architecture

## Stack

| Layer            | Tool                                     | Purpose                                              |
| ---------------- | ---------------------------------------- | ---------------------------------------------------- |
| Framework        | Next.js (App Router)                     | UI + API routes + server logic                       |
| Database         | PostgreSQL (Neon, serverless)            | Persons, engagements, workflow, audit, staff users   |
| ORM              | Drizzle                                  | PostgreSQL access                                    |
| File storage     | Azure Blob Storage                       | Document uploads                                     |
| Background jobs  | Azure Functions                          | Visa expiry, hospital timeout, email worker          |
| Email            | Storage Queue + Microsoft Graph API      | Async outbound notifications                         |
| Authentication   | Entra ID + 4-digit PIN + role gates      | Staff access                                         |
| Styling          | Tailwind CSS + shadcn/ui                 | UI components and styling                            |
| Language         | TypeScript strict                        | Throughout                                           |

## Tooling

Dev-time only — none of this ships to production.

| Layer            | Tool                                     | Purpose                                              |
| ---------------- | ---------------------------------------- | ---------------------------------------------------- |
| Package manager  | Bun                                       | Install, run, lockfile (`bun.lock`)                  |
| Secrets          | dotenvx (`.env.development`, encrypted)  | Committed, encrypted env vars — see library-docs.md  |
| Git hooks        | Lefthook                                 | pre-commit checks + build (`lefthook.yml`)           |
| Linting          | Biome + Oxlint (`anti-slop` plugin)      | Formatting/lint + AI-code-smell checks               |

---

## Folder Structure

All Next.js application code lives under `src/`. The `@/` alias resolves to `./src/`.
Azure Functions and Drizzle migrations sit at project root (outside `src/`).

```
/
├── AGENTS.md
├── CLAUDE.md
├── docs/
│   ├── context/                          → the 9 "Read Before Anything Else" docs (this file included)
│   └── archive/                          → superseded docs (old local-dev guide, SRS, IT report, etc.)
├── drizzle/                              → migration files
├── drizzle.config.ts
├── .env.development                      → committed, dotenvx-encrypted (decrypt key in local-only .env.keys)
├── .oxlintrc.json                        → Oxlint config (anti-slop plugin)
├── lefthook.yml                          → git hooks (replaces pre-commit)
├── tools/oxlint/anti-slop/               → vendored Oxlint plugin (see its own UPSTREAM.md)
├── functions/                            → Azure Functions (not Next.js code)
│   ├── check-visa-expiry/
│   ├── check-hospital-timeout/
│   └── send-email/
└── src/
    ├── proxy.ts                          → single Next.js proxy (auth) pipeline — excludes `/register`
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx                      → redirect to dashboard or sign-in
    │   ├── register/
    │   │   └── page.tsx                  → PUBLIC pre-registration form (no auth, not under proxy protection)
    │   ├── (auth)/                       → sign-in, sign-out, PIN, PIN setup, unauthorized
    │   ├── dashboard/
    │   │   ├── layout.tsx                → shared shell: session + unread count → DashboardShell + auto breadcrumbs
    │   │   ├── page.tsx                  → role router (SystemAdmin → system-admin/users; others → placeholder)
    │   │   ├── (workflow)/               → route group — workflow-layer queues (no URL segment)
    │   │   │   ├── department/           → Department Head queue — read-only + single Approve action
    │   │   │   ├── reception/
    │   │   │   ├── hospital/
    │   │   │   ├── training/
    │   │   │   ├── security/
    │   │   │   └── it/
    │   │   └── system-admin/             → System Admin pages (users, terminations); layout is guard-only
    │   └── api/
    │       ├── auth/[...nextauth]/       → NextAuth catch-all route
    │       └── documents/                → multipart upload handler
    ├── actions/
    │   ├── auth.ts                       → requestAccess, verifyPin, setupPin, refreshSession
    │   ├── admin.ts                      → provisioning, PIN reset, termination approval
    │   ├── registration.ts               → submitRegistrationRequest (public, no auth), approveRegistrationRequest (Department Head only)
    │   ├── notifications.ts              → markNotificationRead, markAllNotificationsRead
    │   └── engagements.ts                → workflow mutations (Server Actions)
    ├── lib/
    │   ├── domain/
    │   │   └── types.ts                  → SystemRole, WorkflowRole, and shared type aliases
    │   ├── services/
    │   │   ├── registration-service.ts   → creates Registration Request, routes to Department Head, approval → hands off to Reception
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
    │   │   └── templates.ts              → one function per workflow event (includes registration-submitted, registration-approved)
    │   ├── auth/
    │   │   ├── entra.ts                  → NextAuth config
    │   │   ├── pin.ts                    → hash, verify, validate, lockout
    │   │   ├── session.ts                → SessionUser type + getSession helper
    │   │   └── guards.ts                 → requireWriteAccess, requireSystemAdmin, requireDepartmentHead, etc.
    │   └── db/
    │       ├── client.ts
    │       ├── schema.ts                 → all Drizzle table definitions
    │       └── seed.ts                   → first System Admin seed (local only)
    └── components/
        ├── ui/                           → shadcn/ui components
        ├── layout/                       → public shell, dashboard shell + top bar, breadcrumbs, page header
        ├── registration/                 → public pre-registration form (Sections 1–4), no upload fields
        └── workflow/                     → per-layer forms and queue components (department queue is read-only + Approve button)
```

---

## Dashboard Layout
Every route under `/dashboard/*` is wrapped by `src/app/dashboard/layout.tsx` — the single place that reads the session, queries the unread notification count, and renders `DashboardShell` (top bar + `max-w-5xl` content column) with auto-generated breadcrumb(`DashboardBreadcrumbs`, derived from URL segments via a label map). Child layouts and pages never render their own shell or breadcrumbs:

- `dashboard/system-admin/layout.tsx` — `requireSystemAdmin` guard only, passes children through
- Pages render `PageHeader` (title / subtitle / actions) + content
- `dashboard/(workflow)/` — route group holding the six workflow-layer queues (`department`, `reception`, `hospital`, `training`, `security`, `it`), kept apart from `system-admin/` to mirror the System Roles vs. Workflow Roles split (`docs/context/project-overview.md`). Route groups add no URL segment, so `/dashboard/department`, `/dashboard/reception`, etc. are unchanged; no group-level layout is needed since `dashboard/layout.tsx` already covers every child route
- `dashboard/department/` renders the queue as read-only rows with a single **Approve** action per Registration Request — no edit form, no reject control, even for Admin. `/register` sits **outside** `/dashboard/*` and outside `(auth)/*` — it is not wrapped by the dashboard shell, has no session lookup, and is excluded from `src/proxy.ts` protection.


---

## System Boundaries


| Folder | Owns |
|---|---|
| `src/app/` | Pages and API routes only. No business logic. |
| `src/app/register/` | Public, unauthenticated page only — no session/auth code, no direct DB access. |
| `src/actions/` | Server Actions for form mutations only. No file uploads. |
| `src/actions/registration.ts` | `submitRegistrationRequest` runs with no auth guard (public); `approveRegistrationRequest` requires `requireDepartmentHead` guard. |
| `src/lib/domain/` | Shared types and role/state string unions. No React, no Azure SDK, no Drizzle. |
| `src/lib/services/` | Business logic — workflow transitions, flagging, notifications, registration routing. |
| `src/lib/azure/` | Thin Azure SDK clients only (Blob, Queue, Graph). |
| `src/lib/email/` | All outbound email — templates, send, enqueue (Slice 10). |
| `src/lib/auth/` | All authentication — Entra ID, PIN, session, guards. |
| `src/lib/db/` | Drizzle client, schema, seed. |
| `src/components/` | UI only. No direct DB or workflow logic. |
| `src/proxy.ts` | Single Next.js proxy pipeline (Next 16 renamed `middleware` → `proxy`; `nodejs` runtime only) — reads JWT token only, no DB calls. Explicitly excludes `/register`. |
| `functions/` | Azure Functions — timer and queue-triggered background jobs. |

---

## Data Flow

### Public registration submission (Server Action, no auth)

```text
src/components/registration/
        ↓
src/actions/registration.ts (submitRegistrationRequest — no guard)
        ↓
src/lib/services/registration-service.ts
        ↓
PostgreSQL (registration_requests table)
        ↓
src/lib/services/notification-service.ts   → notifications table (routed to matching Department Head(s))
src/lib/email/send.ts                      → Graph API
```

### Department approval (Server Action, staff auth)

```text
src/components/workflow/ (department queue — read-only rows + Approve button)
        ↓
src/actions/registration.ts (approveRegistrationRequest)
        ↓
src/lib/auth/guards.ts (requireDepartmentHead)
        ↓
src/lib/services/registration-service.ts
        ↓
PostgreSQL (registration_requests.status → 'Approved')
        ↓
src/lib/services/notification-service.ts   → notifies Reception
src/lib/email/send.ts
```

`approveRegistrationRequest` must guard the transition the same way
`applyStakeholderApproval`/`recordHospitalClearance` do: pre-check
`status === "PendingDepartmentApproval"`, re-check inside a transaction, and
only set `approved_by`/`approved_at` and enqueue the Reception notification
on the transition that actually wins. Repeated calls (retry) or concurrent
calls (two staff holding `DepartmentHead` for the same department) must no-op
rather than re-transition an already-approved row or send a second
notification.

### Dashboard reads (Server Components)

```text
src/app/dashboard/[layer]/page.tsx
        ↓
src/lib/services/workflow-service.ts   (or registration-service.ts for the department layer)
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
src/proxy.ts (auth check)
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
| workflow_roles | text[] | Receptionist, Hospital, DepartmentHead, etc. |
| department | text | Nullable — GMC Liaison Department this user heads; only set when `workflow_roles` includes `DepartmentHead`. Constrained to the canonical `GmcLiaisonDepartment` list (values TBD) shared with `registration_requests.department` — not arbitrary text |
| pin_hash | text | Never plaintext |
| pin_failed_attempts | int | |
| pin_locked_until | timestamptz | Null when not locked |
| provisioned_at | timestamptz | When System Admin granted access |
| created_at | timestamptz | |

### `registration_requests` *(new)*

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| department | text | Selected GMC Liaison Department — routes notification to matching `staff_users.department` where `DepartmentHead` in `workflow_roles`. Constrained to the same canonical `GmcLiaisonDepartment` list as `staff_users.department` (list TBD); stored as `text` per this project's existing text+TS-union convention — no DB enum/FK |
| form_data | jsonb | Sections 1–4 data — mirrors the relevant subset of `docs/form-fields.schema.json` |
| status | text | `PendingDepartmentApproval` \| `Approved` |
| approved_by | uuid | Nullable FK → staff_users |
| approved_at | timestamptz | Nullable |
| created_at | timestamptz | |

No document columns — public form accepts data entry only, no uploads.

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
| registration_request_id | uuid | Nullable FK → registration_requests — reference/evidence only, never auto-fills Reception fields. Unique (like `stakeholder_approvals.engagement_id`): a Registration Request backs at most one Engagement — Reception's UI must treat an already-linked Registration Request as consumed |
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
| requester_staff_user_id | uuid | Nullable FK → staff_users — who the notification is about (e.g. access requester); null for non-request notifications |
| requested_role | text | Nullable — the role the requester chose on `/unauthorized`; lets the Provision dialog confirm without re-prompting. Null for non-request notifications |
| engagement_id | uuid | Nullable FK — null for auth notifications and registration-request notifications |
| registration_request_id | uuid | Nullable FK → registration_requests — required (non-null) for both the registration-submitted notification (to the matching Department Head) and the registration-approved notification (Reception handoff); null for every other notification type |
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

Access: private containers; upload via `app/api/documents/`; view via short-lived SAS URLs. No blob paths exist for `registration_requests` — the public form never uploads files.

---

## Authentication

- Provider: Microsoft Entra ID (org MFA) + 4-digit app PIN (hashed in `staff_users`)
- Sign-in flow: Entra → provisioned check → PIN confirmed → dashboard
- Unprovisioned users (`system_role = User`): `/unauthorized` — role selector + access request CTA
- Proxy: `src/proxy.ts` — single Next.js proxy pipeline; reads JWT only (no DB calls per request); **excludes `/register`**, which has zero auth
- Protected routes: `/dashboard/*` (including `/dashboard/department`)
- PIN lockout: 3 failed attempts → 15-minute lock
- PIN rules: no all-zeros, no repeating digits, no ascending/descending sequences
- First login: PIN setup screen before dashboard
- PIN reset: System Admin only — clears `pin_hash`; user re-creates on next login
- All auth logic lives in `src/lib/auth/` — nowhere else
- The auth boundary sits between `/register` (public) and `/dashboard/department` (first staff-authenticated layer)
---

## Workflow States

Defined as typed string unions in `src/lib/domain/types.ts`.

**workflow_state:** `Draft`, `AtReception`, `AtHospital`, `AtTraining`, `AtSecurity`, `AwaitingProvisioning`, `Completed`, `Cancelled` (Receptionist-initiated soft-cancel of a still-unapproved Reception record — distinct from `access_state`'s termination path, which applies to records that have already progressed; added during Slice 2's build)

**access_state:** `Pending`, `Active`, `Expired`, `TerminationRequested`, `Terminated`

`registration_requests.status` (`PendingDepartmentApproval` \| `Approved`) is a separate, simpler state machine — it is not part of `workflow_state`/`access_state` since a Registration Request is not yet an Engagement.

Path-specific transitions — see `docs/context/project-overview.md` Core User Flow.

---

## Email Pattern

- All outbound mail through `src/lib/email/` — HTTP handlers never call Graph directly
- `notification-service` writes dashboard alerts (sync), then calls `src/lib/email/send.ts`
- **Local dev (Slices 1–9):** `send.ts` calls `graph-mail.ts` directly (synchronous)
- **Production (Slice 10+):** `notification-service` calls `enqueue.ts` → Storage Queue → `functions/send-email` → `send.ts` → `graph-mail.ts`
- Timer jobs (visa expiry, hospital timeout) use the same email path
- Registration submission and Department approval use the same path (`templates.ts` gains `registration-submitted` and `registration-approved` templates)
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
- Every insert into `documents` or `workflow_transitions` must derive
  `workflowCycleId` from a query scoped to the same `engagementId` being
  written (never pass an independently-sourced cycle id) — this is what
  currently keeps the two FKs consistent without a DB-level composite
  constraint. Revisit adding a real composite unique key on
  `workflow_cycles(engagement_id, cycle_number)` plus composite FKs on
  `documents`/`workflow_transitions` once Slice 9 (Hospital Timeout) lands
  and a second `workflow_cycles` row per engagement becomes possible — a
  2026-07-16 review flagged this as a data-integrity gap, but confirmed no
  current code path can trigger it (see Slice 9's build-plan.md entry)
- Email is async — enqueue via `lib/email/`; never block HTTP on Graph API
- API routes contain no UI logic — components contain no direct DB logic
- Secrets only ever committed in dotenvx-encrypted form (`.env.development`'s `encrypted:...`
  values) — the decryption key (`.env.keys`) is never committed, and no plaintext secret value
  is ever committed
- Blob containers are private — no public document access
- All auth logic in `lib/auth/` — no scattered auth checks
- A staff user holds at most one workflow role at a time — the Provision UI is
  single-select (`workflow_roles` stays `text[]` in the schema, but the UI never lets a
  System Admin pick more than one). Temporary coverage for an absent HCM/GMM/DMD goes
  through Delegated Approval (Slice 2's one-off, audited, revocable grant) — never by
  permanently assigning someone a second workflow role
- `/register` is never wrapped by `src/proxy.ts` and never reads session/JWT state
- `registration_requests` has exactly one write path after creation — `approveRegistrationRequest`,
  guarded by `requireDepartmentHead` and scoped to the approver's own `department`. No reject/edit
  action exists anywhere in the codebase for this table.
- `approveRegistrationRequest` is idempotent: repeated or concurrent calls (including from multiple
  staff holding `DepartmentHead` for the same department) must never double-transition a
  `registration_requests` row or send a duplicate Reception notification — guarded the same way as
  `applyStakeholderApproval`/`recordHospitalClearance` (pre-check + transactional re-check)
- A `registration_requests` row is never promoted to an `engagements` row automatically — Reception's
  manual passport lookup and Engagement creation always happen explicitly, even when an approved
  Registration Request exists
- `engagements.registration_request_id` is unique — a Registration Request backs at most one
  Engagement, enforced by a DB-level unique constraint the same way `stakeholder_approvals.engagement_id`
  guards against double-approval; Reception's engagement-creation flow must not let an already-linked
  Registration Request be consumed a second time
- `registration_requests.department` and `staff_users.department` share one canonical
  `GmcLiaisonDepartment` list (the list itself is defined separately, not in this document) — every
  value in that list must have a seeded/provisioned Department Head before the feature ships; no
  runtime "no Department Head found" rejection path is required
