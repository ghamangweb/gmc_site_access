import assert from "node:assert/strict";
import { test } from "node:test";
import { csvRow } from "@/lib/csv";
import {
  APPROVALS_REPORT_HEADERS,
  type ApprovalsReportExemption,
  type ApprovalsReportRecord,
  approvalsReportRows,
} from "./approvals-report";

const record: ApprovalsReportRecord = {
  engagementId: "engagement-1",
  name: "Akosua Mensah",
  passport: "001234",
  company: "Example Ltd",
  purpose: "WorkMine",
  arrival: "2026-11-01",
  departure: "2026-12-31",
  workflowState: "AtSecurity",
  requestedAt: new Date("2026-11-01T09:00:00Z"),
  approvalId: "approval-1",
  approvedBy: "Approver",
  approverRole: "CSO",
  approvedAt: new Date("2026-11-02T10:00:00Z"),
  isDelegated: false,
  delegatedTo: "",
  delegatedBy: "",
  delegatedAt: null,
  delegationReason: "",
};

const exemption: ApprovalsReportExemption = {
  engagementId: record.engagementId,
  stakeholderApprovalId: "approval-1",
  workflowCycleId: "cycle-1",
  stage: "Hospital",
  reason: "Evidence accepted",
  approverName: "Approver",
  approverRole: "CSO",
  approvedAt: new Date("2026-11-02T10:00:00Z"),
  archivedAt: null,
};

function values(row: string[]): Record<string, string> {
  assert.equal(row.length, APPROVALS_REPORT_HEADERS.length);

  return Object.fromEntries(
    APPROVALS_REPORT_HEADERS.map((header, index) => [header, row[index]]),
  );
}

test("approved decision remains distinct from current stage and preserves UTC attribution", () => {
  const row = values(approvalsReportRows([record])[0]);
  assert.equal(row["Approval Status"], "Approved");
  assert.equal(row["Current Workflow Stage"], "Security");
  assert.equal(row["Passport/ID Number"], "001234");
  assert.equal(row["Approved By"], "Approver");
  assert.equal(row["Approver Role"], "CSO");
  assert.equal(row["Approved At (UTC)"], "2026-11-02T10:00:00.000Z");
});

test("pending approval never invents an approver, decision date or exemptions", () => {
  const row = values(
    approvalsReportRows(
      [{ ...record, approvalId: null, workflowState: "AtReception" }],
      [exemption],
    )[0],
  );

  assert.equal(row["Approval Status"], "Awaiting Approval");
  assert.equal(row["Current Workflow Stage"], "Reception");

  for (const key of [
    "Approved By",
    "Approver Role",
    "Approved At (UTC)",
    "Exempted Stages",
  ])
    assert.equal(row[key], "");
});

test("delegation details describe both pending assignments and signed delegated approvals", () => {
  const delegated = {
    ...record,
    isDelegated: true,
    delegatedTo: "Delegate",
    delegatedBy: "Granting Stakeholder",
    delegatedAt: new Date("2026-11-01T11:00:00Z"),
    delegationReason: "Authorised cover",
  };

  for (const approvalId of [null, "approval-1"]) {
    const row = values(approvalsReportRows([{ ...delegated, approvalId }])[0]);
    assert.equal(row["Delegated Approval"], "Yes");
    assert.equal(row["Delegated To"], "Delegate");
    assert.equal(row["Delegated By"], "Granting Stakeholder");
    assert.equal(row["Delegated At (UTC)"], "2026-11-01T11:00:00.000Z");
    assert.equal(row["Delegation Reason"], "Authorised cover");
  }
});

test("direct approval does not expose a superseded pending delegation", () => {
  const row = values(
    approvalsReportRows([
      {
        ...record,
        delegatedTo: "Old delegate",
        delegatedBy: "Old grantor",
        delegationReason: "Old reason",
      },
    ])[0],
  );

  assert.equal(row["Delegated Approval"], "No");
  assert.equal(row["Delegated To"], "");
  assert.equal(row["Delegation Reason"], "");
});

test("only exemptions linked to this exact approval and engagement are reported", () => {
  const row = values(
    approvalsReportRows(
      [record],
      [
        exemption,
        {
          ...exemption,
          stakeholderApprovalId: "another-approval",
          reason: "Other decision",
        },
        {
          ...exemption,
          engagementId: "another-engagement",
          reason: "Other visitor",
        },
      ],
    )[0],
  );

  assert.equal(row["Exempted Stages"], "Hospital");
  assert.equal(
    row["Exemption Reason / Comment"],
    "Hospital: Evidence accepted",
  );
});

test("archiving a workflow cycle preserves the original exemption approval history", () => {
  const row = values(
    approvalsReportRows(
      [record],
      [{ ...exemption, archivedAt: new Date("2026-11-04") }],
    )[0],
  );

  assert.equal(row["Exempted Stages"], "Hospital");
  assert.equal(row["Exemption Approved By"], "Approver (CSO)");
});

test("empty and legacy records preserve blanks and spreadsheet-safe text", () => {
  assert.deepEqual(approvalsReportRows([]), []);

  const row = approvalsReportRows([
    {
      ...record,
      requestedAt: null,
      approvedAt: null,
      company: '=Formula, "quoted"\nSecond line',
    },
  ])[0];

  assert.equal(values(row)["Approval Requested At (UTC)"], "");
  assert.equal(values(row)["Approved At (UTC)"], "");
  assert.ok(csvRow(row).includes('"\'=Formula, ""quoted""\nSecond line"'));
});
