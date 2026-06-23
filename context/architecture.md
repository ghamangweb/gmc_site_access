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

```
/
├── AGENTS.md
├── context/
│   ├── project_overview.md
│   ├── architecture.md
│   ├── ui-tokens.md
│   ├── ui-rules.md
│   ├── ui-registry.md
│   ├── code-standards.md
│   ├── library-docs.md
│   ├── build-plan.md
│   └── progress-tracker.md
├── docs/
├── docker-compose.yml                    → local Postgres only (see build-plan.md Step 0)
├── .env.example
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── (auth)/                           → sign-in surface (Microsoft, PIN, unauthorized)
│   ├── dashboard/
│   │   └── [layer]/                      → per workflow role queues
│   └── api/
│       ├── engagements/
│       ├── documents/
│       ├── notifications/
│       └── status/
├── actions/
│   ├── engagements.ts                    → workflow mutations (Server Actions)
│   └── admin.ts                          → user provisioning, termination approval
├── lib/
│   ├── domain/
│   │   ├── engagement.ts                 → aggregate + invariants
│   │   ├── person.ts
│   │   ├── staff-user.ts
│   │   ├── workflow-states.ts
│   │   └── types.ts
│   ├── services/
│   │   ├── workflow-service.ts           → transitions, guards, path routing
│   │   ├── person-registry-service.ts    → passport lookup
│   │   ├── document-service.ts
│   │   ├── notification-service.ts       → dashboard alerts (sync)
│   │   └── termination-service.ts
│   ├── repositories/
│   │   ├── engagement-repository.ts
│   │   ├── person-repository.ts
│   │   └── staff-user-repository.ts
│   ├── azure/
│   │   ├── blob.ts
│   │   ├── queue.ts
│   │   └── graph-mail.ts
│   ├── email/
│   │   ├── enqueue.ts
│   │   ├── send.ts
│   │   └── templates.ts
│   ├── auth/
│   │   ├── entra.ts
│   │   ├── pin.ts
│   │   ├── session.ts
│   │   ├── guards.ts
│   │   └── middleware.ts
│   └── db/
│       └── client.ts
├── components/
│   ├── ui/
│   ├── layout/
│   └── workflow/
├── functions/
│   ├── check-visa-expiry/
│   ├── check-hospital-timeout/
│   └── send-email/
├── drizzle/
└── types/
    └── index.ts
```

---

## System Boundaries

| Folder | Owns |
|---|---|
| `app/` | Pages and API routes only. No business logic. |
| `actions/` | Server Actions for form mutations only. No file uploads. |
| `lib/domain/` | Entities, state enums, invariants. No React, no Azure SDK. |
| `lib/services/` | Business logic — workflow transitions, flagging, notifications. |
| `lib/repositories/` | PostgreSQL reads/writes. Called by services only. |
| `lib/azure/` | Thin Azure SDK clients only (Blob, Queue, Graph). |
| `lib/email/` | All outbound email — enqueue, templates, send. |
| `lib/auth/` | All authentication — Entra ID, PIN, session, middleware, role guards. |
| `components/` | UI only. No direct DB or workflow logic. |
| `functions/` | Timer and queue-triggered background jobs. |

---

## Data Flow

### Dashboard reads (Server Components)

```
app/dashboard/[layer]/page.tsx
        ↓
lib/services/workflow-service.ts
        ↓
lib/repositories/engagement-repository.ts
        ↓
PostgreSQL
```

### Workflow mutations (Server Actions)

Form submissions — transitions, approvals, layer field updates. No file bytes.

```
components/workflow/
        ↓
actions/engagements.ts
        ↓
lib/auth/guards.ts
        ↓
lib/services/workflow-service.ts
        ↓
lib/repositories/engagement-repository.ts
        ↓
PostgreSQL
        ↓
lib/services/notification-service.ts       → notifications table
lib/email/enqueue.ts                       → email-jobs queue
        ↓
revalidatePath or redirect
```

### Document uploads (API Routes)

Multipart file uploads only — never Server Actions.

```
components/workflow/
        ↓
app/api/documents/route.ts
        ↓
lib/auth/middleware.ts
        ↓
lib/services/document-service.ts
        ↓
lib/azure/blob.ts
        ↓
lib/services/workflow-service.ts
        ↓
lib/repositories/engagement-repository.ts  → documents table
```

### Background jobs (Azure Functions)

Timers and queue workers — no HTTP request from the browser.

```
functions/check-visa-expiry/
functions/check-hospital-timeout/
        ↓
lib/services/workflow-service.ts
        ↓
lib/repositories/engagement-repository.ts
        ↓
lib/services/notification-service.ts
lib/email/enqueue.ts
```

### Email delivery (Queue worker)

```
functions/send-email/
        ↓
lib/email/send.ts
        ↓
lib/azure/graph-mail.ts
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
| engagement_id | uuid | FK |
| recipient_role | text | |
| message | text | |
| read_at | timestamptz | |
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
- Sign-in flow: Entra → provisioned check → PIN → session → dashboard
- Unprovisioned users (`system_role = User`): `/unauthorized` only
- Middleware: `lib/auth/middleware.ts` — single pipeline for all protected routes
- Protected routes: `/dashboard/*` and all write API routes
- PIN reset: System Admin only
- All auth logic lives in `lib/auth/` — nowhere else

---

## Workflow States

Defined in `lib/domain/workflow-states.ts`.

**workflow_state:** `Draft`, `AtReception`, `AtHospital`, `AtTraining`, `AtSecurity`, `AwaitingProvisioning`, `Completed`

**access_state:** `Pending`, `Active`, `Expired`, `TerminationRequested`, `Terminated`

Path-specific transitions — see `context/project_overview.md` Core User Flow.

---

## Email Pattern

- All outbound mail through `lib/email/` — HTTP handlers never call Graph directly
- `notification-service` writes dashboard alerts (sync), then calls `lib/email/enqueue`
- `functions/send-email` dequeues and calls `lib/email/send`
- Timer jobs use the same enqueue API

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
