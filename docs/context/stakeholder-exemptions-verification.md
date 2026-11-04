# Stakeholder exemptions - final verification

Verified: 2026-11-04. Benchmark: `stakeholder-exemptions-plan.md` and its approved checkpoints.

## Automated evidence

- Production build: `bun run build` passed with Next.js 16.2.9, TypeScript, page
  generation and both Training/Security report routes included.
- TypeScript and targeted Biome checks passed for the implementation.
- `bun test ./src`: 56 tests passed. Action delivery tests use a mock sender;
  no live email was sent during testing.
- Explicit PostgreSQL integration suite: 21 scenarios passed in temporary tables
  inside a rolled-back transaction. No public visitor data was updated by these tests.
- Migration 0029 was applied and verified against the database configured in
  `.env.development` at the approved storage checkpoint.
- Whitespace checks passed. Existing unrelated anti-slop findings remain in
  surrounding repository code; new messaging functions and UI follow its patterns.

## Review

Plan alignment: passed code review. Applicable Hospital/Training exemptions, required
comment/signature, authorised initial approval, automatic routing, cycle isolation,
read-only exemption history and CSV classification match the approved design.

System integrity: passed code review. Server guards enforce CSO/HCM/GMM/EM write
authority and fresh staff permission. Exemption records, routing/audit and Reception
dashboard notices are atomic. Reasons are encrypted at rest. UI uses existing
Dialog, Checkbox, SignatureField, Card, Badge, Button and design tokens.

Failure handling: passed automated checks. Duplicate/rejected decisions do not
send mail. Notification persistence failure rolls back the approval. Email and
cache-refresh failures after commit return saved-approval warnings, and other
Reception deliveries are still attempted. Email values are escaped and use the
saved decision snapshot. The exemption event targets active Receptionists only;
later ordinary handoffs notify the actual next department.

No new implementation issues were found in this review. Browser interaction,
visual checks and live mailbox delivery remain unverified. The integration fixture
serializes savepoints for overlapping requests; separate-session lock contention
has not been stress-tested. No deployment is included.

## Browser checklist - use test engagements

Use the application under your control. This work did not start or fetch a
development server. Check the dialog in both light and dark themes.

- [ ] Sign in with a non-Guest CSO, HCM, GMM or EM role. Open a work engagement in
  Approvals for which Reception has requested approval. Approve with Exemption is
  visible beside normal Approve and Reject.
- [ ] Guest, MM-only and delegated-only approvers do not see the exemption button.
  Visit-only engagements offer no exemptions. A mine-tour visitor offers Training
  School only; work engagements offer both Hospital and Training School.
- [ ] Confirmation stays disabled until at least one stage, a non-blank comment
  and a signature are entered. The destination preview follows the table below.
  Cancel/close clears values. Pending submission prevents edits and repeat clicks.

| Purpose | Exemption | After approval | Next processing |
|---|---|---|---|
| Work / WorkMine | Hospital | Training School | Training completion sends it to Security |
| Work / WorkMine | Training School | Hospital | Fit/Fit with Conditions sends it directly to Security |
| Work / WorkMine | Both | Security | Security completes normal access setup |
| VisitMine | Training School | Security | Security completes normal access setup |

- [ ] Approve one test record for each applicable path. A success toast appears
  and the stakeholder returns to their queue. Reception acknowledgement is not
  required for the record to appear in its next processing queue.
- [ ] Reception sees one dashboard message per approved exemption event, with
  visitor/passport, stages, approver/time, comment and next destination. Its email
  matches `stakeholder-exemption-email-example.md` and opens the Reception record.
  Verify only active Reception staff receive this event's email/notification.
- [ ] Saved details show Exempted, the comment, approver and UTC timestamp.
  Reception/stakeholders can see previous cycles; downstream views show the active
  cycle. Exempted stages do not appear as completed medicals or inductions.
- [ ] With Training exempted, an Unfit Hospital result still remains at Hospital.
  With Hospital exempted, Training is not blocked by medical expiry. A later cycle
  does not automatically inherit an earlier exemption.
- [ ] Export Training and Security CSVs from different tabs/searches. Each still
  produces its combined report and appends exemption stage/comment/approver/time.
  Training-exempt rows say Exempted with no fabricated completion details;
  Hospital-only exemptions preserve actual Training outcomes. Check Excel display.
- [ ] Confirm normal Approve/Reject still work. An already-decided record cannot
  be approved a second time. In a controlled mail-failure test, approval remains
  saved and the stakeholder receives a warning.

Record the outcome of these manual checks before treating live-browser and
mailbox verification as complete.
