import assert from "node:assert/strict";
import { test } from "node:test";
import {
  SECURITY_REPORT_HEADERS,
  type SecurityReportEngagement,
  securityReportRows,
} from "./security-report";
import type { WorkflowExemptionReportRecord } from "./workflow-exemption-report";

const engagement: SecurityReportEngagement = {
  id: "engagement-1",
  name: "Kojo Mensah",
  passport: "001234",
  company: "Example Ltd",
  purpose: "Work",
  arrival: "2026-11-01",
  departure: "2099-11-30",
  workflowState: "AtSecurity",
  accessState: "Pending",
};
const card = {
  engagementId: engagement.id,
  workflowCycleId: "cycle-1",
  idType: "Visitor",
  accessCardNumber: "00123",
  accessCardExpiry: "2099-11-30",
  activatedAt: new Date("2026-11-04T10:00:00Z"),
};
const audit = {
  engagementId: engagement.id,
  workflowCycleId: card.workflowCycleId,
  performedBy: "Security Officer",
  comments: "All requirements checked",
};
const revocation = {
  engagementId: engagement.id,
  requestedAt: new Date("2026-11-05T10:00:00Z"),
  requestedBy: "Reception Officer",
  reason: "Visit ended early",
  status: "Pending",
  decidedAt: null,
  decidedBy: "",
};

function values(row: string[]): Record<string, string> {
  assert.equal(row.length, SECURITY_REPORT_HEADERS.length);
  return Object.fromEntries(
    SECURITY_REPORT_HEADERS.map((header, index) => [header, row[index]]),
  );
}

test("combined report includes awaiting, active, expired, and revocation-requested records once each", () => {
  const records = [
    engagement,
    {
      ...engagement,
      id: "active",
      workflowState: "Completed",
      accessState: "Active",
    },
    {
      ...engagement,
      id: "expired",
      workflowState: "Completed",
      accessState: "Active",
    },
    {
      ...engagement,
      id: "revocation",
      workflowState: "Completed",
      accessState: "TerminationRequested",
    },
  ];
  const rows = securityReportRows(
    records,
    [
      { ...card, engagementId: "active" },
      { ...card, engagementId: "expired", accessCardExpiry: "2000-01-01" },
      { ...card, engagementId: "revocation", accessCardExpiry: "2000-01-01" },
    ],
    [],
    [],
  );
  assert.equal(rows.length, 4);
  const data = rows.map(values);
  assert.deepEqual(
    data.map((row) => row["Access Status"]),
    ["Pending", "Active", "Expired", "Revocation Requested"],
  );
  assert.equal(data[0]["Security Status"], "Awaiting Review");
  assert.equal(data[0]["Card Number"], "");
  assert.equal(data[1]["Card Number"], "00123");
  assert.equal(data[3]["Security Status"], "Revocation Requested");
});

test("latest card uses its own cycle's activation audit and excludes earlier revocations", () => {
  const latest = {
    ...card,
    workflowCycleId: "cycle-2",
    activatedAt: new Date("2026-11-06T10:00:00Z"),
  };
  const [row] = securityReportRows(
    [engagement],
    [latest, card],
    [audit],
    [revocation],
  );
  const data = values(row);
  assert.equal(data["Activated At (UTC)"], latest.activatedAt.toISOString());
  assert.equal(data["Activated By"], "");
  assert.equal(data["Activation Comments"], "");
  assert.equal(data["Revocation Reason"], "");
});

test("revoked access retains activation and revocation accountability", () => {
  const decidedAt = new Date("2026-11-05T12:00:00Z");
  const [row] = securityReportRows(
    [{ ...engagement, workflowState: "Completed", accessState: "Terminated" }],
    [card],
    [audit],
    [
      {
        ...revocation,
        status: "Revoked",
        decidedAt,
        decidedBy: "Security Two",
      },
    ],
  );
  const data = values(row);
  assert.equal(data["Access Status"], "Revoked");
  assert.equal(data["Activated By"], audit.performedBy);
  assert.equal(data["Activation Comments"], audit.comments);
  assert.equal(data["Revocation Requested By"], revocation.requestedBy);
  assert.equal(data["Revocation Reason"], revocation.reason);
  assert.equal(data["Revoked At (UTC)"], decidedAt.toISOString());
  assert.equal(data["Revoked By"], "Security Two");
});

test("pending revocation never appears as completed revocation", () => {
  const [row] = securityReportRows([engagement], [card], [], [revocation]);
  const data = values(row);
  assert.equal(data["Revocation Reason"], revocation.reason);
  assert.equal(data["Revoked At (UTC)"], "");
  assert.equal(data["Revoked By"], "");
});

test("empty security data produces no invented rows", () => {
  assert.deepEqual(securityReportRows([], [], [], []), []);
});

const exemption: WorkflowExemptionReportRecord = {
  engagementId: engagement.id,
  workflowCycleId: card.workflowCycleId,
  stage: "Hospital",
  reason: "Verified medical",
  approverName: "Stakeholder One",
  approverRole: "CSO",
  approvedAt: card.activatedAt,
  archivedAt: null,
};

test("awaiting Security reports active exemptions with their reason and approver", () => {
  const [row] = securityReportRows([engagement], [], [], [], [exemption]);
  const data = values(row);
  assert.equal(data["Exempted Stages"], "Hospital");
  assert.equal(
    data["Exemption Reason / Comment"],
    "Hospital: Verified medical",
  );
  assert.equal(data["Exemption Approved By"], "Stakeholder One (CSO)");
  assert.equal(data["Card Number"], "");
});

test("Security excludes other engagements and archived exemptions from an awaiting cycle", () => {
  const [row] = securityReportRows(
    [engagement],
    [],
    [],
    [],
    [
      { ...exemption, archivedAt: new Date() },
      { ...exemption, engagementId: "wrong-engagement" },
    ],
  );
  assert.equal(values(row)["Exempted Stages"], "");
});

test("issued-card report uses its own cycle's exemptions, including archived history", () => {
  const [row] = securityReportRows(
    [{ ...engagement, workflowState: "Completed", accessState: "Active" }],
    [card],
    [],
    [],
    [
      { ...exemption, workflowCycleId: "wrong-cycle", stage: "Training" },
      { ...exemption, archivedAt: new Date() },
    ],
  );
  assert.equal(values(row)["Exempted Stages"], "Hospital");
});
