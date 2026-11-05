# Stakeholder Approvals CSV export — implementation and verification

User approved continuing from Hospital to Stakeholder Approvals on 2026-11-05.
This completes the requested implementation scope: Reception, Hospital and Stakeholder
Approvals. Department and Records Overview are excluded. Browser verification remains
under the user's control; no dev server was started or fetched.

## Scope and visibility

Export Approvals Report follows the existing outline button, loading state, dated
download and error-toast pattern. Guests cannot see the button or export data.
`/api/reports/approvals` requires an active, provisioned, PIN-confirmed session and
denies Guest/User accounts. All five stakeholder roles (CSO, HCM, GMM, EM, MM) receive
the same combined pending/approved visibility as the dashboard.

A non-stakeholder must have a pending delegated assignment or their own signed
approval history to export. The endpoint derives their staff ID from the authenticated
session. Pending records are filtered to that delegate's current assignments; approved
records are filtered to approvals they signed, even after the live delegation is cleared
or reassigned. URL parameters never choose the viewer or widen the scope.

Pending records match Awaiting Approval: at Reception, explicitly requested and with
no approval yet. Unrequested drafts, currently rejected requests and cancelled unsigned
engagements are excluded. Signed approval history remains included at later workflow
stages, including terminal states, matching the Approved tab. One row represents each
engagement; the existing unique approval constraint prevents duplicate join rows.
Tab, search and pagination do not restrict the combined report.

## Columns and data sources

Name, passport/ID, company, nature of visit, arrival/departure, approval status, current
workflow stage, request time (UTC), approver name/role/time, delegated indicator,
delegate/grantor/time/reason, and the existing exemption stage/reason/authorisation
columns. Current departure reflects any approved stay extension; this export does not
introduce a separate extension-history report.

Pending delegation details come from the current engagement. Signed delegation
details come from the saved approval snapshot; a direct approval never inherits an
obsolete pending delegation. Missing legacy names or timestamps remain blank.
Exemptions match both engagement and exact approval, retaining the original decision
after its workflow cycle is archived. Pending rows never claim an approval or exemption.
Signatures are neither selected by the export query nor written into the CSV. No
Hospital medical comments are selected or exported.

## Validation and review

- 106 source tests passed, including seven approval-row scenarios and thirteen
  endpoint authorization/response scenarios. All existing dashboard export tests pass.
- TypeScript and targeted Biome checks passed. New standalone Approvals files pass
  anti-slop; spacing fixes in the shared service were limited to the new export function.
- Production build passed, including `/api/reports/approvals` and all existing report routes.
- Isolated PostgreSQL verification passed for 1,004 stakeholder rows and 1,002 scoped
  delegate rows over multiple 500-record batches. Verified pending assignments, signed
  history after reassignment, excluded unrequested/rejected/cancelled unsigned records,
  direct approval without stale delegation, immutable signed delegation, archived
  exemption history, signature exclusion, empty output and repeatability. All fixtures
  rolled back. Script: `temp/approvals-csv-integration.ts` (git-ignored). Its initial
  assertion incorrectly applied the signed-snapshot rule to a pending row; corrected
  to check signed rows before the successful rerun.
- Service uses stable 500-engagement batches in a read-only repeatable-read transaction.
  Existing UTF-8 BOM, quoting and formula protection apply to all exported cells.
- Manual review covers all new files, query scope, empty/legacy records, immutable
  delegation attribution, exemption ownership and CSV protection.
- Like existing exports, the complete CSV is buffered in memory. Database batching
  does not bound total CSV memory use. No libraries, schema changes, migrations,
  workflow mutations or unrelated refactoring were introduced.

CodeRabbit completed its tracked-diff review with one minor finding: it assumed the
approval join could return multiple approvals for one engagement. The schema already
declares `stakeholderApprovals.engagementId` unique; a separate read-only live database
metadata check verified that single-column unique constraint is present. The finding
does not apply, and the existing engagement sort is deterministic. Script:
`temp/approvals-constraint-check.ts` (git-ignored). New untracked files were covered by
manual review, tests, TypeScript, lint and the production build.

## Browser verification

- [ ] Stakeholder sees Export Approvals Report; Guest does not.
- [ ] Both Awaiting Approval and Approved download the same combined report even with
      search or a later page selected.
- [ ] Confirm approver, requested/approved dates, current stage/departure and exemption
      reasons/authorisation agree with saved records.
- [ ] A delegate sees only their pending assignments and their own signed history;
      another stakeholder's approvals never appear in the delegate CSV.
- [ ] Signed delegation details match the original approval after the live assignment
      changes. Direct approvals contain no superseded delegation details.
- [ ] Check Excel readability, Unicode, multiline reasons and leading-zero IDs.
- [ ] User verifies Stakeholder Approvals export; no further dashboards are scheduled.
