# Hospital CSV export — implementation and verification

User approved continuing from Reception to Hospital on 2026-11-05. Stop after
Hospital for user verification and approval before Stakeholder Approvals. Department
and Records Overview remain excluded.

## Scope and behavior

Export Hospital Report uses the established Training/Security/Reception outline
button, loading state, download and error-toast pattern. It is hidden from Guests.
`/api/reports/hospital` requires active, PIN-confirmed HospitalStaff write access,
delegates to the workflow service and returns a dated no-store CSV attachment.
Tab, search and pagination do not restrict the combined report.

The report includes every recorded medical clearance/review, active work-path cycles
awaiting Hospital clearance, and cycles with a Hospital exemption. One row represents
each recorded clearance/review; a selected cycle without a clearance gets one awaiting
or exempted row. An Unfit record awaiting re-clearance therefore appears once, with
its recorded outcome. Earlier decisions remain in the report rather than being replaced.

Columns: name, passport/ID, company, nature of visit, arrival/departure, Hospital status,
current workflow stage, clearance outcome, doctor's comments, recorded time (UTC),
recording staff, next review date, latest-clearance indicator, review timing and the
existing exemption stage/reason/approver/time columns. Missing legacy recording staff
stay blank; exempt cycles never acquire fabricated Fit outcomes or recording details.

Review eligibility reuses the existing Hospital query conditions: the engagement's
latest clearance with a review date, beyond Hospital, excluding Cancelled and revoked
access. Due timing is Upcoming, Due Today or Overdue. Archived-cycle rows do not claim
pending reviews. Latest-clearance detection follows the dashboard's existing timestamp
comparison across all cycles. Exemptions are matched to both cycle and engagement,
including their own historical cycle; a Training-only exemption preserves the medical
outcome. A new awaiting cycle never inherits the previous cycle's clearance.

## Validation

- 86 source tests passed, including nine Hospital report scenarios and three endpoint
  scenarios. Existing Reception/Training/Security tests continue to pass.
- TypeScript and targeted Biome checks passed.
- Production build passed, including `/api/reports/hospital` and the Hospital dashboard.
- New standalone Hospital files pass anti-slop checks. Existing shared-file findings
  remain outside this change; spacing fixes were applied only to the new service function.
- Isolated PostgreSQL check passed using temporary shadow tables: empty report,
  501 included cycles/502 rows across the 500-cycle boundary, all historical decisions,
  latest Unfit re-clearance, latest-only pending reviews, cancelled/revoked review
  exclusions, recording staff, exemptions, cross-cycle isolation and stable repeated
  exports. All fixtures rolled back; no visitor records changed. The local script is
  `temp/hospital-csv-integration.ts` (git-ignored).

## Review and limits

Manual review covers all new Hospital files against scope, architecture, authorization,
empty data, historical decisions and CSV protection. Service queries use an ordered,
read-only repeatable-read snapshot in 500-cycle batches. Existing BOM, quoting and
spreadsheet formula protection apply to all fields, including medical comments.
Like the existing exports, the complete CSV is buffered in memory before download;
batching limits database reads but does not bound total CSV memory. No new libraries,
schema changes, migrations or workflow writes are included.

CodeRabbit completed its tracked-diff review with no findings. New untracked Hospital
files were covered by manual review, source tests, TypeScript, lint and the build.

## Browser verification before Stakeholder Approvals

- [ ] Hospital shows Export Hospital Report; Guests do not see it.
- [ ] Awaiting Clearance, Awaiting Review and Recorded Clearances all download the same
      full report, including when a search or later page is selected.
- [ ] Confirm name/ID, recording staff, outcomes, comments and dates against saved records.
- [ ] Verify multiple recorded clearances/reviews remain separate rows, latest Unfit is
      awaiting re-clearance, and only eligible latest records show pending review timing.
- [ ] Confirm exemption rows have the right authorisation and no invented clearance;
      a Training-only exemption keeps the recorded medical outcome.
- [ ] Open the CSV in Excel and check Unicode, multiline comments and leading-zero IDs.
- [ ] User approves Hospital before Stakeholder Approvals implementation.
