# Stakeholder workflow exemptions

Status: design and storage approved; migration 0029 applied and verified against
the database configured in `.env.development`, 2026-11-04. Workflow rules are
implemented and tested. Reception-only messaging and dialog submission are now
implemented. Final build and automated verification passed; manual browser and
mailbox checks remain. See `stakeholder-exemptions-verification.md`.

## Agreed behaviour

Stakeholders can approve an engagement with Hospital, Training School, or both
exempted. The exemption is selected during initial stakeholder approval while
the engagement is at Reception. A non-empty reason/comment and the existing
approval signature are required. Only stages required for the access purpose
can be selected; visit-only engagements have no exemption options.

The approved authority is non-Guest CSO, HCM, GMM, and EM users. Delegated
approvers keep normal approval but cannot grant exemptions.

The exemption approval generates a dashboard notification and an email only
to Reception. The stakeholder writes the reason/comment in the dialog; the
system fills the email template with visitor name, passport/ID, exempted
stages, approver name/role, comment, next destination, and a Reception detail
link. Do not also send the normal approval message to the next department for
this exemption approval event. Subsequent processing uses the normal handoff
notifications, addressed to the actual next required department.

The workflow moves automatically and does not wait for Reception to acknowledge
the message. Reception and downstream staff can read exemption details in the
engagement and its history. A stage displays Exempted rather than a fabricated
medical or induction outcome.

## Routing

| Purpose | Hospital exempt | Training exempt | After approval | After Hospital clears |
|---|---|---|---|---|
| Work / WorkMine | No | No | Hospital | Training School |
| Work / WorkMine | Yes | No | Training School | Not applicable |
| Work / WorkMine | No | Yes | Hospital | Security |
| Work / WorkMine | Yes | Yes | Security | Not applicable |
| VisitMine | Not applicable | No | Training School | Not applicable |
| VisitMine | Not applicable | Yes | Security | Not applicable |
| Visit | Not applicable | Not applicable | Existing visit-only completion | Not applicable |

Unfit Hospital outcomes still block progress when Hospital is required. An
exempt Hospital stage does not participate in medical-expiry checks. Exemptions
belong to the current workflow cycle; a later cycle does not silently inherit
them. Normal approval and rejection behaviour remains as implemented.

## Data and integration

Add cycle-scoped exemption records with a stage, encrypted reason, and references
to the workflow cycle and stakeholder approval. The approval already records
authorising staff member, role, signature, and timestamp. Enforce one exemption
per stage per cycle, foreign keys, and allowed stages in the migration.

Storage checkpoint: `workflow_exemptions` stores the engagement ID, workflow cycle
ID, stakeholder approval ID, stage, and encrypted reason. Composite foreign keys
ensure the approval and cycle belong to the same engagement. Supporting composite
unique constraints are added to the parent tables before these foreign keys in
`0029_workflow_exemptions.sql`. Approval identity, signature and time stay in the
existing approval record. The input type and labels live in `lib/domain/types.ts`.
Required non-blank reason, role, applicable-stage and active-cycle validation is
implemented in the server service. A separate guarded browser action now exposes
exemption submission; normal approvals keep their existing action contract.

Workflow checkpoint: `lib/domain/workflow-exemptions.ts` owns validation and
destinations. `applyStakeholderExemption` uses a locked engagement and one
transaction for approval, encrypted exemptions, routing and audit. It rechecks
current exemption authority in the staff table. `getActiveWorkflowExemptions`
isolates the active cycle. Hospital hands off to the next required stage;
Hospital's ordinary handoff emails use the actual destination, including Security.
An exemption approval saves encrypted dashboard notices only for active Receptionists
in the same transaction. Its return value captures visitor identity, saved approver,
UTC approval time, stages, trimmed comment and actual next destination for email.

Verification: 37 source tests and 19 PostgreSQL integration scenarios passed.
Integration fixtures shadow public tables with temporary tables inside a rolled-back
transaction. Overlapping-request tests serialize savepoints in the single-session
fixture; they verify first-decision behavior, not separate-session lock contention.
No timeout worker exists yet in this repository; the current medical-age check
and Training sign-off are exemption-aware.

Interface checkpoint: eligible stakeholders can open `StakeholderExemptionDialog`
and select applicable stages, enter a comment, capture a signature and preview
the destination. Confirmation requires a stage, comment and signature. Pending
submission disables editing/closing; saved approvals cannot be submitted again.
Normal approval and rejection remain functional. Saved exemption summaries show
stage, comment, captured approver/role, UTC timestamp and cycle. Reception and
stakeholders see history; Hospital, Training and Security show active-cycle details.
Security displays Exempted in place of missing/completed outcomes for exempt stages.

Both CSVs append four exemption columns without moving existing columns. Training
includes exempted cycles even without induction records and labels them Exempted;
completion fields stay blank and clearance forms are Not required. Hospital-only
exemptions preserve actual Training outcomes. WorkMine awaiting induction is included.
Reports match exemptions to the owning engagement and cycle, including history.
46 source tests and an additional rolled-back PostgreSQL report-query scenario
passed. Browser interaction/visual verification remains a manual check.

Messaging checkpoint: `applyStakeholderExemptionAction` validates the session and
payload, then commits through the exemption service. Only the returned Reception
recipients receive `stakeholderExemptionApprovedTemplate`; it uses the saved event
snapshot and a Reception record link. Missing Reception users, mail failures or
cache-refresh failures return success with a warning after commit. Delivery attempts
continue for other Reception recipients if one send fails. No normal approval email
is sent to the next department for this event. Queue/detail paths and the dashboard
layout are refreshed. See `stakeholder-exemption-email-example.md` for final wording.
56 source tests passed, with a mock sender; no live emails were sent in tests.
The complete 21-scenario PostgreSQL integration suite passed with all temporary
fixtures rolled back. TypeScript and targeted Biome checks passed. Separate-session
lock contention, browser interaction and live mailbox delivery have not been tested.

Save approval, exemptions, routing transition, and Reception dashboard notices
in one transaction. Use the existing first-decision-wins protection against
concurrent approval/rejection. Validate authority and selected stages on the
server. Send the email after commit using the existing mail path; a mail failure
returns a warning without undoing the approval or inserting another decision.
Escape stakeholder comments in email HTML using the existing template helpers.

Update stakeholder-panel.tsx, approval action/service, Hospital handoff,
medical-age checks, shared engagement details/history and Security's prior-layer
summary. Review Training report classification so exempted stages do not appear
as completed inductions. Include any existing timeout processing in the audit.
Use existing components and tokens; no new dependencies.

## Approval checkpoints

1. **Approve this design.** No application or database changes in this step.
2. **Prepare storage.** Add schema, migration, domain types and data invariants.
   Show the diff and validation, then wait. Do not apply the migration yet.
3. **Apply the reviewed migration to the explicitly confirmed database.** Keep
   production application separate and require approval for that target.
4. **Implement workflow rules.** Add server validation, atomic persistence,
   routing, Hospital handoff and exemption-aware downstream checks. Test normal
   and exempted paths, concurrent decisions, and cycle isolation; then wait.
5. **Implement the interface and visibility.** Add Approve with Exemption,
   applicable stage choices, required comment/signature and destination preview;
   show the authorised exemption in relevant details, history and reports.
   Document the UI pattern, then wait.
6. **Implement Reception-only messaging.** Add the email template and notification
   routing, show the final email example, test recipient isolation and failure
   handling, then wait.
7. **Final verification.** Run relevant checks and present browser scenarios for
   the user to verify. Never start a development server for visual checks.

Each approval authorises only the next stated checkpoint. Do not proceed to
another checkpoint until the user approves it. No deployment is included.
