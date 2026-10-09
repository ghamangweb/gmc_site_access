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

### Schema
- [x] `staff_users` table
- [x] `notifications` table
- [x] `notifications.requester_staff_user_id` — replaces email-substring matching for
      access-request tracking

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
