# Progress Tracker

Update this file after each slice is complete. Mark components done as they are built — not
in bulk at the end of a slice.
Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

A slice's heading ✅ means implementation is complete (code written, `tsc`/`bun run build` clean) —
it does not by itself mean the slice has been manually verified end-to-end in a browser. Check
that slice's own Verification section: an unchecked "Manual in-browser walkthrough" item there
means that step is still outstanding regardless of the heading.

---

## Step 0 — Scaffold ✅

- [x] Next.js 16, TypeScript strict, Tailwind, shadcn/ui, Bun
- [x] Neon PostgreSQL (serverless)
- [x] Drizzle ORM configured; `src/lib/db/` in place
- [x] `.env.development` (dotenvx-encrypted, committed) with `DATABASE_URL`
- [x] `@/` alias resolves to `./src/`
- [x] Branded landing page

---

## Slice 1 — Auth ✅

**Spec:** `docs/superpowers/specs/2026-06-30-slice-1-auth-design.md`
**Reviewed:** 2026-07-09 — see `/review` findings; architecture-boundary gap
(Server Actions/Server Components querying Drizzle directly) and a cold-provisioning
UI bug were both fixed as part of this slice's closeout.

**Department Head + GMC Liaison Department (2026-10-09):** Added `"DepartmentHead"` to
`WorkflowRole` and a canonical `GmcLiaisonDepartment` TS union (`GMC_LIAISON_DEPARTMENTS`
in `src/lib/domain/types.ts`) — Mining, Mine Maintenance (EME), Carbonate Plant, Assay
Lab, Information Technology, Human Capital, Social Responsibility & External Relations —
filling the "values TBD" gap `architecture.md` had left open. `staff_users` gained a
nullable `department` column; `notifications` gained a nullable `requestedDepartment`
column. Self-service `/unauthorized` requests and the System Admin's Provision Dialog
both gained a conditional department `Select` when `"DepartmentHead"` is chosen — see
`ui-registry.md`'s Provision Dialog + Radio badge group entries. Scoped narrowly to the
provisioning/self-request layer — the Department Head invitation console, `/register`
page, and `registration_requests` table (described in `architecture.md` but unbuilt)
remain a separate, not-yet-planned slice. `reception-form.tsx`'s free-text
`gmcLiaisonDept` field was deliberately left unconverted — a later task.

### Schema
- [x] `staff_users` table
- [x] `notifications` table
- [x] `notifications.requester_staff_user_id` — replaces email-substring matching for
      access-request tracking
- [x] `staff_users.department`, `notifications.requestedDepartment` (2026-10-09)

### Seed
- [x] `src/lib/db/seed.ts` — first System Admin

### Email infrastructure
- [x] `src/lib/azure/graph-mail.ts`
- [x] `src/lib/email/send.ts`
- [x] `src/lib/email/templates.ts` (auth templates)

### UI tokens
- [x] `docs/context/ui-tokens.md` filled
- [x] shadcn/ui base components installed (Button, Input, Label, Card, Form, Alert
      — plus DropdownMenu, Sonner, Avatar, Breadcrumb, Table, RadioGroup, Badge,
      Dialog for the System Admin UI and dashboard shell)
- [x] `docs/context/ui-registry.md` updated

### Auth library
- [x] `src/lib/domain/types.ts` (SystemRole, WorkflowRole)
- [x] `src/lib/auth/entra.ts`
- [x] `src/lib/auth/pin.ts` (also owns `setPinHash`/`resetPin` — PIN persistence
      stays inside the `lib/auth/` boundary rather than a generic service)
- [x] `src/lib/auth/session.ts`
- [x] `src/lib/auth/guards.ts`
- [x] `src/app/api/auth/[...nextauth]/route.ts`
- [x] `src/proxy.ts` (Next 16 renamed `middleware` → `proxy`)

### Services (added during review closeout — Server Actions/Components no
longer query Drizzle directly, per `architecture.md`'s invariants)
- [x] `src/lib/services/auth-service.ts` — staff user lookups, access-request
      logic, provisioning
- [x] `src/lib/services/notification-service.ts` — unread count, recent list,
      mark-read

### Pages
- [x] `src/app/(auth)/sign-in/page.tsx`
- [x] `src/app/(auth)/pin/page.tsx`
- [x] `src/app/(auth)/pin/setup/page.tsx`
- [x] `src/app/(auth)/unauthorized/page.tsx`
- [x] `src/app/(auth)/unauthorized/session-refresher.tsx` — auto-refreshes a stale
      session when the DB shows the user was provisioned while their JWT still
      said `User`, redirecting to `/pin` or `/pin/setup` without a click

### System Admin (minimal)
- [x] `src/app/dashboard/system-admin/users/page.tsx`
- [x] `src/app/dashboard/system-admin/layout.tsx`

### Server Actions
- [x] `src/actions/auth.ts` (requestAccess, verifyPin, setupPin)
- [x] `src/actions/auth.ts` — `refreshSessionAction` (patches a live JWT with fresh
      `systemRole`/`workflowRoles` after out-of-band provisioning)
- [x] `src/actions/admin.ts` (provisionUser — sets system_role + workflow_roles in
      one call; resetPin)

### Verification
- [x] Full auth loop verified end-to-end via code review (see spec Done When
      checklist) — live Entra ID sign-in still requires the Developer Steps in
      the spec (App Registration, `.env.local`)
- [x] `tsc --noEmit` clean

---

## Slice 2 — Reception ✅

**Built as a prerequisite for Slice 3** — see
`.claude/plans/plan-and-build-slice-playful-brook.md` for the full plan,
including two schema additions beyond `architecture.md`'s original spec:
`engagements` gained 4 nullable delegation-grant columns (`delegatedApproverId`,
`delegationGrantedBy`, `delegationGrantedAt`, `delegationReason`) to hold an
active-but-not-yet-consumed delegated approval grant, and
`stakeholder_approvals` gained `isDelegated`/`delegatedBy`/`delegatedAt`/
`delegationReason` to record a consumed one. `build-plan.md` already
documents both of these (Slice 2's schema table and Server Actions list);
`architecture.md`'s `engagements`/`stakeholder_approvals` schema tables
still need a follow-up sync pass to add these columns.

**UI refinement pass (2026-07-09):** `Calendar`/`Popover` installed for a
shadcn-based `DatePicker` (replaces native `<input type="date">`); added
`PhoneInput` — a compound native code input + number input sharing one
bordered box (`bg-accent` code side, `Popover`-driven codes-only quick-pick
that overwrites but never restricts the freely-typable code field); added
`toTitleCase`/`toSentenceCase` casing enforcement on every free-text field in
the Reception form (full-caps typing is now structurally impossible); visa
type changed from free text to a `Select`; `remarks` is no longer required;
`document-selector.tsx`'s upload button moved onto the same row as its
checkbox (far right) instead of stacking below, and create-mode (`/reception/new`)
now lets the user pick a file the instant a box is checked instead of
requiring the record to be saved first — the file is held in memory and
uploaded right after the engagement is created, same as before just
resequenced; `Button` gained a typed `ref` prop (React 19 ref-as-prop, no
`forwardRef`) since shadcn's `Calendar` forwards a `ref` to its nav buttons.
See `ui-registry.md` for full pattern notes on each.

**Cancel vs. Terminate split (2026-07-09):** What was briefly a "Terminate
Access" → "Cancel Engagement" relabel turned out to be two genuinely
different features, not one renamed button. Added: `workflowState`
`"Cancelled"` (soft-cancel — the engagement row and all its child rows stay
intact for audit, `workflow_transitions` gets a normal append-only row, per
`architecture.md`'s "never delete audit rows" invariant), `cancelEngagement`/
`cancelEngagementAction` (Receptionist-only, no reason, only while
`AtReception` and unapproved, confirmed via `window.confirm` — see
`CancelEngagementButton`), and moved the original SRS "Request Termination"
flow (System Admin approval, unchanged `requestTerminationAction`/
`termination_requests`) onto the Reception queue table as a row action (see
`ReceptionRow`) instead of the engagement detail page. `ui-tokens.md`'s
status-bucket table and `architecture.md`'s `workflow_state` list both updated
for `Cancelled`.

**Duplicate-passport guard (2026-07-09):** A passport reused for a genuinely
new visit (prior engagement already `Completed`/`Cancelled`) is intentional —
Person is a reusable identity. Blocked instead: starting a second engagement
while an earlier one for that passport is still active (any other
`workflowState`). Enforced in `createEngagement` (`workflow-service.ts`,
throws a human-readable error either way) and surfaced early via "Look up" —
see `ui-registry.md`'s `ReceptionForm` notes.

**Blob Storage auth switched to connection string (2026-07-09):** Actual local
dev setup used a Storage account connection string (Access Keys blade), not
the AAD role-assignment approach originally documented — `blob.ts` now reads
`AZURE_STORAGE_CONNECTION_STRING` + `AZURE_STORAGE_CONTAINER_NAME` (shared-key
auth, `BlobServiceClient.fromConnectionString`) instead of
`AZURE_STORAGE_ACCOUNT_URL` + `AZURE_TENANT_ID`/`CLIENT_ID`/`CLIENT_SECRET` +
a user-delegation SAS key. See `library-docs.md` for the updated pattern.
Uploads should now actually work end-to-end once `.env` has a real connection
string and container name.

**Document upload feedback + delete (2026-07-09):** Root cause of "upload
looks like it does nothing" — the upload/view flow used plain `fetch` from a
Client Component, so the Server Component page never re-fetched
`uploadedDocuments` after a successful upload. Both `UploadSlot` and
`PendingUploadSlot` now call `router.refresh()` on success, and once a
document exists it's shown as its filename (underlined link) with `Eye`
(view) and `Trash` (delete) icon buttons instead of a static "Required" label.
Delete is a new capability end-to-end: `deleteBlob` (`lib/azure/blob.ts`),
`deleteDocument` (`document-service.ts`), `DELETE /api/documents/[documentId]`.
See `ui-registry.md`'s `DocumentSelector` notes.

**Approve dialog simplified to signature-only (2026-07-14):** the Approve
modal in `stakeholder-panel.tsx` no longer asks any approver to type their
name or (delegates only) pick "Approving as HCM/GMM/DMD" — both were fake
data since the session already knows who's approving and, for direct
stakeholders, their role. `ApproverRole` (`lib/domain/types.ts`) gained a
`"Delegated"` member; `applyStakeholderApproval` derives `approverName`/
`approverRole` server-side instead of taking them as client input. See
`ui-registry.md`'s `StakeholderPanel` notes.

### Schema
- [x] `persons`, `engagements`, `documents`, `stakeholder_approvals`,
      `workflow_cycles`, `workflow_transitions`, `termination_requests` tables
- [x] `notifications.engagement_id` now a real FK → `engagements.id`

### Azure Blob
- [x] `src/lib/azure/blob.ts` — `uploadBlob`, `generateSasUrl` (shared-key auth
      via `AZURE_STORAGE_CONNECTION_STRING`, SAS built with a
      `StorageSharedKeyCredential` parsed back out of that same connection
      string — not user-delegation SAS; see `library-docs.md`, 15 min expiry,
      lazily-constructed client so build/typecheck don't require live Azure
      credentials)
- [x] `src/app/api/documents/route.ts` (upload) +
      `src/app/api/documents/[documentId]/route.ts` (SAS view URL — added
      during the build, not in the original plan table, needed to satisfy
      "uploaded doc opens via SAS URL")

### Services
- [x] `person-registry-service.ts`, `workflow-service.ts`, `document-service.ts`

### shadcn/ui
- [x] `Select`, `Checkbox`, `Textarea`, `Tabs` installed — see
      `ui-registry.md`'s Select/Checkbox history note

### Pages + components
- [x] `dashboard/(workflow)/reception/` — queue, `new`, `[engagementId]`
- [x] `reception-form.tsx`, `document-selector.tsx`, `stakeholder-panel.tsx`,
      `signature-pad.tsx`, `cancel-engagement-button.tsx`
- [x] `system-admin/delegations/` — grant/revoke UI
- [x] `dashboard/page.tsx` root routing extended: Receptionist/HCM/GMM/DMD →
      `/dashboard/reception`

### Server Actions
- [x] `actions/engagements.ts` — `lookupPersonByPassportAction`,
      `submitReceptionAction`, `updateReceptionDataAction`,
      `requestStakeholderApprovalAction`, `applyStakeholderApprovalAction`,
      `requestDelegatedApprovalAction`, `requestTerminationAction`
- [x] `actions/admin.ts` additions — `grantDelegatedApprovalAction`,
      `revokeDelegatedApprovalAction`

### Verification
- [x] `tsc --noEmit` clean
- [x] `pnpm build` clean (all Reception + delegation routes registered)
- [ ] Manual in-browser walkthrough of the Slice 2 Done-when checklist — ask
      the user to verify (agent does not start a dev server per `CLAUDE.md`)

---

## Slice 3 — Hospital ✅

**Reception summary, not full form reuse:** The Hospital detail page does NOT
reuse `ReceptionForm`/`StakeholderPanel` (unlike what a literal reading of
`docs/context/build-plan.md`'s "Read-only view of Reception data (personal details,
company, stakeholder approvals)" might suggest). `docs/context/project-overview.md`'s
Hospital section only needs patient identity + emergency contact + approval
status for a medical clearance decision — not company/GMC-liaison/transport/
PPE/visa data. Built a new `ReceptionSummary` component instead with just:
full name, passport no., DOB, gender, nationality, emergency contact,
access purpose, arrival/departure dates, and stakeholder approval status.
See `docs/context/ui-registry.md`'s `ReceptionSummary` notes.

**hospital_clearances is append-only:** every clearance submission (Fit,
FitWithConditions, or repeated Unfit re-checks) inserts a new row — never
updated or overwritten, matching `workflow_transitions`' append-only
invariant. "Current status" is read as the latest row by `clearance_date`
via `getLatestHospitalClearance` (joins through the active `workflow_cycles`
row, same FK-derivation discipline as `documents`/`workflow_transitions`).
No `workflow_transitions` row is written when Unfit leaves the state
unchanged — the new `hospital_clearances` row is that action's own audit
record; a transition row is written only when clearance moves the record to
`AtTraining`.

**Race condition fixed (2026-07-16 review):** `recordHospitalClearance`
originally read+validated `workflowState` before opening its transaction,
so two concurrent clearance submissions (e.g. contradictory Cleared/Unfit
decisions) could both pass the check and both persist. Fixed the same way
as `applyStakeholderApproval`/`createEngagement`: the engagement row is now
locked (`SELECT ... FOR UPDATE`) and revalidated *inside* the transaction —
the loser of the race re-reads the now-updated state and rejects itself.
This also closes `getLatestHospitalClearance`'s `clearance_date`-only
ordering gap in practice (flagged separately) — clearance inserts for one
engagement are now strictly serialized by the same lock, so two rows for
one cycle can no longer share a timestamp; added no extra tiebreaker column
since `hospital_clearances.id` is a random UUID and wouldn't provide a
meaningful one anyway. Also added a DB-level `CHECK` constraint restricting
`clearance_status` to `Fit`/`FitWithConditions`/`Unfit` (migration
`0007_classy_shard.sql`) — previously only enforced by the
`HospitalClearanceStatus` TypeScript type, nothing stopped an invalid value
at the database layer.

**DocumentSelector gained a `mode`/`docTypes` mode instead of a new
component:** `mode: "select" | "required"` (default `"select"`) +
optional `docTypes` override. In `"required"` mode there's no checkbox —
the doc type renders as a plain label and the upload slot always shows,
since Hospital's `hospital_fitness_form` is always applicable, not
Receptionist-selected. Reception's own call site is unchanged (still
defaults to the original 7-type checkbox list, now named
`RECEPTION_DOCUMENT_TYPES` internally to keep `hospital_fitness_form` out of
its default list). See `ui-registry.md`'s `DocumentSelector` notes.

**`listEngagementsForLayer(workflowState, accessPurposes?)`** added to
`workflow-service.ts` as a reusable queue filter — Training (Slice 4) and
Security (Slice 5) will call the same helper with their own state/purpose
filters instead of each writing a one-off query.

**Local dev migration drift found and fixed:** `db:migrate` had never been
run for Slice 2's `0005` migration (`stakeholder_approvals` unique
constraint) — applied it together with this slice's new `0006`
(`hospital_clearances` table) since both are purely additive.

### Schema
- [x] `hospital_clearances` table (workflow_cycle_id FK, clearance_status,
      doctor_comments, clearance_date) — migration `0006_chemical_avengers.sql`
- [x] `DocType` gained `hospital_fitness_form`; `ReceptionData.applicableDocuments`
      narrowed to `Exclude<DocType, "hospital_fitness_form">[]` so Reception's
      zod schema (which never offered that option) still type-checks

### Services
- [x] `workflow-service.ts` — `listEngagementsForLayer`,
      `recordHospitalClearance`, `getLatestHospitalClearance`

### Components
- [x] `document-selector.tsx` — `mode`/`docTypes` props added
- [x] `reception-summary.tsx` — new minimal read-only card
- [x] `hospital-form.tsx` — new (plain `useState`, not react-hook-form —
      only 2 real fields, RHF wasn't justified the way it was for Reception's
      ~35)

### Pages
- [x] `dashboard/(workflow)/hospital/page.tsx` — queue, no row actions
- [x] `dashboard/(workflow)/hospital/[engagementId]/page.tsx`
- [x] `dashboard/page.tsx` root routing extended: HospitalStaff → `/dashboard/hospital`
- [x] `dashboard-breadcrumbs.tsx` — `hospital` label added

### Server Actions
- [x] `actions/engagements.ts` — `submitHospitalClearanceAction`

### Email templates
- [x] `hospitalClearedTemplate`, `hospitalUnfitTemplate` in `templates.ts`

### Bug found + fixed during manual verification (2026-07-16)

`/api/documents` (both POST and DELETE) hardcoded `requireWriteAccess("Receptionist")`
— built in Slice 2 for Reception only, never revisited when Slice 3 added a
second layer that uploads documents. Hospital staff got a 403 "Not
authorized" toast trying to upload the fitness form; even with the right
role it would then have failed with "Invalid document type" since the
route's separate `DOC_TYPES` allowlist didn't include `hospital_fitness_form`
either. Fixed by adding one canonical `DOC_TYPE_OWNERS: Record<DocType,
WorkflowRole>` map + `getDocTypeOwnerRole()` in `document-service.ts` (the
actual authority on doc types) — both routes now resolve the required role
from the doc type being uploaded/deleted instead of a hardcoded role, and
the allowlist and role-mapping can't drift apart since they're one map.
DELETE now looks up the document first (new `getDocumentById`) to know its
`docType` before authorizing, and returns 404 for a missing document
instead of falling through to a generic 500. **Any future layer that
introduces a new doc type (Training, IT) only needs an entry in
`DOC_TYPE_OWNERS` — not a change to either route.**

### Verification
- [x] `tsc --noEmit` clean
- [x] `pnpm build` clean (`/dashboard/hospital` + `/dashboard/hospital/[engagementId]` registered)
- [ ] Manual in-browser walkthrough of the Slice 3 Done-when checklist — ask
      the user to verify (agent does not start a dev server per `CLAUDE.md`)

---

## Department Head Invitation Console + Public Registration 🔶

**Not a numbered build-plan slice** — `build-plan.md` has no slice for this yet; it's the
first real build-out of the Department-Head-invitation flow `project-overview.md`/
`architecture.md` describe, now end-to-end from invitation to a stored, auto-approved
Registration Request.

**What's built:**
- `/dashboard/department` — a Department Head enters a visitor's email, picks a
  **Registration Type (Local/Foreign)**, sends an invitation (random token, SHA-256 hash
  persisted, raw token only in the emailed link), and sees a log of invitations they've sent
  (email, type, sent date, status) with a revoke action. Scoped to the signed-in HOD's own
  `department`; Guests see the log read-only, no form/revoke.
- `/register?token=...` — public, unauthenticated. Validates the token (unrevoked,
  unconsumed), then renders either `ReceptionForm` (Foreign — reused via its new
  `publicToken` prop, same passport/nationality/visa fields, document uploads hidden) or
  `LocalRegistrationForm` (Local — new component, same shape minus
  Nationality/Ghana-Visa-Required/Visa-Type/GMC-Liaison-Department, "Ghana Card No."
  instead of "Passport No.", backed by `persons.passport_no` reused as a generic ID-number
  column). Submission atomically consumes the token and inserts a `registration_requests`
  row with `status: "Approved"` directly — no separate approval step exists, per
  `project-overview.md`. Matching Department Head(s) are notified by dashboard + email.
- Local visitor registration moved from Features Out of Scope to In Scope in
  `project-overview.md` (2026-10-09).

- **Visitor document uploads (2026-10-09).** The public forms now collect documents too,
  rather than leaving Reception to chase them. `documents` became polymorphic —
  `engagement_id` xor `invitation_id` (CHECK-enforced), `uploaded_by` nullable for
  visitor-uploaded files — so Reception's future hand-off is a pointer update with no blob
  copy. Blob paths re-keyed to `documents/{documentId}/...` so they never move. Uploads go
  through `POST /api/register/documents`, the project's only unauthenticated write surface,
  authorized purely by the invitation token and scoped to that invitation's own documents
  (GET for a SAS view URL and DELETE likewise). Required sets differ by registration type
  (`REGISTRATION_DOCUMENT_TYPES` in `lib/domain/types.ts`): Foreign needs passport biodata +
  valid visa, Local needs Ghana Card; permit/MINCOM/assignment/insurance are offered but
  optional, since a short familiarization visit doesn't need them. Enforced server-side in
  `createRegistrationRequest` before the token is consumed.

**What's deliberately NOT built:** Reception's hand-off (picking up an approved
`registration_requests` row and turning it into a real `Person`/`Engagement` — `engagements`
has no `registration_request_id` column yet, and nothing re-points visitor documents onto the
Engagement yet), resend (revoke + re-send a fresh invite is the only path today), any format
validation on the Ghana Card number, and cleanup of documents uploaded against an invitation
that is then abandoned or revoked (orphans, harmless but unreaped).

### Schema
- [x] `invitations` (`department`, `registration_type`, `email`, `token_hash` unique,
      `issued_by` FK, `issued_at`, `revoked_at`, `consumed_at`)
- [x] `registration_requests` (`invitation_id` unique FK, `department`, `registration_type`,
      `form_data` jsonb, `status`, `approved_by` FK, `approved_at`, `created_at`)
- [x] `notifications.registration_request_id` (nullable FK)
- Migrations `0009`–`0012`

### Services
- [x] `src/lib/services/invitation-service.ts` — `issueInvitation`, `revokeInvitation`
      (scoped to `issuedBy`), `listInvitationsForIssuer`, `validateInvitationToken`,
      `consumeInvitation` (atomic, transaction-safe)
- [x] `src/lib/services/registration-service.ts` (new) — `createRegistrationRequest`,
      `LocalRegistrationFormInput` type

### Pages + components
- [x] `dashboard/(workflow)/department/page.tsx`, `invite-form.tsx` (+ registration-type
      picker), `invitation-row.tsx` (+ type column)
- [x] `dashboard/page.tsx` root routing extended: DepartmentHead → `/dashboard/department`
- [x] `dashboard-breadcrumbs.tsx` — `department` label added
- [x] `src/app/register/page.tsx` (new) — token validation + form branch
- [x] `src/components/workflow/reception-form.tsx` — `publicToken` prop (hides document
      uploads, posts to the public action, "Thank you" confirmation instead of linking to an
      engagement)
- [x] `src/components/workflow/local-registration-form.tsx` (new)

### `/register` presentation pass (2026-10-11)
- [x] `src/app/register/page.tsx` — two-pane layout: left image pane (`bg-auth.jpg`) carrying
      the GMC logo and the page `<h1>` ("Ghana Manganese Company Mine Site Access
      Registration"), right form pane in a shadcn `ScrollArea`; panes split the viewport
      50/50. The old "Registration" header above the form is gone
- [x] `src/components/ui/scroll-area.tsx` — shadcn `ScrollArea` installed (no new dependency;
      `radix-ui` was already present). The CLI emitted `import { cn } from "cn"` and installed
      a junk `cn` package — import repointed to `@/lib/utils`, package removed
- [x] `ACCESS_PURPOSE_LABELS.Work` ("Nature of Visit") → "Require mine site access"
      (`src/lib/domain/types.ts`); `local-registration-form.tsx`'s own copy left as
      "Coming to work", as in the 2026-10-09 relabel
- [x] `tsc --noEmit`, `biome check`, `oxlint`, `bun run build` all clean
- [x] GMC Liaison Person / Department prefilled from the invitation and locked:
      `validateInvitationToken` returns `issuerName` (join on `invitations.issued_by`),
      `/register` passes both as `defaultValues`, both inputs render `disabled`, and
      `createRegistrationRequest` overwrites them server-side from the invitation
- [x] `src/lib/auth/entra.ts` — `display_name`/`email` refreshed from the Entra claim on every
      sign-in (previously written once, on the row's first sign-in), so a rename in Entra
      reaches the prefilled liaison name on outstanding invitation links
- [x] Visa Type option "Other" → "Visa on Arrival" (`VISA_TYPE_OPTIONS` + zod enum in
      `reception-form.tsx`, `VisaType` in `lib/domain/types.ts`)
- [x] "Visa on Arrival" removes `valid_visa` from the compulsory uploads — shared rule in
      `getRequiredRegistrationDocTypes` (`lib/domain/types.ts`), used by `ReceptionForm`
      (watched `visaType`) and by `getMissingRegistrationDocTypes`/`createRegistrationRequest`
- [x] Visa Type + Access Level pinned to the same row in `reception-form.tsx`
- [x] "Administration" section removed from the public form — gated behind `!publicToken` in
      `reception-form.tsx`, deleted from `local-registration-form.tsx` (with its orphaned
      `CheckboxField` helper + `Checkbox` import)
- [x] Public submit button label "Submit Registration" → "Submit" in both forms
- [x] English ⇄ 简体中文 toggle on the public form (`lib/i18n/registration-dictionary.ts`,
      `registration-language-provider.tsx`, `registration-language-toggle.tsx`,
      `registration-headline.tsx`, `registration-invalid-link.tsx`); `t()` applied inside the
      field helpers, `FormMessage`, `DocumentSelector` and `PhoneInput`; `ActionResult` gained
      `errorCode`/`missingDocTypes` and `RegistrationError` carries the code out of the service
- [x] Public upload route returns 400 + the real reason for a rejected file
      (`DocumentValidationError`), instead of folding it into "Internal server error"
### Hospital dashboard (2026-10-12)
- [x] Status column removed from the queue (every row is `AtHospital` by definition); Arrival,
      Departure and a "Record Clearance" action in its place
- [x] Record page is identity (name + passport) plus the clearance form only — no engagement
      preview; `ReceptionSummary` deleted (no callers left)
- [x] Clearance form: label corrected to "Fit with Conditions" and each outcome now states what
      it does to the engagement. Upload of `hospital_fitness_form` was already required and
      still gates submit
- [ ] Manual in-browser check — a work-path engagement at AtHospital: upload the fitness form,
      pick each outcome and confirm the consequence line, then submit

### Stakeholder approvals dashboard (2026-10-11)
- [x] Migration `0018` — `engagements.approval_requested_at`, stamped by
      `submitForStakeholderApproval` (the request previously left no trace on the record)
- [x] `listEngagementsAwaitingApproval(delegatedApproverId?)` — `AtReception`, requested, not
      yet approved; scoped to the one engagement for a delegate
- [x] `/dashboard/approvals` queue with days-waiting column; HCM/GMM/DMD land there at sign-in
- [x] Approval still happens on the engagement page: stakeholders see the read-only
      `ReceptionDetailsPreview` plus the existing `StakeholderPanel`
- [x] `approvals` breadcrumb label added
- [x] Dashboard shows both halves of the stakeholder's work: Awaiting Approval (pending pill)
      and Approved (who signed, role, date, current stage) via
      `listRecentStakeholderApprovals`
- [x] Stakeholders fully separated from Reception (2026-10-12): `EngagementDetail` extracted
      and rendered by both `/dashboard/reception/:id` and the new `/dashboard/approvals/:id`,
      so their breadcrumb reads Approvals rather than Reception; Reception's queue and
      `LAYER_ROLES.reception` are Receptionist-only
- [x] Post-approval redirect fixed — `StakeholderPanel.returnHref` sends a stakeholder back to
      `/dashboard/approvals` instead of Reception's dashboard; the action revalidates both
- [x] `src/lib/db/seed-approvals.ts` + `bun run db:seed:approvals` — takes seeded submissions
      through the real services (`buildEngagementInput` → `createEngagement` →
      `linkRequestToEngagement`) and stamps `approval_requested_at`, leaving them exactly where
      a stakeholder picks them up. Stops at 2 and skips when that many already wait. Notifications
      and emails are deliberately not sent — it is seed data, not a workflow event
- [ ] Manual in-browser check — convert a submission, request approval as Reception, then sign
      in as HCM/GMM/DMD: the row appears, "Review & Approve" opens the preview, and approving
      clears it from the queue

### Reception sees submitted registrations (2026-10-11)
- [x] Migration `0016_fair_ma_gnuci.sql` — `registration_requests.engagement_id`
      (nullable FK), generated and **applied**
- [x] `registration-service`: `listRegistrationRequests`, `getRegistrationRequest`,
      `linkRequestToEngagement` (only updates still-unlinked rows)
- [x] `reception/page.tsx` — "Submitted Registrations" table above the Engagements queue,
      with an "N awaiting" count pill; `registration-request-row.tsx` (Server Component)
- [x] Preview mode renders each document as a page-style preview (`DocumentPreview`: A4 sheet
      with offset sheets behind it, ghost View/Download beneath) with View and Download; migration `0017` adds `documents.file_name`/`content_type`, captured in
      `onUploadComplete` and backfilled for the 8 seeded rows; new
      `/api/documents/[documentId]/download` route streams with an attachment disposition
- [x] The engagement detail page opens in preview mode too, with "Edit engagement" revealing
      the form; no toggle when the record is read-only. `CreateEngagementPanel` generalised to
      `PreviewEditPanel` and `RegistrationSubmissionPreview` renamed `ReceptionDetailsPreview`,
      both now shared by the two Reception screens
- [x] Create Engagement reworked to preview + edit mode: read-only submission preview and a
      "Reception Completes" card (Administration four, applicable documents, plus nationality
      and visa answers for Local), with "Edit submission" swapping in the full prefilled form.
      New action `createEngagementFromRequestAction` + `buildEngagementInput` assemble the
      payload server-side from the stored submission
- [x] "Create Engagement" → `/dashboard/reception/new?requestId=…`, which prefills
      `ReceptionForm` from the submission via `lib/domain/registration-prefill.ts` and
      redirects to the Engagement if the request was already converted
- [x] `submitReceptionAction` takes an optional `registrationRequestId` and links it
- [x] `tsc --noEmit`, `biome check`, `bun run build` clean
- [x] Uploaded files always render in `DocumentSelector` (previously hidden until the
      "applicable" box was ticked); Create Engagement shows the visitor's files with their
      boxes pre-ticked
- [x] Visitor's registration uploads re-point onto the Engagement at conversion
      (`attachInvitationDocumentsToEngagement`) — previously they stayed on the invitation and
      Reception saw an empty uploads card
- [x] Local / Foreign / All filter on the submissions table, driven by `?type=` search param
- [x] Dashboard content column widened `max-w-5xl` → `max-w-7xl` (shell + top bar together,
      per the shared-width invariant) so the 7-column submissions table fits without
      horizontal scrolling
- [x] Seed also attaches each submission's compulsory documents — a real 1×1 PNG uploaded via
      `UTApi` when `UPLOADTHING_TOKEN` is set, otherwise placeholder rows (listed and handed
      off correctly, but View can't open them). Per-invitation idempotent, so re-running after
      adding the token fills in what's missing. 8 real documents attached on 2026-10-11
- [x] `src/lib/db/seed-registrations.ts` + `bun run db:seed:registrations` — 10 dummy
      Foreign submissions with a consumed invitation each; skips if any
      `@seed.gmc.local` invitation already exists. Local dev only
- [x] Reseeded 2026-10-13 after the database was emptied down to the System Admin. Local
      rows dropped (`localSubmission` removed) — Reception is being exercised on the Foreign
      path only, so the seed is 10 Foreign submissions spread across all 7 liaison
      departments and all 3 access purposes, with varied nationality (NATIONALITIES values,
      not country names), visa type, employment status, access level, airport pickup and
      accommodation. Compulsory documents now come from `getRequiredRegistrationDocTypes`
      rather than `REGISTRATION_DOCUMENT_TYPES`, so the Visa-on-Arrival row gets a passport
      page and no visa — 19 real documents uploaded
- [ ] Manual in-browser check — submit a registration, confirm it appears in Reception's
      new table, click Create Engagement and confirm the form arrives prefilled, create it,
      then confirm the row flips to a Converted badge linking to that engagement

### Storage switched to UploadThing (2026-10-11)
- [x] `uploadthing@7.7.4` + `@uploadthing/react@7.3.3` installed (approved — replaces Azure Blob)
- [x] `src/app/api/uploadthing/core.ts` — `registrationDocument` (invitation-token middleware)
      and `engagementDocument` (doc-type → role middleware); `route.ts` handler
- [x] `src/lib/uploadthing/client.ts` (typed `useUploadThing`/`uploadFiles`) and `api.ts`
      (15-minute signed view URLs + delete via `UTApi`)
- [x] `document-service.uploadDocument` → `recordUploadedDocument` (DB row only — bytes never
      reach this server); view/delete now go through UploadThing
- [x] `src/lib/azure/blob.ts` deleted; `/api/documents/route.ts` deleted (held only POST);
      `/api/register/documents` kept its GET/DELETE
- [x] Migrations `0014` (empties `documents`, adds `file_key`/`file_url`) + `0015` (drops
      `blob_url`) generated and **applied** — verified: 9 columns, 0 rows
- [x] `DocType` now derives from a runtime `DOC_TYPES` tuple so the router can `z.enum` it
- [x] `tsc --noEmit`, `biome check`, `oxlint` (new files), `bun run build` all clean
- [ ] **Needs you:** add `UPLOADTHING_TOKEN` to `.env.development` and run `bun run env:encrypt`;
      the two `AZURE_STORAGE_*` vars are now dead and can be removed
- [ ] Manual in-browser check — upload a document on `/register` and on a Reception
      engagement, view it (signed URL opens), delete it, and confirm a >16MB or .docx file is
      rejected client-side with a readable message in both languages

- [ ] ~~**Blocked — config:** blob uploads fail with `getaddrinfo ENOTFOUND
      siteaccessmanagement.blob.core.windows.net`. `AZURE_STORAGE_CONNECTION_STRING`'s
      `AccountName` is the container name, not a real storage account; re-copy the connection
      string from the account's Access keys blade. DB side verified healthy (all 14 migrations
      applied, `documents.invitation_id` present)~~ — resolved by moving off Azure Blob
- [ ] Manual in-browser check — ask the user: image pane fills the full viewport height
      (hard-reload or restart the dev server; `h-screen` is new to the project), form scrolls
      inside its own pane, both registration forms still submit, and the two liaison
      fields arrive filled in and non-editable, and picking "Visa on Arrival" turns the
      visa upload optional so submit unblocks without it; and the 中文 toggle translates
      labels, options, validation errors, the uploader and submit errors while keeping
      anything already typed, with /dashboard/reception still entirely in English

### Server Actions
- [x] `src/actions/registration.ts` — `issueInvitationAction`, `revokeInvitationAction`,
      `submitRegistrationRequestAction` (public, no guard)

### Email templates
- [x] `departmentInvitationTemplate`, `registrationSubmittedTemplate` in `templates.ts`

### Verification
- [x] `tsc --noEmit` clean
- [x] `bun run build` clean (`/dashboard/department`, `/register` registered)
- [ ] Manual in-browser walkthrough — ask the user to verify (agent does not start a dev
      server per `CLAUDE.md`): sending a Foreign invite renders the passport-style form at
      `/register`, a Local invite renders the Ghana-Card-style form; submitting either
      consumes the token (a second visit to the same link shows "invalid"), inserts an
      Approved `registration_requests` row, and notifies the matching Department Head;
      revoking an unused invite's link also shows "invalid" at `/register`.

---

## Public form made mobile-accessible (2026-10-12)
- [x] `DesktopOnlyGuard` moved off the root layout onto the dashboard and `(auth)` layouts, so
      `/register` is no longer blocked below `lg` while staff screens still are
- [x] `/register` responsive: document scroll on mobile (`ScrollArea` keeps its fixed viewport
      only at `lg`), stepped padding, image pane hidden below `lg`
- [x] Both public forms: `grid-cols-1 … sm:grid-cols-2`, full-width cells `sm:col-span-2`
- [x] `ReceptionDetailsPreview` and the document grid made responsive too (they render on the
      Create Engagement screen, which is staff-only, but share components with the public path)
- [x] Explicit `viewport` export; `maximumScale` deliberately not set
- [ ] Manual check — open `/register?preview=success` and a real token link on a phone and a
      tablet; confirm no horizontal scroll and that the 中文 toggle still reaches

## Terminology: "pre-registration" → "registration" (2026-10-12)
- [x] Removed project-wide — 48 occurrences across 13 source files and 4 context docs
- [x] Live copy affected: the invitation email subject and body ("invited to register",
      "Start your registration"), the submission email subject, and both dashboard
      notification messages
- [x] Verified: zero occurrences remain in `src/`, `docs/` or `CLAUDE.md`; all 29 literal
      `t()` keys still resolve against the Chinese dictionary (no silent English fallback)
- [x] Identifiers were already neutral — `registration_requests`, `RegistrationRequest`,
      `/register`, `registrationType` needed no change

## Public form success state (2026-10-12)
- [x] `RegistrationSuccess` extracted from both forms — green two-ring check mark, centred in
      the pane, no card; heading no longer says "registration"
- [x] Chinese key updated to match

## Staff user lifecycle (2026-10-12)
- [x] Migration `0020` — `staff_users.deactivated_at` / `deactivated_by`
- [x] "Revoke access" (back to unprovisioned) and "Deactivate" (soft delete) + "Reactivate"
- [x] No hard delete: 12 tables FK `staff_users`, mostly audit trail
- [x] Enforced at sign-in (no session issued), in `requireProvisioned` (DB read, so it takes
      effect immediately rather than when the JWT expires), and in every recipient lookup
- [x] Both actions refuse to act on your own account
- [x] Verified against the live DB: deactivate dropped the Receptionist from
      `getStaffByWorkflowRoles` (1 → 0), cleared roles and PIN; reactivate restored sign-in;
      original state fully restored afterwards

## Notification audit (2026-10-12)
- [x] Verified end-to-end against the live DB; Graph credentials confirmed working
      (token acquired, `Mail.Send` application role granted, sender `kanyidoho@ghamang.com.gh`)
- [x] **Fixed:** public submission notified only the Department Head — Reception, who actually
      acts on it, got nothing. Both are now notified, each with a link to their own screen
- [x] **Fixed:** a notification to a role with no holders reported success while reaching
      nobody. Stakeholder approval, hospital clearance and induction now return a warning
      naming the missing role; the public submission logs it instead (never shown to a visitor)
- [x] Confirmed working: role request → System Admin (3 real rows in the DB), provisioning
      email, stakeholder/hospital/induction/termination notifications, dashboard bell
      (unread count, list, mark-all-read)
- [ ] **Action needed — no stakeholder is provisioned.** Zero users hold HCM, GMM or DMD, so
      approval requests currently reach nobody. No TrainingStaff or SecurityStaff either, so
      those hand-offs are also unnotified until someone is assigned

## Queue scale: search + pagination (2026-10-12)
- [x] `lib/domain/pagination.ts` — `Page<T>`, `PageRequest`, `toPageRequest`, 20 per page
- [x] `QueueSearch` (client, 300ms debounce, URL-driven, resets page) + `QueuePagination`
      (server, plain links, preserves other params)
- [x] SQL-side filtering: `ilike` on name/passport + `count()` in `listEngagementsWithPerson`,
      `listEngagementsForLayer`, `listEngagementsAwaitingApproval`,
      `listRecentStakeholderApprovals`
- [x] Reception split into two views (`?view=`) instead of two stacked tables; tab counts from
      dedicated `count()` queries
- [x] Applied to Reception, Approvals (both tables), Hospital, Training
- [x] `listAllEngagementsWithPerson` for the delegation picker, which needs every row
- [ ] Known limit: submission search filters in memory (name/ID live in jsonb) — promote them
      to columns if that queue ever grows past a few thousand
- [ ] Manual in-browser check — search, page through, switch Reception views, and confirm the
      filter keeps the search term

## Slice 4 — Training School ✅ (2026-10-12)

### Schema
- [x] `induction_records` table (migration `0019`) — cycle-scoped, mirrors `hospital_clearances`
- [x] `induction_declaration_form` + `induction_registration_form` doc types, owned by TrainingStaff
- [x] `ApplicableDocType` / `LayerOwnedDocType` so layer forms can't be offered to visitors

### Services + actions
- [x] `checkHospitalClearanceAge` (90-day validity, 30-day warning, work-path only)
- [x] `recordInductionCompletion` — both uploads required, expiry re-checked at submit,
      row-locked transaction → `AtSecurity` + transition row + Security notified
- [x] `getLatestInductionRecord`, `submitTrainingCompletionAction`, `inductionCompletedTemplate`

### Pages
- [x] `/dashboard/training` queue (Work + VisitMine at `AtTraining`), `/dashboard/training/[id]`
- [x] TrainingStaff routed there from `/dashboard`; `training` breadcrumb label
- [x] `WORKFLOW_STATE_LABELS` — states render without the `At…` prefix

### Verification
- [x] `tsc --noEmit`, `biome check`, `oxlint` (new files), `bun run build` clean
- [ ] Manual in-browser check — clear a work-path record at Hospital, confirm it reaches
      Training, upload both forms, sign off, confirm it moves to Security and Security is
      notified. The Security dashboard is Slice 5, so that email links to `/dashboard`

### Not built (deliberate)
- Signature on sign-off — dropped to match Hospital, which records a medical decision without
  one; the staff user and timestamp are on the transition row
- The scheduled job that returns expired records to Hospital is Slice 9; Training only blocks
  sign-off today

---

## Slice 5 — Security ✅ (2026-10-12)
- [x] `/dashboard/security` queue (Work + VisitMine at `AtSecurity`) with search + pagination
- [x] `/dashboard/security/[id]` — `PriorLayersSummary` (approval, clearance, induction) plus
      the full `ReceptionDetailsPreview` with openable document previews
- [x] `forwardToIT` → `AwaitingProvisioning`, transition row, IT notified; `forwardToITAction`,
      `forwardedToITTemplate`
- [x] SecurityStaff routed from `/dashboard`; `security` breadcrumb + `LAYER_ROLES` entry
- [ ] Manual check — needs a user holding `SecurityStaff`

*Note: Security records no data of its own, so there is no Security table — the
`workflow_transitions` row is the record that the review happened.*

*Not started.*

---

## Slice 6 — IT ✅ (2026-10-12)
- [x] Migration `0021` — `access_provisionings` (cycle-scoped)
- [x] `biometric_image` + `passport_photo` doc types, owned by ITStaff and added to
      `LayerOwnedDocType`; `ID_TYPES` tuple
- [x] `/dashboard/it` queue (`AwaitingProvisioning`) + `/dashboard/it/[id]` with
      `PriorLayersSummary` and `ItForm`
- [x] `activateAccess` → `workflow_state = Completed`, `access_state = Active`; both uploads
      required; card expiry capped at the departure date (client **and** server)
- [x] `activateAccessAction`, `accessActivatedTemplate` → Security + Reception
- [x] Once activated the form renders read-only as "Access Active" with the card details
- [x] **Full pipeline verified against the live DB**: AtTraining → induction → AtSecurity →
      forward → AwaitingProvisioning → activate → Completed/Active, card recorded, expiry rule
      rejected a date past departure. Engagement rolled back to AtTraining afterwards
- [ ] Manual check — needs users holding `SecurityStaff` and `ITStaff`

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
