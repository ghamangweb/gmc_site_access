import assert from "node:assert/strict";
import { test } from "node:test";
import { csvRow } from "@/lib/csv";
import {
  RECEPTION_REPORT_HEADERS,
  type ReceptionReportRecord,
  receptionReportRows,
} from "./reception-report";
import type { WorkflowExemptionReportRecord } from "./workflow-exemption-report";

const record: ReceptionReportRecord = {
  engagementId: "engagement-1",
  name: "Akosua Mensah",
  passport: "001234",
  registrationType: "Local",
  company: "Example Ltd",
  department: "Mining",
  purpose: "WorkMine",
  arrival: "2026-11-05",
  departure: "2099-12-31",
  submissionStatus: "Converted",
  submittedAt: new Date("2026-11-01T09:00:00Z"),
  workflowState: "AtReception",
  accessState: "Pending",
  cardExpiry: null,
  rejectedBy: "Approver (CSO)",
  rejectionReason: "Please correct the dates",
  rejectedAt: new Date("2026-11-03T10:00:00Z"),
};

function values(row: string[]): Record<string, string> {
  assert.equal(row.length, RECEPTION_REPORT_HEADERS.length);

  return Object.fromEntries(
    RECEPTION_REPORT_HEADERS.map((header, index) => [header, row[index]]),
  );
}

test("Reception rows preserve identity, submission dates, rejection details and readable stages", () => {
  const row = values(receptionReportRows([record])[0]);
  assert.equal(row["Passport/ID Number"], "001234");
  assert.equal(row["Current Workflow Stage"], "Reception");
  assert.equal(row["Submitted At (UTC)"], "2026-11-01T09:00:00.000Z");
  assert.equal(row["Rejected By"], "Approver (CSO)");
  assert.equal(row["Rejection Reason"], record.rejectionReason);
  assert.equal(row["Rejected At (UTC)"], "2026-11-03T10:00:00.000Z");
});

test("outstanding submissions have no fabricated workflow or access status", () => {
  const row = values(
    receptionReportRows([
      {
        ...record,
        engagementId: null,
        submissionStatus: "Approved — Awaiting Conversion",
        workflowState: "",
        accessState: "",
        rejectedBy: "",
        rejectionReason: "",
        rejectedAt: null,
      },
    ])[0],
  );

  assert.equal(row["Submission Status"], "Approved — Awaiting Conversion");
  assert.equal(row["Current Workflow Stage"], "");
  assert.equal(row["Access Status"], "");
  assert.equal(row["Rejected At (UTC)"], "");
});

test("only this engagement's unarchived exemptions appear in its summary", () => {
  const exemption: WorkflowExemptionReportRecord = {
    engagementId: record.engagementId ?? "",
    workflowCycleId: "cycle-2",
    stage: "Training",
    reason: "Existing certification",
    approverName: "Authoriser",
    approverRole: "CSO",
    approvedAt: new Date("2026-11-04T09:00:00Z"),
    archivedAt: null,
  };

  const row = values(
    receptionReportRows(
      [record],
      [
        exemption,
        {
          ...exemption,
          engagementId: "another-engagement",
          reason: "Other visitor",
        },
        {
          ...exemption,
          workflowCycleId: "cycle-1",
          reason: "Old reason",
          archivedAt: new Date(),
        },
      ],
    )[0],
  );

  assert.equal(row["Exempted Stages"], "Training School");
  assert.equal(
    row["Exemption Reason / Comment"],
    "Training School: Existing certification",
  );
  assert.equal(row["Exemption Approved By"], "Authoriser (CSO)");
});

test("expired cards are computed without overriding revoked access", () => {
  const rows = receptionReportRows([
    { ...record, accessState: "Active", cardExpiry: "2000-01-01" },
    { ...record, accessState: "Terminated", cardExpiry: "2000-01-01" },
  ]).map(values);

  assert.equal(rows[0]["Access Status"], "Expired");
  assert.equal(rows[1]["Access Status"], "Revoked");
});

test("export cells protect formulas and preserve quotes and multiline reasons", () => {
  const row = receptionReportRows([
    {
      ...record,
      company: '=HYPERLINK("https://example.test")',
      rejectionReason: 'First line, "quoted"\nSecond line',
    },
  ])[0];

  const csv = csvRow(row);
  assert.ok(csv.includes('"\'=HYPERLINK(""https://example.test"")"'));
  assert.ok(csv.includes('"First line, ""quoted""\nSecond line"'));
  assert.deepEqual(receptionReportRows([]), []);
});
