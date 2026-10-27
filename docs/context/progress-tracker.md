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

### Hospital simplified: status only (2026-10-21) ✅
Feedback: Hospital records the fitness outcome and nothing else.
- [x] No fitness-form upload — `HospitalForm` dropped its `DocumentSelector`, and
      `recordHospitalClearance` no longer rejects a clearance without one
- [x] Doctor's comments optional — stored trimmed, `""` when blank (column stays `NOT NULL`, so
      no migration); Fit-with-Conditions email omits the comments line when empty
- [x] Training's `HospitalHandoff` shows outcome + comments only; its signed-URL fetching and the
      hospital page's document query were removed
- [x] `hospital_fitness_form` stays in `DocType`/`DOC_TYPE_OWNERS` so rows uploaded before this
      change remain valid; nothing offers it any more
- [x] `tsc --noEmit`, `biome check src/` clean
- [x] **Training School too:** the two induction-form uploads (`induction_declaration_form`,
      `induction_registration_form`) are gone from `TrainingForm`, and `recordInductionCompletion`
      no longer requires them. Comments are optional too, relabelled "Comments (optional)" (stored `""` when blank; column stays `NOT NULL`). Doc types
      stay in `DocType`/`DOC_TYPE_OWNERS` for existing rows
- [x] Training queue's Recorded Inductions tab: "Stage" column and the per-row View action removed (the table already shows everything)
- [ ] Manual in-browser check — record each outcome with no comments and no upload; confirm
      Submit enables on status alone and Training's card shows "—" for comments

### IT removed from the workflow (2026-10-21) ✅
Feedback: everything IT did is Security's job, so Training School → Security is the end of the line.
- [x] `ITStaff` role, `AwaitingProvisioning` state, `/dashboard/it` routes, proxy/breadcrumb/dashboard
      redirect entries, `forwardToIT` + `forwardToITAction`, `ForwardToITButton` and
      `forwardedToITTemplate` all deleted
- [x] `it-form.tsx` → `access-activation-form.tsx` (`AccessActivationForm`), rendered at the bottom of
      `security/[engagementId]` after the review material. Submitting runs `activateAccess`:
      `AtSecurity` → `Completed` / `Active`, same fields, same uploads, same expiry-≤-departure rule
- [x] `biometric_image` / `passport_photo` now owned by `SecurityStaff`; `activateAccessAction` requires it
- [x] Activation notifies Reception only (Security is the actor)
- [x] Security queue: tabs are now Awaiting Review / Site Access Granted ("Forwarded to IT" tab and
      `listRecentSecurityForwards` removed)
- [x] Migration `0022_remove_it_stage.sql` (custom) moves any `AwaitingProvisioning` engagement to
      `AtSecurity`. Applied to the dev DB 2026-10-21
- [x] Existing users still holding the `ITStaff` string keep it in the DB (no data purge); the role is
      gone from every picker and route, so they land on the "coming soon" page until reassigned
- [x] `tsc --noEmit` (apart from stale `.next/types` references to the deleted `it/` pages, which clear on
      the next `next dev`/`build`) and `biome check src/` clean
- [ ] Manual in-browser check — take a record through Training → Security, upload both files, fill the
      card fields, activate; confirm it lands under "Site Access Granted" and Reception is notified
- Slice 7 (access revocation) was built later the same day: Security revokes, see Slice 7 below

### Field encryption (2026-10-21) 🔶 steps 1-2 of 4 written, not yet applied
Goal: the developer with Neon access sees only ciphertext. Plan: crypto + key, fields, backfill,
documents. Key is an env var; no Azure Key Vault (decided 2026-10-21). It only satisfies the requirement
once the production key is set by the client in the host's sensitive env settings, out of the developer's reach.
- [x] `src/lib/crypto` (AES-256-GCM, blind index, search tokens) + `getMasterKey()` swap point;
      `ENCRYPTION_KEY` added to the encrypted `.env.development`; round-trip, tamper detection,
      legacy passthrough and prefix-search checked
- [x] Drizzle `encryptedText` / `encryptedJson` columns; schema switched for persons, engagement
      reception data, registration form data, hospital clearance (status + comments), induction
      comments, revocation reason, invitation email, notification text, transition comments
- [x] Passport lookup now uses `persons.passport_no_hash`; queue search uses `search_tokens`
      (**behaviour change: word-start match only, 2+ characters**)
- [x] Migration `0025_encrypt_sensitive_columns.sql` (hand-edited: `USING` casts, placeholder hash so
      NOT NULL/UNIQUE hold) **written, NOT applied**; `src/lib/db/backfill-encryption.ts` +
      `bun run db:backfill:encryption` **written, NOT run**
- [ ] **Apply: `bun run db:migrate` then immediately `bun run db:backfill:encryption`.** The running
      app errors between them (and the dev server must be restarted after)
- [x] (2026-10-27) Also encrypted: approval signature, access card number, delegation reason
      (engagements + approvals). Already `text`, so no migration. Backfill list covers them and the
      missed `stakeholder_rejections.reason`
- [ ] Step 4, documents: server-side upload route, per-file key, encrypted file name, 4MB cap, image
      downscaling, viewer decrypts
- Not encrypted: staff users, access purpose (Work/Visit/VisitMine), dates and states, ids. Add `ENCRYPTION_KEY` to every other environment
  before deploying, or the app will not start

### Access expiry: validation + effective state (2026-10-21) ✅
Cause of "Duration says Expired but access is Active": (1) nothing ever moved `access_state` off
`Active` when a card lapsed; (2) `activateAccess` had no lower bound on the card expiry, and Duration
was computed activation-day → expiry, so a card issued expiring today read "Expired" from day one.
- [x] Card expiry cannot be in the past: form message + `activateAccess` guard (valid through the
      expiry date, so today is allowed)
- [x] `getEffectiveAccessState(state, cardExpiry)` + `isoToday()` in `lib/domain/types.ts`: an `Active`
      record whose card expiry is before today is `Expired`. Used by Security's register badge
      (danger bucket for Expired) and the "Access Active/Expired" heading on the record page
- [x] `expireLapsedAccess()` (`workflow-service.ts`) writes `Expired` to `engagements.access_state`
      for lapsed active-cycle cards; called when Security's "Site Access Granted" tab loads (no timer
      job exists yet). Ran once against the dev DB: 0 lapsed rows
- [x] Duration is now the issued window, activation day to expiry day **inclusive** (same-day card =
      1 day); it no longer says "Expired" - that is the Access column's job
- Not built: a nightly job and a Reception notification when access lapses (belongs with Slice 8's
  Azure Functions); the sweep writes no `workflow_transitions` row (those record workflow_state moves)

### Em dash removed from user-facing text (2026-10-21) ✅
- [x] All em dashes (—) replaced in UI copy, toasts, error/warning messages, dashboard notification
      text, email subjects ("GMC Site Access: …") and the Chinese dictionary key that mirrors an
      English message. Empty-value placeholders are now `-`. Rule added to `ui-rules.md`
- Not changed: code comments, dev seed-script logs, and the en dash in the pagination range ("1–20")
- Notifications already stored in the database keep their old text; only new ones use the new wording

### In-app document viewer (2026-10-21) ✅
- [x] Preview now opens a dialog; the file is fetched from same-origin `GET /api/documents/[id]/file`
      (inline, `no-store`, 403 for browser navigations) and drawn on canvases — `pdfjs-dist@6.4.299`
      added (approved). No signed UploadThing URL reaches the page any more: `previewUrl` plumbing
      removed from reception/new, engagement-detail and the Security page
- [x] Viewer polish: dialog is a fixed `90vh` × `max-w-4xl` (was content-sized, which re-centred and jumped as pages loaded); loading spinner kept (skeletons tried, reverted at request); pages fade in; `scrollbar-gutter: stable` stops the scrollbar shifting layout
- [x] `bun run build` clean (worker bundled), `tsc --noEmit`, `biome check src/` clean
- [ ] Manual in-browser check — thumbnails render (PDF + image), clicking opens the dialog with all
      pages, no right-click menu, `/api/documents/<id>/file` pasted into a tab is refused, closing
      the dialog frees it
- Not covered: `DocumentSelector`'s eye icon (upload slots) still opens a signed URL in a new tab;
  `/download` route still exists (unlinked, blocked for Security)

### Security activation: photograph only (2026-10-21) ✅
- [x] `biometric_image` upload no longer required or offered — only `passport_photo` (form +
      `activateAccess` guard). The "Biometric enrollment captured" checkbox is unchanged

### Document previews: honest page pile + Security view-only (2026-10-21) ✅
- [x] `DocumentPreview` is a small (120px), non-interactive sheet; leaves pile on the **right edge only**
      and only for multi-page files (one per extra page, max 3), fanning out on hover. One-page files
      are a plain sheet. PDF scrollbar clipped off the sheet
- [x] `pdf-lib@1.17.1` added (approved) — `countUploadedPages` in `lib/uploadthing/api.ts` parses the
      PDF via a signed URL at upload; failures leave `page_count` null rather than failing the upload
- [x] `documents.page_count` (nullable) — migration `0023_add_document_page_count.sql`.
      Applied to the dev DB 2026-10-21 together with `0022`; `bun run db:backfill:page-counts` run for existing documents
- [x] Security can view but not download: `/api/documents/[id]/download` returns 403 for `SecurityStaff`.
      Limit: viewing opens the file in the browser, whose own save button is not blocked
- [x] Preview buttons removed for everyone (View and Download): the whole tile is the link with a
      pointer cursor; on hover the document name swaps to an eye icon + "Preview" (no overlay on the PDF). Nothing in the UI links to the download
      route any more; it stays (Security-blocked) in case a download is wanted back
- [ ] Manual in-browser check — a 3-page PDF shows a right-side pile that fans on hover; an image and a
      1-page PDF show a plain sheet; Security sees View only

### Seed: second batch of submissions (2026-10-15) ✅
- [x] `SUBMISSIONS` grew to 20 Foreign submissions — 10 more across all 7 liaison departments,
      new nationalities (Dutch, Italian, Japanese, Kenyan, Filipino, Pakistani, Egyptian,
      Indian, Chinese), all three access purposes, phone numbers validated against
      `libphonenumber-js`
- [x] The seed is **idempotent per submission**, not all-or-nothing. It used to bail whenever
      *any* `@seed.gmc.local` invitation existed, so a second batch could never be added to a
      database that already held the first; it now matches on the seed email and inserts only
      what is missing
- [x] Bug found and fixed in `seedDocuments`: converting a submission re-points its documents
      from the invitation onto the engagement, so a converted invitation looks document-less and
      every later run uploaded a second copy of every file. It now only seeds documents for
      submissions whose `engagement_id` is still null. The 19 duplicate rows this produced on
      first run were deleted from the database and from UploadThing storage
- [x] Ran 2026-10-15: 10 new submissions, 19 documents uploaded (Visa on Arrival gets the
      passport page only). 20 submissions total, 10 outstanding in Reception's queue; re-running
      is now a no-op

### IT card type + Security access register (2026-10-13) ✅
- [x] `ID_TYPES` (Passport / Ghana Card / Driver's Licence / Voter ID) replaced by `CARD_TYPES`
      = **Visitor Card**, **RFID Card** — IT issues a card, it doesn't record an identity
      document. Field relabelled "Card Type" in the form and the activated summary.
      `access_provisionings.id_type` keeps its column name (empty table, no migration), but now
      holds a card type
- [x] Security's third tab **"Site Access Granted"** — everyone through the full workflow, with
      card number, Access From, Access Until and the Duration between them, plus the access
      state. Reads `listRecentProvisionings` (same source as IT's "Access Activated"); no row
      action, it is a register rather than a queue
- [x] Verified already in place from the previous slice: `ItForm` redirects to `/dashboard/it`,
      `ForwardToITButton` to `/dashboard/security`, and both queues have a pending tab and a
      worked-on tab
- [x] `tsc --noEmit`, `biome check src/`, `bun run build` clean; 0 anti-slop findings on the
      changed files
- [ ] Manual in-browser check — activate access as IT: the card-type dropdown offers the two
      card types, the redirect lands on IT's queue with the record under "Access Activated", and
      Security's "Site Access Granted" tab lists the same visitor with the right duration

### Hospital → Training hand-off + email link fixes (2026-10-13) ✅
- [x] **Fit with Conditions now notifies Reception as well as Training School.**
      `recordHospitalClearance` returns `trainingRecipients` + `receptionRecipients` instead of
      one list: Fit → Training; Fit with Conditions → both; Unfit → Reception. Dashboard
      notifications are worded per audience, and the action's warning names whichever audience
      has nobody provisioned
- [x] New `hospitalFitWithConditionsTemplate` — carries the doctor's comments, links Reception
      to the record
- [x] **Email "View the record" links no longer 403.** `proxy.ts` gates `/dashboard/<layer>` by
      role, and the Unfit email sent a Receptionist to `/dashboard/hospital/:id`. Fixed as a
      class: `templates.ts` gained a link helper per audience plus `layerEngagementLink(role,
      id)`, and seven templates were repointed — approvals requests → `/dashboard/approvals/:id`,
      approval-received → the next layer's route, delegated-approval → the delegations screen,
      hospital-cleared → Training, hospital-unfit/fit-with-conditions → Reception,
      access-activated → per recipient, termination → the dashboard root (no termination
      approval screen exists yet). `nextRole` is typed `WorkflowRole` so a new layer forces the
      decision. Dashboard notifications carry no links and were unaffected
- [x] **Training School can see the fitness form.** New `HospitalHandoff` card on
      `training/[engagementId]`: clearance outcome badge, doctor's comments and the fitness form
      via `DocumentPreview` on a signed URL. Rendered only when a clearance exists, so a
      visit+mine record shows no empty card. `getDocumentsForEngagement` already returned the
      document — nothing rendered it
- [x] `tsc --noEmit`, `biome check src/`, `bun run build` clean; anti-slop counts unchanged from
      the committed baselines on every file touched
- [ ] Manual in-browser check — record Fit, Fit with Conditions and Unfit in turn: confirm
      Training's card shows the clearance and opens the fitness form, Reception gets the
      conditional/unfit notification, and every email link opens the record instead of
      "Forbidden"

### Every layer: worked-on tab + post-action redirect (2026-10-13) ✅
- [x] `QueueViewTabs` (`components/layout/queue-view-tabs.tsx`) — Reception's segmented view
      switch extracted and reused by every layer; Reception refactored onto it so there is one
      implementation
- [x] Every workflow queue is now two tabs, awaiting by default, one table at a time on a
      shared `view`/`q`/`page` triplet: Hospital (Awaiting Clearance / Recorded Clearances),
      Training (Awaiting Induction / Recorded Inductions), Security (Awaiting Review /
      Forwarded to IT), IT (Awaiting Setup / Access Activated), Approvals (Awaiting Approval /
      Approved), Reception (Submitted Registrations / Engagements, unchanged)
- [x] New listings in `workflow-service.ts`: `listRecentHospitalClearances`,
      `listRecentInductions`, `listRecentSecurityForwards` (from `workflow_transitions` —
      Security writes no record of its own), `listRecentProvisionings`
- [x] Tab counts are their own queries — `countEngagementsForLayer`,
      `countEngagementsAwaitingApproval` — so the awaiting pill is right on either tab
- [x] `HospitalForm`, `TrainingForm` and `ItForm` redirect to their layer's queue after a
      successful submit (`ForwardToITButton` and `StakeholderPanel` already did). Reception is
      the deliberate exception: it lands on the new engagement, where its next step lives
- [x] `formatQueueDate` (`lib/utils.ts`) and `HOSPITAL_CLEARANCE_LABELS` (`lib/domain/types.ts`)
      replace the per-file copies of the queue date format and the clearance labels
- [x] The delegate guard on `/dashboard/approvals` now tests the unfiltered pending count, so a
      search that matches nothing no longer bounces a delegate to `/dashboard`
- [x] `tsc --noEmit`, `biome check src/`, `bun run build` clean; no new `oxlint` anti-slop
      findings (`hospital-form.tsx` went from 6 to 5)
- [x] **Stakeholder sign-off no longer 403s.** `StakeholderPanel.handleApprove` pushed to
      `/dashboard/reception` regardless of `returnHref`; a stakeholder has no Receptionist role,
      so `proxy.ts` answered "Forbidden". Both handlers use `returnHref` now, landing them on
      `/dashboard/approvals` with its Awaiting / Approved tabs
- [x] `applyStakeholderApprovalAction` revalidates `/dashboard/approvals`, that record's
      approvals route and both Reception routes — it only revalidated the Reception record
      before, so the queue could still list the row as awaiting
- [x] `listRecentStakeholderApprovals(request, approverStaffUserId?)` — a delegate's Approved tab
      shows only their own sign-offs; stakeholders still see everyone's. `countStakeholderApprovalsBy`
      lets a delegate who has signed stay on the page instead of being bounced to `/dashboard`
- [x] Reception's submission row action relabelled "Create Engagement" → **"Review"** — the link
      opens the submission for checking; creating the engagement is the button at the end of
      that screen. Converted rows still read "View Engagement"
- [ ] Manual in-browser check per layer — record/approve/forward, confirm the redirect lands on
      the queue, the row leaves the awaiting tab and appears on the worked-on tab with the right
      date, outcome and stage; confirm search and paging work on both tabs

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

## Slice 7 — Access Revocation ✅ (2026-10-21)

Revised from the original plan: **no System Admin approval step**. Reception requests, Security
revokes. (Original plan: Reception → System Admin approves → IT revokes.)
- [x] `requestTermination` (Reception): only `Active` access (effective state, so a lapsed card is
      refused); inside a row lock sets `access_state = TerminationRequested`, inserts the
      `termination_requests` row, writes a `workflow_transitions` audit row, notifies Security. The
      state flip is what blocks a duplicate request
- [x] `revokeAccess` (Security): requires `TerminationRequested`; marks the request `Revoked`
      (`decided_by/at`), sets `access_state = Terminated`, audit row, notifies Receptionists
- [x] Security: third tab **Revocation Requests** (count pill) with Name, Passport, Card No., Reason,
      Requested By, Requested and a "Revoke Access" button (`RevokeAccessButton`, confirm first;
      hidden for Guests). Register badges: Revocation Requested (warning), Revoked (danger)
- [x] Reception row action is now "Request Revocation" and only appears for `Active` access
      (it used to appear for everything *not* Completed/Cancelled, i.e. records with no access yet)
- [x] Migration `0024` adds `termination_requests.requested_at`; applied to the dev DB.
      `ACCESS_STATE_LABELS` added ("Terminated" shows as "Revoked")
- [x] `tsc --noEmit`, `biome check src/`, `bun run build` clean
- [ ] Manual in-browser check - as Reception request revocation on an Active record, confirm the
      row action disappears and Security's Revocation Requests tab shows it with the reason; as
      Security revoke it and confirm the register shows Revoked and Reception is notified
- Not built: reactivating revoked access; System Admins are no longer notified of requests
- `TerminationStatus` is now `Pending | Revoked` (the Approved/Rejected values are gone)

---

## Public cookie consent + privacy policy (2026-10-22)

- [x] `CookieConsentBanner` (Accept / Deny, bottom-right) on `/register` and `/privacy-policy`, EN + 简体中文
- [x] `/privacy-policy` page (draft copy, EN + 中文) and a Privacy Policy link on `/register`
- [x] Language preference only remembered after Accept (`src/lib/consent.ts`)
- [x] `tsc --noEmit`, `biome check` clean
- [ ] Manual in-browser check - banner shows once, Accept remembers language across reload, Deny does not, phone width
- [ ] GMC legal review of policy text (retention period, data-rights contact)

---

## 404 page (2026-10-24)

- [x] `src/app/not-found.tsx`: root 404 in `PublicShell`, "Return home" links to `/` (which routes by session)
- [x] No `DesktopOnlyGuard`, so a bad `/register` link is readable on a phone
- [x] `tsc --noEmit`, `biome check` clean
- [ ] Manual in-browser check - unknown URL signed in and signed out, phone width

---

## Privacy Policy opens in a new tab (2026-10-26)

- [x] Footer `PrivacyPolicyLink` and the cookie banner link open `/privacy-policy` in a new tab, so a
      visitor mid-registration keeps the form and the invite token
- [x] External-link icon + screen-reader "(opens in a new tab)" (EN + 中文)
- [x] `tsc --noEmit`, `biome check` clean
- [ ] Manual in-browser check - open the policy mid-form, close the tab, form still filled; phone width
- [x] `/register` below `lg`: image pane now a `h-56` banner (logo + heading) stacked above the form
      instead of hidden; desktop split unchanged. `ui-rules.md` rule updated (approved exception)
- [x] Logo 80px (`w-20`, plate `p-3`) below `xl`, 96px (`xl:w-24`) at `xl`+
- [x] Split moved `lg` → `xl`: at ~1030px the half-width form clipped phone/select fields; banner,
      logo and heading sizes switch at `xl` with it
- [ ] Manual in-browser check - phone and tablet widths, banner text readable, desktop split unchanged

---

## Stakeholder rejection, new stakeholder roles, DH email, phone default (2026-10-26)

- [x] Stakeholders (and a delegate) can **reject** with a required reason. First decision wins
      (conditional updates on both approve and reject). The record stays `AtReception`, leaves the
      stakeholder queue (`approval_requested_at` cleared), and reads as rejected
      (`engagements.approval_rejected_at`) until Reception requests again, which clears it
- [x] History in new `stakeholder_rejections` table (reason encrypted); delegation cleared on reject
- [x] Notified (dashboard + email): all Receptionists (link to the record) and the inviting Department
      Head via the invitation (link "Visit dashboard"); Reception-keyed records have no DH
- [x] Stakeholder roles now CSO, HCM, GMM, EM (`STAKEHOLDER_ROLES` in `lib/domain/types.ts`
      replaces 8 inline lists). DMD renamed to EM
- [x] Migration `0026_stakeholder_rejections.sql`: table + column, plus hand-added
      `DMD → EM` for `staff_users.workflow_roles` and pending access requests. **Written, NOT applied**
- [x] Department Head "new registration submission" email link reads "Visit dashboard"
- [x] Phone fields start with a real `+233` code (was a placeholder); an untouched field stays empty
- [x] `tsc --noEmit`, `biome check` clean
- [ ] **Apply `bun run db:migrate` (dev), then production.** Holders of DMD must sign out/in after
- [ ] Manual check: request → reject → Reception sees badge + reason → request again → approve;
      emails to Reception and DH; phone field saves `+233 …`

---

## Hospital fitness form removed; no medical details to Reception (2026-10-26, issue #27)

- [x] `hospital_fitness_form` removed from `DOC_TYPES`, `DOCUMENT_LABELS`, `DOC_TYPE_OWNERS` and the
      dictionary. Hospital records the outcome only and uploads nothing
- [x] `isApplicableDocType` (`lib/domain/types.ts`) replaces two filters that special-cased the
      hospital form; it excludes every layer-owned type via `LAYER_OWNED_DOC_TYPES`
- [x] Reception's Fit-with-Conditions email no longer includes the doctor's comments; Training's
      clearance email no longer claims a fitness form is attached
- [x] `bun run db:cleanup:fitness-forms` deletes legacy fitness-form files (UploadThing) and rows.
      **Run on dev: 4 of 4 deleted.** Production not run yet
- [x] `tsc --noEmit`, `biome check` clean
- [ ] Run the cleanup against production (script reads `.env.development`; needs production env)
- [ ] Open question: Security's `PriorLayersSummary` still shows the doctor's comments

---

## Email links: return after sign-in, "No access" page (2026-10-26, issue #25)

- [x] Signed out: the proxy sends `/sign-in?next=<requested path>`; sign-in passes it to Entra as
      `redirectTo`; the proxy carries it to `/pin` or `/pin/setup`, which push to it after the PIN.
      `safeNextPath` (`lib/auth/next-path.ts`) accepts only `/dashboard…` paths (no open redirect)
- [x] Wrong role: the proxy redirects to the new `(auth)/no-access` page ("No access" + Return to
      dashboard) instead of a bare `Forbidden` 403 text response
- [x] `tsc --noEmit`, `biome check` clean
- [ ] Manual check: signed out, open an email link → sign in → PIN → lands on that record;
      Hospital user opens a Reception link → "No access" page

---

## Familiarization Visit label (2026-10-26, issue #22)

- [x] `ACCESS_PURPOSE_LABELS.Visit` is now "Familiarization Visit (no mine site access)" (+ 中文
      "参观考察（不进入矿区）"), so the foreign form, Reception's form and every queue say what the local
      form already did. Behaviour unchanged by decision: approval completes a visit-only record
- [ ] Close #22 as working as intended once merged

---

## Reception "Rejected" tab (2026-10-26, issue #21)

- [x] Third view on `/dashboard/reception` (`?view=rejected`) with a count pill: records at Reception
      whose stakeholder rejection still stands. Name, passport, nature of visit, rejected by (role),
      reason, date, Review. Leaves the tab when Reception requests again or cancels
- [x] `listRejectedEngagements` / `countRejectedEngagements` (`workflow-service.ts`); latest
      rejection per row fetched in one query
- [x] Decided: the visitor is **not** told about a rejection (Reception + inviting DH only)
- [x] Migration `0026` confirmed applied on dev (27 migrations). Production not checked
- [x] `tsc --noEmit`, `biome check` clean
- [ ] Manual check: reject a request → appears under Rejected with reason → request again → gone

---

## Role changed while signed in (2026-10-26, issue #19)

- [x] Proxy sends wrong-role requests to `/no-access?next=<requested>`. The page compares the
      session's roles with the database; if they differ (an admin changed them since sign-in) it
      renders the existing `SessionRefresher`, which updates the session, asks for the PIN again and
      continues to the requested page. Otherwise it shows "No access" as before
- [x] No loop: after the refresh the roles match, so a real lack of access shows the page
- [x] `tsc --noEmit`, `biome check` clean
- [ ] Manual check: signed in as Hospital, admin adds Receptionist, open Reception → PIN → Reception

---

## Access request requires a real role choice (2026-10-26, issue #18)

- [x] Access was already impossible without a role (unprovisioned users are held on `/unauthorized`
      until a System Administrator provisions them)
- [x] Request form no longer pre-selects Guest; Request Access is disabled with "Select a role to
      continue." until a role is chosen
- [x] `REQUESTABLE_ROLES` (`lib/domain/types.ts`) shared by the form and `requestAccessAction`, which
      now rejects any role not on the list
- [ ] Optional, not done: show full role names (e.g. "Chief Sustainability Officer (CSO)")
- [x] `tsc --noEmit`, `biome check` clean

---

## Fit with Conditions requires doctor's comments + agreed email copy (2026-10-27)

- [x] `recordHospitalClearance` rejects Fit with Conditions with empty doctor's comments; the
      Hospital form marks the field required (`*`) and disables Submit until comments are entered
- [x] ~~Reception's Fit with Conditions email carries the doctor's comments~~ — removed in the
      final email copy; comments are still required on the form
- [x] `tsc --noEmit`, `biome check` clean
- [ ] Manual check: Hospital selects Fit with Conditions → Submit stays disabled until comments
      entered; Reception email shows the comments
- [x] All emails rewritten to the agreed plain-language copy:
      privacy link on the invitation, company name in Reception's registration email,
      receptionist's name in the delegated-approval request, one "due for induction" email to
      Training School (from management approval or Hospital), "due for medicals" to Hospital
- [x] `ROLE_LABELS` / `SYSTEM_ROLE_LABELS` (`lib/domain/types.ts`) so emails never show code
      values like `HospitalStaff`
- [ ] Manual check: trigger a few emails and read them in the inbox

---

## Final email copy (2026-10-27)

- [x] All 18 emails rewritten to the final agreed copy: "Hello,"
      greetings, subjects as "<Topic> - {name}", fuller instructions per email
- [x] Invitation no longer names the department; rejection email's Reception button opens the
      application again
- [x] Fit with Conditions email has no doctor's comments; revocation-request subject has no
      "GMC Site Access:" prefix — both exactly as agreed
- [x] `tsc --noEmit`, `biome check` clean
- [ ] Manual check: read a few real emails in the inbox

---

## Slice 8 — Visa / Permit Expiry Flagging 🔲

*Not started.*

---

## Slice 9 — Hospital Timeout 🔲

*Not started.*

---

## Slice 10 — Async Email 🔲

*Not started.*
