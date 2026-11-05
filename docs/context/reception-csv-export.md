# Reception CSV export — approved scope and verification

User approved the Reception scope on 2026-11-05. Implement Reception first and
stop for browser verification and approval before Hospital. Stakeholder Approvals
follows Hospital only after approval. Department and Records Overview are excluded.

## Approved design

Use the existing combined Training/Security report pattern. An outline Export
Reception Report button sits beside New Registration. The endpoint requires active,
PIN-confirmed Receptionist write access; Guests cannot export. It returns a dated,
non-cacheable CSV attachment independently of tab, type filter, search or pagination.

The report includes approved submissions with no linked engagement, then all
engagements. Converted submissions appear through their engagement once. It excludes
submissions pending department approval or rejected by the Department Head, matching
Reception's visibility rules. Rejected engagements remain included.

Columns cover name, passport/ID, registration type, company, department, visit purpose,
arrival/departure, submission status/time, current workflow/access status, latest
stakeholder rejection actor/reason/time and current-cycle exemptions with authorisation.
Latest rejection details are historical: they remain visible after resubmission.
Direct registrations have no submission timestamp and no recorded Local/Foreign type;
these fields stay blank. Exemption history from archived cycles is excluded.

## Implementation and checks

- Button/endpoint follow existing report loading, download, error and access patterns.
- Service reads a repeatable-read, read-only snapshot in 500-record batches; no writes.
- Latest card expiry determines effective access status without updating records.
- Existing UTF-8 BOM, quoting and formula protection apply to all cells.
- Domain tests cover labels, identity, UTC dates, empty data, expiry, rejection details,
  current-cycle exemption isolation and spreadsheet safety. Route tests cover denied
  access, ignored view/filter parameters, response headers/BOM and safe failure responses.
- 74 source tests passed. TypeScript and targeted Biome checks passed. New standalone
  Reception files pass anti-slop checks; existing findings in shared files are outside scope.
- Production build passed, including `/api/reports/reception` and the Reception dashboard.
- Isolated PostgreSQL test passed using temporary shadow tables: empty export, 501
  submissions and 501 engagements across both batch boundaries, approved-only submission
  visibility, Local/Foreign form mapping, conversion deduplication, latest rejection/card,
  active-cycle exemption isolation and identical repeat exports. All fixtures rolled back.
  The test script is at `temp/reception-csv-integration.ts` (git-ignored). Its initial
  assertion counted the header as a submission; corrected before the successful rerun.

## Review and limits

Manual review checked all new files against the approved scope, architecture boundaries,
authorization, visibility, empty data, batch ordering and CSV protection. CodeRabbit
reviewed the tracked diff and flagged buffered CSV memory use. This matches the existing
Training/Security implementation: batching bounds database reads, while the complete
CSV is held in memory before download. Large exports can require substantial memory.
Streaming would change the existing service/response pattern and is deferred for a
separate architecture decision. No libraries, migrations or workflow changes were added.

## Browser verification before Hospital

- [ ] Reception shows Export Reception Report beside New Registration; Guests do not.
- [ ] Download from Submitted Registrations, Engagements and Rejected, including a
      Local/Foreign filter, search and later page: each returns the same full report.
- [ ] Approved unconverted submissions appear; converted submissions appear once via
      their engagement; pending/rejected department submissions are absent.
- [ ] Rejection reason/actor/time, latest card expiry and current-cycle exemptions agree
      with the corresponding saved records.
- [ ] Open the dated CSV in Excel and check Unicode, quotes, leading-zero IDs and dates.
- [ ] User approves Reception before any Hospital implementation starts.
