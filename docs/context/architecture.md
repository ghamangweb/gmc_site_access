# Architecture

## Stack

| Layer            | Tool                                     | Purpose                                              |
| ---------------- | ---------------------------------------- | ---------------------------------------------------- |
| Framework        | Next.js (App Router)                     | UI + API routes + server logic                       |
| Database         | PostgreSQL (Neon, serverless)            | Persons, engagements, workflow, audit, staff users   |
| ORM              | Drizzle                                  | PostgreSQL access                                    |
| File storage     | UploadThing                              | Document uploads (direct browser → storage)          |
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
    │   │   └── page.tsx                  → PUBLIC registration form (no auth, not under proxy protection)
    │   ├── (auth)/                       → sign-in, sign-out, PIN, PIN setup, unauthorized
    │   ├── dashboard/
    │   │   ├── layout.tsx                → shared shell: session + unread count → DashboardShell + auto breadcrumbs
    │   │   ├── page.tsx                  → role router (SystemAdmin → system-admin/users; others → placeholder)
    │   │   ├── (workflow)/               → route group — workflow-layer queues (no URL segment)
    │   │   │   ├── approvals/            → CSO/HCM/GMM/EM queue + /[engagementId] detail route (same EngagementDetail component as Reception's, different breadcrumb)
    │   │   │   ├── department/           → Department Head invitation console: send invite, log sent invitations, revoke
    │   │   │   ├── reception/
    │   │   │   ├── hospital/
    │   │   │   ├── training/
    │   │   │   ├── security/
    │   │   │   └── it/
    │   │   └── system-admin/             → System Admin pages (users, terminations); layout is guard-only
    │   └── api/
    │       ├── auth/[...nextauth]/       → NextAuth catch-all route
    │       ├── uploadthing/              → UploadThing file router (core.ts) + route handler — ALL uploads, both staff and public
    │       ├── documents/[documentId]/   → staff view (signed URL) + delete; /file streams bytes for the in-app viewer (inline, no-store, refuses navigations via Sec-Fetch-Dest); /download streams an attachment (unlinked from the UI, blocked for Security)
    │       └── register/documents/       → PUBLIC view + delete, authorized by invitation token only
    ├── actions/
    │   ├── auth.ts                       → requestAccess, verifyPin, setupPin, refreshSession
    │   ├── admin.ts                      → provisioning, PIN reset, termination approval
    │   ├── registration.ts               → issueInvitationAction/revokeInvitationAction (Department Head only), submitRegistrationRequestAction (public, no auth)
    │   ├── notifications.ts              → markNotificationRead, markAllNotificationsRead
    │   └── engagements.ts                → workflow mutations (Server Actions)
    ├── lib/
    │   ├── domain/
    │   │   ├── types.ts                  → SystemRole, WorkflowRole, and shared type aliases
    │   │   └── registration-error.ts     → RegistrationError — carries a translatable code out of the registration service
    │   ├── i18n/
    │   │   └── registration-dictionary.ts → 简体中文 strings for the PUBLIC /register form only, keyed by the English string
    │   ├── uploadthing/
    │   │   ├── client.ts                 → typed useUploadThing / uploadFiles (browser)
    │   │   └── api.ts                    → UTApi wrapper: signed view URLs + delete (server only)
    │   ├── services/
    │   │   ├── invitation-service.ts     → issue/revoke/consume invitation tokens, list by issuer
    │   │   ├── registration-service.ts   → consumes an invitation token + creates its Registration Request; notifies the matching Department Head(s) — no separate approval step
    │   │   ├── workflow-service.ts       → transitions, guards, path routing
    │   │   ├── person-registry-service.ts → passport lookup
    │   │   ├── document-service.ts
    │   │   ├── notification-service.ts   → dashboard alerts (sync) + email enqueue
    │   │   └── termination-service.ts
    │   ├── azure/
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
    │   │   └── guards.ts                 → requireWriteAccess, requireSystemAdmin, etc. — Department Head invitation actions use `requireWriteAccess("DepartmentHead")`, no dedicated `requireDepartmentHead` guard exists
    │   └── db/
    │       ├── client.ts
    │       ├── schema.ts                 → all Drizzle table definitions
    │       ├── seed.ts                   → first System Admin seed (local only)
    │       ├── seed-registrations.ts     → dummy submitted registrations for Reception's queue (local only)
    │       └── seed-approvals.ts         → converts seeded submissions into engagements awaiting stakeholder sign-off (local only)
    └── components/
        ├── ui/                           → shadcn/ui components
        ├── layout/                       → public shell, dashboard shell + top bar, breadcrumbs, page header
        └── workflow/                     → per-layer forms and queue components, including the public registration
                                             forms (`reception-form.tsx` reused for Foreign via its `publicToken` prop,
                                             `local-registration-form.tsx` for Local) — no separate `components/registration/`
                                             folder was created; the department queue is the invitation console (send/log/revoke),
                                             not a Registration-Request-approval queue
```

---

## Dashboard Layout
Every route under `/dashboard/*` is wrapped by `src/app/dashboard/layout.tsx` — the single place that reads the session, queries the unread notification count, and renders `DashboardShell` (top bar + `max-w-7xl` content column) with auto-generated breadcrumb(`DashboardBreadcrumbs`, derived from URL segments via a label map). Child layouts and pages never render their own shell or breadcrumbs:

- `dashboard/system-admin/layout.tsx` — `requireSystemAdmin` guard only, passes children through
- Pages render `PageHeader` (title / subtitle / actions) + content
- `dashboard/(workflow)/` — route group holding the six workflow-layer queues (`department`, `reception`, `hospital`, `training`, `security`, `it`), kept apart from `system-admin/` to mirror the System Roles vs. Workflow Roles split (`docs/context/project-overview.md`). Route groups add no URL segment, so `/dashboard/department`, `/dashboard/reception`, etc. are unchanged; no group-level layout is needed since `dashboard/layout.tsx` already covers every child route
- `dashboard/department/` (built 2026-10-09) is an invitation console, not a Registration
  Request queue — per `project-overview.md`, the invitation itself is the approval, so there
  is no "review and approve incoming requests" queue to build here at all. The page is an
  email-input form (`InviteForm`, with a Local/Foreign registration-type picker) plus a table
  of the signed-in Department Head's own sent `invitations`, each revocable. `/register` sits
  **outside** `/dashboard/*` and outside `(auth)/*` — it is not wrapped by the dashboard shell,
  has no session lookup, and is excluded from `src/proxy.ts` protection. It now resolves to a
  real registration form (`ReceptionForm` for Foreign, `LocalRegistrationForm` for Local),
  gated by the invitation token.


---

## System Boundaries


| Folder | Owns |
|---|---|
| `src/app/` | Pages and API routes only. No business logic. |
| `src/app/register/` | Public, unauthenticated page only — no session/auth code, no direct DB access. |
| `src/app/api/register/documents/` | The project's only unauthenticated write surface. Kept as its own file (rather than branching auth inside `api/documents/`) so the whole no-auth path is auditable in one place. Authorization is the invitation token: valid + unrevoked + unconsumed, and every operation is scoped to that invitation's own documents. Submitting consumes the token, which closes the window. |
| `src/actions/` | Server Actions for form mutations only. No file uploads. |
| `src/actions/registration.ts` | `submitRegistrationRequestAction` runs with no auth guard (public); `issueInvitationAction`/`revokeInvitationAction` require `requireWriteAccess("DepartmentHead")`. No `approveRegistrationRequest` action exists — the invitation is the approval. |
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

### Department Head sends an invitation (Server Action, staff auth)

```text
src/app/dashboard/(workflow)/department/invite-form.tsx
        ↓
src/actions/registration.ts (issueInvitationAction — requireWriteAccess("DepartmentHead"))
        ↓
src/lib/services/invitation-service.ts (issueInvitation)
        ↓
PostgreSQL (invitations table)
        ↓
src/lib/email/send.ts → Graph API (departmentInvitationTemplate, link carries the raw token)
```

### Public registration submission (Server Action, no auth)

```text
src/components/workflow/reception-form.tsx (Foreign) or local-registration-form.tsx (Local)
        ↓
src/actions/registration.ts (submitRegistrationRequestAction — no guard)
        ↓
src/lib/services/registration-service.ts (createRegistrationRequest)
        ↓
src/lib/services/invitation-service.ts (consumeInvitation — atomic, inside the same tx)
        ↓
PostgreSQL (invitations.consumed_at set + registration_requests row inserted, same transaction)
        ↓
notifications table (routed to matching Department Head(s) by department)
src/lib/email/send.ts → Graph API (registrationSubmittedTemplate)
```

**There is no separate Department-approval step after submission** — per
`project-overview.md`, the invitation itself is the approval. `createRegistrationRequest`
inserts the row with `status: "Approved"`, `approved_by`/`approved_at` set directly from the
invitation, in the same insert. No `approveRegistrationRequest` action or `requireDepartmentHead`
guard exists or is planned — don't add one. The idempotency guarantee this project's other
approval-style transitions get from a pre-check + transactional re-check comes here instead
from `consumeInvitation`'s atomic `UPDATE ... WHERE revoked_at IS NULL AND consumed_at IS NULL`:
a reused or concurrently-raced token simply can't produce a second row, by construction.

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
| email | text | Written from the Entra `email` claim on first sign-in, then refreshed on every sign-in when the claim differs |
| display_name | text | Entra `name` claim (falls back to `email`), refreshed on every sign-in when it differs — this is the name shown as GMC Liaison Person on a registration form |
| system_role | text | User \| Guest \| Admin \| SystemAdmin |
| workflow_roles | text[] | Receptionist, Hospital, DepartmentHead, etc. |
| department | text | Nullable — GMC Liaison Department this user heads; only set when `workflow_roles` includes `DepartmentHead`. Constrained to the canonical `GmcLiaisonDepartment` list (`src/lib/domain/types.ts`'s `GMC_LIAISON_DEPARTMENTS`) shared with `registration_requests.department` — not arbitrary text |
| pin_hash | text | Never plaintext; cleared on deactivation |
| deactivated_at | timestamptz | Nullable — soft delete. Twelve tables reference this row (audit trail), so a hard DELETE would either violate a foreign key or destroy attribution. A deactivated user cannot sign in and is excluded from every recipient/approver lookup |
| deactivated_by | uuid | Nullable — the System Admin who deactivated them |
| pin_failed_attempts | int | |
| pin_locked_until | timestamptz | Null when not locked |
| provisioned_at | timestamptz | When System Admin granted access |
| created_at | timestamptz | |

### `invitations` *(built 2026-10-09)*

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| department | text | Stamped from the issuing `staff_users.department` at send time — never chosen in the UI |
| registration_type | text | `Local` \| `Foreign` — chosen by the Department Head when sending; determines which registration form renders at `/register` for this token |
| email | text | Visitor's email, as entered by the Department Head |
| token_hash | text | Unique — SHA-256 hash of the raw token; the raw token appears only in the emailed link, never persisted |
| issued_by | uuid | FK → staff_users (the Department Head) |
| issued_at | timestamptz | |
| revoked_at | timestamptz | Nullable — status is derived (`revoked_at` set → Revoked, else Active), same convention as `workflow_cycles.archived_at` |
| consumed_at | timestamptz | Nullable — set atomically on a successful registration submission; a link with this set (or `revoked_at` set) can never be submitted again |

Issued via `src/lib/services/invitation-service.ts`, surfaced at `/dashboard/department`
(`src/app/dashboard/(workflow)/department/`). The emailed link
(`{AUTH_URL}/register?token=...`) resolves to `src/app/register/page.tsx`, which validates
the token and renders either `ReceptionForm` (Foreign — passport/nationality/visa fields)
or `LocalRegistrationForm` (Local — Ghana Card number instead of passport, no nationality/
visa fields) via `registration_type`. `persons.passport_no` is reused as a generic ID-number
column for Local visitors (holds the Ghana Card number) rather than adding a second identity
column — `registration_type` on the resulting `registration_requests` row is what disambiguates
which kind of ID it holds.

### `registration_requests` *(built 2026-10-09)*

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| invitation_id | uuid | Unique FK → `invitations` — enforces "one invitation link can back at most one request" at the DB level |
| department | text | Copied from the invitation at submission time — routes the notification to matching `staff_users.department` where `DepartmentHead` in `workflow_roles` |
| registration_type | text | `Local` \| `Foreign` — copied from the invitation at submission time |
| form_data | jsonb | Shaped like `ReceptionFormInput` (Foreign) or `LocalRegistrationFormInput` (Local) — see `registration-service.ts`. No document columns: visitor uploads live in `documents` keyed by `invitation_id`, reachable from here via `invitation_id` |
| status | text | Always inserted as `Approved` — there is no observable `PendingDepartmentApproval` row; the invitation itself was the approval, so `approved_by`/`approved_at` are set in the same insert |
| approved_by | uuid | FK → staff_users — the invitation's `issued_by` |
| engagement_id | uuid | Nullable FK → engagements — set when Reception converts the submission; null means still outstanding. This is what stops one submission becoming two Engagements |
| approved_at | timestamptz | |
| created_at | timestamptz | |

Created via `src/lib/services/registration-service.ts`'s `createRegistrationRequest`, inside
a transaction with `invitations.consumed_at` being set — a reused, revoked, or already-consumed
token makes the whole submission fail before any row is written.

### Encryption (2026-10-21)

Sensitive columns are encrypted by the app before they reach Postgres (see `library-docs.md`).
Encrypted: every `persons` field except `id`, `engagements.reception_data`,
`registration_requests.form_data`, `hospital_clearances.clearance_status` + `doctor_comments`,
`induction_records.trainer_comments`, `termination_requests.reason`, `invitations.email`,
`notifications.message`, `workflow_transitions.comments`. Not encrypted: staff users, dates/states,
ids. The table notes below show the logical type; the database column is `text`.
`hospital_clearances_clearance_status_check` was dropped (ciphertext cannot satisfy it).

### `persons`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| passport_no | text | Encrypted. Not the lookup key |
| passport_no_hash | text | Unique lookup key: HMAC of the normalised passport number |
| search_tokens | text[] | Hashed word prefixes of name + passport number, for the queue search |
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
| engagement_id | uuid | Nullable FK → engagements — a staff upload against a real Engagement |
| invitation_id | uuid | Nullable FK → invitations — a visitor's registration upload, made before any Engagement exists |
| workflow_cycle_id | uuid | Nullable — only set for engagement-parented uploads |
| doc_type | text | passport_biodata, hospital_fitness_form, etc. |
| blob_url | text | |
| file_key | text | UploadThing file key — what delete and signed-URL generation address |
| file_url | text | UploadThing file URL (`ufsUrl`); not publicly readable, every view goes through a 15-minute signed URL |
| file_name | text | Nullable — the original filename, captured at upload. Names the download and is what the UI shows |
| content_type | text | Nullable — the uploaded MIME type. Decides whether a preview renders as an image or a PDF frame |
| page_count | int | Nullable — counted at upload (`pdf-lib` for PDFs, 1 for images). Drives the leaf pile on previews; null = unknown, shown as one page |
| uploaded_by | uuid | Nullable FK → staff_users — **null means the visitor uploaded it themselves** |
| uploaded_at | timestamptz | |

**Exactly one parent**, enforced by the `documents_single_parent_check` CHECK
(`engagement_id` xor `invitation_id`). This replaced an earlier plan for a separate
`registration_documents` table: one table means Reception's hand-off is a pointer update
(`SET engagement_id = ?, invitation_id = NULL`) with no blob copying, and the missing-docs
guard, SAS viewing and delete all stay in one place instead of every downstream consumer
(Reception detail, Security's cross-layer audit view) having to query and merge two sources.

### `stakeholder_approvals`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| engagement_id | uuid | FK |
| approver_role | text | CSO \| HCM \| GMM \| EM \| Delegated (rows before 2026-10-26 may read DMD) |
| approver_staff_user_id | uuid | FK |
| approver_name | text | |
| signature | text | |
| approved_at | timestamptz | |

### `stakeholder_rejections` (2026-10-26)

History, one row per rejection (no unique constraint: a record can be rejected, re-requested and
rejected again). The live state is `engagements.approval_rejected_at`; a rejection also clears
`approval_requested_at` so the record leaves the stakeholder queue. Reception asking again clears
`approval_rejected_at`. Not a workflow_state move, so no `workflow_transitions` row.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| engagement_id | uuid | FK |
| approver_role | text | CSO \| HCM \| GMM \| EM \| Delegated |
| approver_staff_user_id | uuid | FK |
| approver_name | text | |
| reason | text | Encrypted |
| is_delegated | boolean | |
| rejected_at | timestamptz | |

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
| doctor_comments | text | Optional — stored as an empty string when none given (column stays `NOT NULL`, no migration; changed 2026-10-21) |
| clearance_date | timestamptz | |

### `induction_records`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| workflow_cycle_id | uuid | FK — cycle-scoped, not engagement-scoped, so a record that returns to Hospital (Slice 9's 3-month rule) keeps its earlier induction history |
| general_site_induction | boolean | |
| other_inductions | boolean | |
| trainer_comments | text | Optional — stored as an empty string when none given (column stays `NOT NULL`) |
| completed_at | timestamptz | |

Added 2026-10-12 with Slice 4. The build plan said "no new tables", but `workflow_transitions`
carries only a `comments` field — nowhere for the outcome, so this mirrors `hospital_clearances`.

### `access_provisionings`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| workflow_cycle_id | uuid | FK — cycle-scoped, matching `hospital_clearances` and `induction_records` |
| id_type | text | Passport \| Ghana Card \| Driver's Licence \| Voter ID |
| biometric_captured | boolean | |
| access_card_number | text | |
| access_card_expiry | date | Never later than the engagement's departure date, enforced in `activateAccess`. The "or earliest visa/permit expiry" half of that rule **cannot be enforced yet** — those dates are not stored anywhere until Slice 8 adds them |
| activated_at | timestamptz | |

Added 2026-10-12 with Slice 6. The plan said "no new tables", but the card number, expiry and
ID type have nowhere else to live — same reasoning as `induction_records` in Slice 4.

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
| requested_at | timestamptz | Added 2026-10-21 (migration `0024`) |
| status | text | Pending \| Revoked. No approval step: Reception requests, Security revokes (2026-10-21) |
| decided_by | uuid | Nullable. The Security user who revoked |
| decided_at | timestamptz | When access was revoked |

---

## Blob Storage

| Path | Contents |
|---|---|
| `documents/{documentId}/{docType}/{filename}` | All uploads, staff and visitor alike |

Keyed by the document row's own id, not its parent: a visitor's registration upload is
re-pointed from its invitation onto a real Engagement at Reception hand-off, and a
parent-keyed path would have to be moved (copy + delete) every time that happens. This path
never changes for the life of the file.

Access: private containers; view via short-lived SAS URLs. Staff upload via
`app/api/documents/` (session-guarded); visitors upload via
`app/api/register/documents/` (public, invitation-token-authorized).

---

## Notifications

Every workflow event writes a `notifications` row (the dashboard bell) **and** sends email via
Graph. The two are deliberately separate: the row is written inside the service, often in the
same transaction as the state change, while email is sent from the Server Action afterwards —
so a mail outage can never roll back a workflow transition.

| Event | Dashboard | Email | Recipients |
|---|---|---|---|
| Public registration submitted | ✅ | ✅ | Department Head for that department **and** all Receptionists (2026-10-12 — Reception was previously left out even though the submission lands in their queue) |
| Access/role requested | ✅ | ✅ | All System Administrators |
| User provisioned | — | ✅ | The provisioned user |
| PIN reset | — | ✅ | The affected user |
| Stakeholder approval requested | ✅ | ✅ | CSO, HCM, GMM, EM (all four) |
| Stakeholder approval rejected | ✅ | ✅ | All Receptionists (link to the record) + the Department Head who issued the invitation, if any ("Visit dashboard") |
| Approval received | ✅ | ✅ | Next layer per access path |
| Delegated approval requested / granted | ✅ | ✅ | Stakeholders + System Admin / the delegate |
| Hospital cleared / Unfit | ✅ | ✅ | Training School / Reception |
| Induction completed | ✅ | ✅ | Security |
| Termination requested | ✅ | ✅ | System Administrators |

**A role with no holders is reported, not swallowed.** `notifyStaff` and the email loops no-op
on an empty recipient list, so before 2026-10-12 requesting approval with no stakeholder
provisioned returned plain success while telling nobody — the engagement then sat in a queue
with no audience. Those actions now return a `warning` naming the missing role. The public
submission action is the exception: it **logs** the gap instead, because that warning would
otherwise show GMC's internal staffing problems to a visitor.

## Authentication

- Provider: Microsoft Entra ID (org MFA) + 4-digit app PIN (hashed in `staff_users`)
- Sign-in flow: Entra → provisioned check → PIN confirmed → dashboard
- Entra owns `display_name`/`email`: the `jwt` callback (`src/lib/auth/entra.ts`) inserts the
  `staff_users` row on first sign-in and, on later sign-ins, updates those two columns when
  the claim has changed. Empty claims are ignored rather than written over stored values,
  and the update is wrapped in try/catch — a failed refresh logs `[auth/entra]` and lets the
  stale row sign in. Nothing else about the row (role, workflow roles, department, PIN) is
  ever touched by sign-in; those stay System-Admin-owned
- Unprovisioned users (`system_role = User`): `/unauthorized` — role selector + access request CTA
- Proxy: `src/proxy.ts` — single Next.js proxy pipeline; reads JWT only (no DB calls per request); **excludes `/register`**, which has zero auth
- Protected routes: `/dashboard/*` (including `/dashboard/department`)
- `requireProvisioned` reads `deactivated_at` from the **database**, not the JWT (2026-10-12). Sessions live up to an hour, and removing someone's access has to take effect immediately rather than whenever their token expires. Every other guard funnels through it. The proxy still reads the JWT only — this runs in page/action code that is already querying
- `LAYER_ROLES.reception` is Receptionist-only (2026-10-12) — stakeholders have `/dashboard/approvals`, which is intentionally not in `LAYER_ROLES` so a delegated approver (who holds no workflow role) can still reach the engagement granted to them
- PIN lockout: 3 failed attempts → 15-minute lock
- PIN rules: no all-zeros, no repeating digits, no ascending/descending sequences
- First login: PIN setup screen before dashboard
- PIN reset: System Admin only — clears `pin_hash`; user re-creates on next login
- All auth logic lives in `src/lib/auth/` — nowhere else
- The auth boundary sits between `/register` (public) and `/dashboard/department` (first staff-authenticated layer)
---

## Workflow States

Defined as typed string unions in `src/lib/domain/types.ts`.

**workflow_state:** `Draft`, `AtReception`, `AtHospital`, `AtTraining`, `AtSecurity`, `Completed`, `Cancelled` (`AwaitingProvisioning` was removed 2026-10-21 with the IT stage; migration `0022` moves any such rows to `AtSecurity`.) (Receptionist-initiated soft-cancel of a still-unapproved Reception record — distinct from `access_state`'s termination path, which applies to records that have already progressed; added during Slice 2's build)

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
  System Admin pick more than one). Temporary coverage for an absent CSO/HCM/GMM/EM goes
  through Delegated Approval (Slice 2's one-off, audited, revocable grant) — never by
  permanently assigning someone a second workflow role
- `/register` is never wrapped by `src/proxy.ts` and never reads session/JWT state
- `registration_requests` has exactly one write path, ever — `createRegistrationRequest`
  (`registration-service.ts`), reached only through `submitRegistrationRequestAction`. There is
  no `approveRegistrationRequest` action, no `requireDepartmentHead` guard, and none should be
  added — per `project-overview.md` the invitation is the approval, so there is nothing left to
  separately approve or reject after submission.
- Idempotency for that one write path comes from `invitations.consumed_at` + `revoked_at`, checked
  and set atomically inside the same transaction that inserts the `registration_requests` row
  (`consumeInvitation`'s `UPDATE ... WHERE revoked_at IS NULL AND consumed_at IS NULL`) — a reused
  or concurrently-raced token can produce at most one row, by construction, the same guarantee
  this project's other approval-style transitions get from a pre-check + transactional re-check
  (`applyStakeholderApproval`/`recordHospitalClearance`)
- A `registration_requests` row is never promoted to an `engagements` row automatically — this
  hand-off (Reception picking up an approved request, doing the manual passport/Ghana-Card lookup,
  and creating the real Person/Engagement) is still unbuilt. `engagements` has no
  `registration_request_id` column yet; when that hand-off is built, it must enforce "at most one
  Engagement per Registration Request" the same way `stakeholder_approvals.engagement_id` already
  guards against double-approval elsewhere in this schema
- `registration_requests.department` and `staff_users.department` share one canonical
  `GmcLiaisonDepartment` list — defined as a TS string-literal union in `src/lib/domain/types.ts`
  (`GMC_LIAISON_DEPARTMENTS`): Mining, Mine Maintenance (EME), Carbonate Plant, Assay Lab,
  Information Technology, Human Capital, Social Responsibility & External Relations. `staff_users`
  gained a nullable `department` column and `notifications` a nullable `requestedDepartment`
  column (added for the System Admin provisioning flow — see `progress-tracker.md`'s Slice 1
  entry) ahead of `registration_requests` itself, which doesn't exist yet. Every value in this
  list must have a seeded/provisioned Department Head before the Department-Head-invitation
  feature ships; no runtime "no Department Head found" rejection path is required
- A `documents` row has exactly one parent — `engagement_id` xor `invitation_id`, enforced by
  a DB CHECK. Never write both or neither. `uploaded_by` is null precisely when the visitor
  uploaded it themselves; staff uploads always set it
- Blob paths are keyed by the document's own id, never by its parent — so re-pointing a
  visitor's upload onto an Engagement at Reception hand-off is a pure DB update with no blob
  copy. Don't reintroduce a parent id into the path
- Required registration documents are enforced server-side in `createRegistrationRequest`
  (via `getMissingRegistrationDocTypes`) **before** the token is consumed, so a submission
  blocked on a missing document leaves the invitation link still usable. The forms' disabled
  submit button is a convenience mirror of that check, never the enforcement
- `invitations.token_hash` stores only a SHA-256 hash — the raw token exists only in the
  emailed link, never persisted. `revokeInvitation` scopes its `UPDATE` to `issued_by =
  <the calling Department Head's own staff_user id>`, so one Department Head can never see
  or revoke another's invitations, even by guessing an id — mirrors `stakeholder_approvals`'
  caller-scoping discipline elsewhere in this codebase
