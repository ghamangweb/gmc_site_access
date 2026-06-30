# Build Plan

Each slice delivers a **complete, working, testable feature** from database to UI.
Build and verify one slice end-to-end before starting the next. No orphaned plumbing.

---

## Step 0 — Scaffold ✓

- [x] Next.js 16, TypeScript strict, Tailwind CSS, shadcn/ui, pnpm
- [x] Docker Compose PostgreSQL (localhost:5433)
- [x] Drizzle ORM + `drizzle.config.ts` pointing to `src/lib/db/schema.ts`
- [x] `.env.example` with `DATABASE_URL`
- [x] `src/lib/db/client.ts` + placeholder schema in place; `@/` alias resolves correctly
- [x] Branded landing page at `localhost:3000`

---

## Slice 1 — Auth

**Delivers:** A new user can sign in with Microsoft, request access, be provisioned by a System
Admin, set a PIN, and reach the dashboard. The complete auth loop works end-to-end.

### Schema

| Table | Key columns |
|---|---|
| `staff_users` | id, entra_object_id (unique), email, display_name, system_role, workflow_roles (text[]), pin_hash, pin_failed_attempts, pin_locked_until, provisioned_at, created_at |
| `notifications` | id, recipient_staff_user_id (FK → staff_users), engagement_id (nullable FK), message, read_at, created_at |

### Seed

`src/lib/db/seed.ts` — inserts the first System Admin row directly into `staff_users` (one-time,
local only). Run once after migration. Removes the chicken-and-egg problem: you have a System
Admin to log in as before the provisioning UI is tested.

### Email (set up once here — all subsequent slices add to templates.ts)

| File | Responsibility |
|---|---|
| `src/lib/azure/graph-mail.ts` | Send one email via Microsoft Graph API (synchronous for local dev) |
| `src/lib/email/send.ts` | Render template + call graph-mail |
| `src/lib/email/templates.ts` | One function per event — start with auth templates; every slice adds to this file |

Auth email templates: access requested (→ System Admin), access approved (→ new user), PIN reset (→ user).

### UI tokens (define before building any UI)

Fill in `context/ui-tokens.md` with the CSS variables and shadcn/ui theme before building auth
pages. Install shadcn/ui and configure the base component set (Button, Input, Label, Card, Form).

### Auth library + config

| File | Responsibility |
|---|---|
| `src/lib/auth/entra.ts` | NextAuth config — Azure AD (Entra ID) provider |
| `src/lib/auth/pin.ts` | `hashPin`, `verifyPin`, `validatePin` (rejects blocked patterns), lockout after 3 attempts for 15 min |
| `src/lib/auth/session.ts` | `SessionUser` type (`staffUserId`, `systemRole`, `workflowRoles`, `pinConfirmed`); `getSession` helper |
| `src/lib/auth/guards.ts` | `requireWriteAccess(layer)`, `requireSystemAdmin()`, `requireProvisioned()` |
| `src/middleware.ts` | Single pipeline: Entra session → provisioned check → PIN confirmed → role gate |

**Blocked PIN patterns** (rejected at creation with a clear message):
all zeros (`0000`), repeating digits (`1111`, `2222`), ascending (`1234`), descending (`4321`), any sequential/repeating pattern (`1122`, `1235`).

### Auth flow

1. Any `/dashboard/*` visit → middleware redirects to `/sign-in`
2. "Sign in with Microsoft" → Entra OAuth (org MFA enforced)
3. NextAuth callback looks up user by `entra_object_id`
4. Not found or `system_role = User` → `/unauthorized`
5. User selects desired role + submits → Server Action creates System Admin notification + sends email
6. Provisioned user, no PIN (`pin_hash = null`) → `/pin/setup`
7. User sets PIN → `validatePin` checks blocked patterns → bcrypt hash stored
8. Provisioned user, PIN exists → `/pin` entry
9. Wrong PIN → increment `pin_failed_attempts`; 3 failures → lock 15 min
10. Correct PIN → `pinConfirmed = true` in session → dashboard
11. Session idle timeout: 1 hour

### Pages

| File | What it does |
|---|---|
| `src/app/(auth)/sign-in/page.tsx` | "Sign in with Microsoft" button |
| `src/app/(auth)/pin/page.tsx` | 4-digit PIN entry form |
| `src/app/(auth)/pin/setup/page.tsx` | First-login PIN creation (enter + confirm; blocked patterns rejected) |
| `src/app/(auth)/unauthorized/page.tsx` | Role selector dropdown + "Request Access" CTA |

### System Admin — user management (minimal — just enough to close the auth loop)

`src/app/dashboard/admin/users/` pages:
- User list showing all staff users + pending access requests highlighted
- Provision user: set `system_role` + `workflow_roles`
- Reset PIN: clears `pin_hash`; user must re-create on next login

### Server Actions

| Action | What it does |
|---|---|
| `src/actions/auth.ts` → `requestAccess` | Creates notification for System Admin + sends email |
| `src/actions/admin.ts` → `provisionUser` | Sets system_role + workflow_roles + provisioned_at |
| `src/actions/admin.ts` → `assignRoles` | Updates workflow_roles |
| `src/actions/admin.ts` → `resetPin` | Clears pin_hash; notifies user by email |

### Done when

- [ ] New user signs in with Microsoft → lands on `/unauthorized`
- [ ] User selects a role and requests access → System Admin receives dashboard notification + email
- [ ] System Admin (seeded or already provisioned) provisions user + assigns roles → user receives email
- [ ] Newly provisioned user signs in → `/pin/setup`; blocked PIN patterns rejected with clear message
- [ ] Subsequent logins → `/pin` entry; 3 wrong PINs lock for 15 min; lock clears automatically
- [ ] Correct PIN → dashboard; session expires after 1 hour of inactivity
- [ ] System Admin can reset a user's PIN; user must re-create PIN on next login
- [ ] Unprovisioned users cannot reach any `/dashboard/*` route
- [ ] `tsc --noEmit` clean

---

## Slice 2 — Reception

**Delivers:** A Receptionist can register a visitor end-to-end — passport lookup, 6-section form,
applicable document uploads, stakeholder approval (or delegated approval) — and the record
automatically routes to the correct next layer.

### Schema

| Table | Key columns |
|---|---|
| `persons` | id, passport_no (unique), full_name, date_of_birth, gender, nationality, email, phone, emergency_contact_name, emergency_contact_phone |
| `engagements` | id, person_id (FK), access_purpose, arrival_date, departure_date, workflow_state, access_state, is_visa_flagged, reception_data (jsonb), created_at |
| `documents` | id, engagement_id (FK), workflow_cycle_id (nullable FK), doc_type, blob_url, uploaded_by (FK → staff_users), uploaded_at |
| `stakeholder_approvals` | id, engagement_id (FK), approver_role, approver_staff_user_id (FK), approver_name, signature, approved_at |
| `workflow_cycles` | id, engagement_id (FK), cycle_number, archived_at (nullable) |
| `workflow_transitions` | id, engagement_id (FK), workflow_cycle_id (FK), from_state, to_state, performed_by (FK), performed_at, comments — **append-only, never delete** |
| `termination_requests` | id, engagement_id (FK), requested_by (FK), reason, status, decided_by (nullable FK), decided_at (nullable) |

### Azure Blob (set up in this slice)

| File | Responsibility |
|---|---|
| `src/lib/azure/blob.ts` | `uploadBlob`, `generateSasUrl` (short-lived — 15 min) |
| `src/app/api/documents/route.ts` | POST multipart upload → document-service → `{ success, data }` |

### Services

| File | Responsibility |
|---|---|
| `src/lib/services/person-registry-service.ts` | Passport lookup → return existing Person or create new |
| `src/lib/services/workflow-service.ts` | `createEngagement`, `submitForStakeholderApproval`, `applyStakeholderApproval` (routes by access_purpose + mine_site), `requestDelegatedApproval`, `grantDelegatedApproval`, `requestTermination` |
| `src/lib/services/document-service.ts` | Validate upload (type, size), stream to Blob, record in documents table |
| `src/lib/services/notification-service.ts` | Write notification row (sync) + call `src/lib/email/send.ts` |

### Reception form (6 sections per SRS)

- **Section 1** — employment status, access purpose, mine-site flag, personal details, passport no., emergency contact
- **Section 2** — company name, monthly reporting contact, company emergency contact
- **Section 3** — GMC liaison person + department, arrival/departure dates, reason for request
- **Section 4** — airport pickup, transport, accommodation, permanent access badge, Ghana visa, site induction, PPE, IT access, visa type, access level
- **Section 5** — HCM / GMM / DMD authorization: name + signature (draw pad, upload, or text input); timestamps auto-recorded
- **Section 6** — accommodation confirmed, itinerary attached, inflight updated, remarks

Applicable document uploads (Receptionist selects which apply; only selected become required):

| Doc type | Label |
|---|---|
| `passport_biodata` | Passport biodata page |
| `valid_visa` | Valid visa |
| `mincom_letter` | MINCOM letter of approval |
| `work_residence_permit` | Work or residence permit |
| `ghana_card` | Ghana Card |
| `assignment_letter` | Letter of assignment / contract |
| `insurance_proof` | Proof of medical/travel insurance |

### Stakeholder approval rules

- "Request Approval" notifies HCM, GMM, and DMD simultaneously (dashboard + email)
- Any one approval is sufficient to advance the record
- On approval: work path → `AtHospital`; visit-only → `Completed`; visit+mine → `AtTraining`
- Reception layer becomes read-only after approval

### Delegated Approval

When all three approvers are unavailable:
1. Receptionist clicks "Request Delegated Approval"
2. System notifies HCM, GMM, DMD, and System Admin via dashboard + email
3. System Admin grants one-off approval privilege to Receptionist (via admin UI — add to `/dashboard/admin/`)
4. Receptionist performs single approval action
5. System records: delegated approver, granted by, granted date, approval date, reason
6. Full audit row written to `workflow_transitions`; System Admin can revoke at any time

### Pages + components

| File | What it does |
|---|---|
| `src/app/dashboard/reception/page.tsx` | Reception queue — Server Component |
| `src/components/workflow/reception-form.tsx` | 6-section engagement form |
| `src/components/workflow/document-selector.tsx` | Applicable document picker + upload dropzones |
| `src/components/workflow/stakeholder-panel.tsx` | Approval status + request button + delegated approval CTA |

### Server Actions

`src/actions/engagements.ts` — `submitReception`, `requestStakeholderApproval`, `requestDelegatedApproval`, `requestTermination`

`src/actions/admin.ts` additions — `grantDelegatedApproval`, `revokeDelegatedApproval`

### Email templates (add to templates.ts)

- Stakeholder approval requested → HCM, GMM, DMD (all three)
- Approval received → next layer (Hospital for work; Training for visit+mine; nothing for visit-only)
- Delegated approval requested → HCM, GMM, DMD, System Admin
- Delegated approval granted → Receptionist
- Termination requested → System Admin

### Done when

- [ ] Returning visitor passport lookup pre-fills all Person fields
- [ ] New visitor: Person + Engagement created in one submission
- [ ] All 6 sections validate; required fields block record from advancing
- [ ] Applicable document selector works; non-selected types not required
- [ ] Documents reach Azure Blob; SAS URL renders the file in-browser
- [ ] "Request Approval" notifies all three stakeholders simultaneously via dashboard + email
- [ ] Any one stakeholder approval routes the record correctly (work → Hospital, visit-only → Completed, visit+mine → Training)
- [ ] Delegated approval full loop: request → grant → Receptionist approves → audit row written
- [ ] Termination request creates row + notifies System Admin
- [ ] Guest Receptionists see queue read-only; no form actions rendered

---

## Slice 3 — Hospital

**Delivers:** Hospital staff can record medical clearance. Fit records advance to Training School.
Unfit records stay at Hospital and Reception is notified.

### Schema

| Table | Key columns |
|---|---|
| `hospital_clearances` | id, workflow_cycle_id (FK), clearance_status, doctor_comments, clearance_date |

### Services

`workflow-service.ts` additions — `recordHospitalClearance`, route Fit/FitWithConditions to `AtTraining`, hold Unfit at `AtHospital`

### Pages + components

| File | What it does |
|---|---|
| `src/app/dashboard/hospital/page.tsx` | Hospital queue — work-path records at `AtHospital` |
| `src/components/workflow/hospital-form.tsx` | Fitness form upload + clearance form |

Hospital form:
- Compulsory upload: `hospital_fitness_form` (must be uploaded before clearance can be submitted)
- Medical clearance status: Fit / FitWithConditions / Unfit
- Doctor comments (required)
- Clearance date (auto-recorded on submit)
- Read-only view of Reception data (personal details, company, stakeholder approvals)

### Server Actions

`src/actions/engagements.ts` additions — `submitHospitalClearance`

### Email templates

- Hospital cleared (Fit/FitWithConditions) → Training School
- Hospital unfit → Reception

### Done when

- [ ] Hospital queue shows only work-path records at `AtHospital`
- [ ] Fitness form upload required before clearance form can be submitted
- [ ] Fit/FitWithConditions → `AtTraining`; Training School notified
- [ ] Unfit → stays `AtHospital`; Reception notified
- [ ] `hospital_clearances` row written on every submission
- [ ] Reception data visible read-only to Hospital staff

---

## Slice 4 — Training School

**Delivers:** Training School can record induction completion for both work-path and visit+mine-path
visitors. Completed records advance to Security.

### Schema

No new tables. Uses `workflow_cycles` and `workflow_transitions` from Slice 2.

### Services

`workflow-service.ts` additions — `recordInductionCompletion`, `checkHospitalClearanceAge`
(guard: blocks sign-off if work-path clearance is older than 3 months)

### Pages + components

| File | What it does |
|---|---|
| `src/app/dashboard/training/page.tsx` | Training queue — work-path + visit+mine records at `AtTraining` |
| `src/components/workflow/training-form.tsx` | Induction form + uploads + sign-off |

Training form:
- Compulsory uploads (both required before sign-off): `induction_declaration_form` + `induction_registration_form`
- General site induction, other inductions/training
- Induction status, completion date
- Induction sign-off (signature)
- Hospital clearance expiry warning banner (work-path only): warns when < 30 days remain; blocks when expired
- Read-only view of Reception + Hospital data

### Server Actions

`src/actions/engagements.ts` additions — `submitTrainingCompletion`

### Email templates

- Induction complete → Security

### Done when

- [ ] Training queue shows both work-path and visit+mine records
- [ ] Both uploads required before sign-off can be submitted
- [ ] Work-path guard: sign-off blocked if hospital clearance > 3 months old
- [ ] Induction complete → `AtSecurity`; Security notified
- [ ] Prior layer data (Reception, Hospital) visible read-only

---

## Slice 5 — Security

**Delivers:** Security staff can audit all prior layer data and forward records to IT for biometric
enrollment.

### Schema

No new tables.

### Services

`workflow-service.ts` additions — `forwardToIT`

### Pages + components

| File | What it does |
|---|---|
| `src/app/dashboard/security/page.tsx` | Security queue — work-path + visit+mine records at `AtSecurity` |
| `src/components/workflow/security-view.tsx` | Read-only audit view of all prior layers + forward action |

### Server Actions

`src/actions/engagements.ts` additions — `forwardToIT`

### Email templates

- Forwarded to IT → IT Staff

### Done when

- [ ] Security queue shows work-path and visit+mine records (not visit-only)
- [ ] All prior layer data (Reception through Training) visible read-only
- [ ] Forward to IT transitions to `AwaitingProvisioning`; IT notified

---

## Slice 6 — IT

**Delivers:** IT staff can complete biometric enrollment, issue access cards, and activate site
access. Full work-path and visit+mine-path records can complete end-to-end.

### Schema

No new tables. Uses existing `documents` table for `biometric_image` and `passport_photo`.

### Services

`workflow-service.ts` additions — `activateAccess`

### Pages + components

| File | What it does |
|---|---|
| `src/app/dashboard/it/page.tsx` | IT queue — records at `AwaitingProvisioning` |
| `src/components/workflow/it-form.tsx` | Biometric uploads + access card fields + activate action |

IT form:
- Compulsory upload: `biometric_image`
- Compulsory upload: `passport_photo`
- ID type, biometric captured (yes/no), access card number, access card expiry date
- Overall status (set to Active on submit)
- "Set Access Active" action (requires both uploads + all required fields)
- Read-only view of all prior layer data

### Server Actions

`src/actions/engagements.ts` additions — `activateAccess`

### Email templates

- Access activated → Security + Reception

### Done when

- [ ] IT queue shows records at `AwaitingProvisioning`
- [ ] Both uploads required before activation
- [ ] Activation sets `workflow_state = Completed`, `access_state = Active`
- [ ] Security and Reception notified via dashboard + email
- [ ] A work-path visitor can complete the full pipeline Reception → Hospital → Training → Security → IT
- [ ] A visit+mine visitor can complete Reception → Training → Security → IT

---

## Slice 7 — Access Termination

**Delivers:** Reception can request termination. System Admin approves or rejects. IT executes
revocation. Full audit trail throughout.

### Schema

`termination_requests` table already created in Slice 2.

### Services

`src/lib/services/termination-service.ts` — `approveTermination`, `rejectTermination`, `revokeAccess`

### Pages + components

- System Admin: termination approval queue in `/dashboard/admin/terminations/` — approve or reject with comments
- IT: second queue tab for termination-approved records (`access_state = TerminationRequested`) — "Revoke Access" action

### Server Actions

`src/actions/admin.ts` additions — `approveTermination`, `rejectTermination`

`src/actions/engagements.ts` additions — `revokeAccess`

### Email templates

- Termination approved → IT
- Termination rejected → Reception

### Done when

- [ ] System Admin sees pending termination requests; can approve or reject with comments
- [ ] Approved: `access_state = TerminationRequested`; IT notified
- [ ] IT revoke action: `access_state = Terminated`; Reception + Security notified
- [ ] Rejected: Reception notified; record continues in normal workflow
- [ ] Every step (request, decision, revocation) written to `workflow_transitions`

---

## Slice 8 — Visa / Permit Expiry Flagging

**Delivers:** The system automatically flags records with expired visa or work permit daily.
All layer write actions are blocked on flagged records until Reception clears the flag.

### Schema

`is_visa_flagged` column already in `engagements` (Slice 2).

### What to build

- `functions/check-visa-expiry/index.ts` — Azure Function, timer-triggered daily; queries engagements with expired visa/permit dates; sets `is_visa_flagged = true`; writes notifications; sends emails
- `workflow-service.ts` additions — `flagEngagement`, `clearVisaFlag`; add `is_visa_flagged` guard to all write actions in all layers
- Reception: visa flag warning banner on flagged engagement + "Clear Flag" action (after new documents uploaded)

### Email templates

- Visa/permit flagged → Reception + Security + IT

### Done when

- [ ] Azure Function sets `is_visa_flagged = true` on affected records and notifies Reception, Security, IT
- [ ] All write actions on flagged records return a blocked error with clear message
- [ ] Reception can upload renewed documents and clear the flag
- [ ] Prior layer data remains read-only while flag is set

---

## Slice 9 — Hospital Timeout

**Delivers:** Work-path records stuck at Training for more than 3 months are automatically returned
to Hospital for a fresh medical checkup.

### What to build

- `functions/check-hospital-timeout/index.ts` — Azure Function, timer-triggered daily; queries work-path records at `AtTraining` where `hospital_clearances.clearance_date` is older than 3 months; archives active `workflow_cycles` row (sets `archived_at`); resets `workflow_state = AtHospital`; opens new `workflow_cycles` row; notifies Hospital + Training School + Reception

### Email templates

- Hospital revalidation required → Hospital Staff + Training School Staff + Reception

### Done when

- [ ] Azure Function archives the timed-out `workflow_cycles` row
- [ ] `workflow_state` resets to `AtHospital`; new cycle opened
- [ ] Hospital, Training School, and Reception all notified via dashboard + email
- [ ] Previously archived Training cycle visible as history (not deleted)

---

## Slice 10 — Async Email (production-ready)

**Delivers:** Email delivery moves from synchronous Graph API calls to an async Azure Storage
Queue + Azure Function. No UI or business logic changes — infrastructure only.

### What to build

| File | Responsibility |
|---|---|
| `src/lib/azure/queue.ts` | Enqueue message to Azure Storage Queue |
| `src/lib/email/enqueue.ts` | Build job payload + call queue; replaces direct `send.ts` call from notification-service |
| `functions/send-email/index.ts` | Queue-triggered Azure Function; dequeues + calls `send.ts` → `graph-mail.ts` |

Update `src/lib/services/notification-service.ts` to call `enqueue.ts` instead of `send.ts` directly.

### Done when

- [ ] All outbound email goes through Azure Storage Queue — no HTTP handler blocks on Graph API
- [ ] `send-email` Function dequeues and delivers correctly in staging environment
- [ ] No regression in email delivery across all slices (verify in staging)
- [ ] `context/library-docs.md` updated with Drizzle, NextAuth, Azure SDK, Graph API usage patterns
