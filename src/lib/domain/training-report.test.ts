import assert from "node:assert/strict";
import { test } from "node:test";
import {
  TRAINING_REPORT_HEADERS,
  type TrainingReportCycle,
  trainingReportRows,
} from "./training-report";
import type { WorkflowExemptionReportRecord } from "./workflow-exemption-report";

const cycle: TrainingReportCycle = {
  id: "cycle-1",
  engagementId: "engagement-1",
  cycleNumber: 1,
  name: "Kojo Mensah",
  passport: "001234",
  purpose: "Work",
  workflowState: "AtSecurity",
};
const completedAt = new Date("2026-11-03T10:00:00Z");
const induction = {
  workflowCycleId: cycle.id,
  generalSiteInduction: true,
  otherInductions: false,
  completedAt,
};
const audit = {
  workflowCycleId: cycle.id,
  engagementId: cycle.engagementId,
  completedBy: "Trainer One",
  performedAt: completedAt,
  fromState: "AtTraining",
  toState: "AtSecurity",
  comments: "Induction completed",
};

test("completed training and current workflow stage remain distinct", () => {
  const [row] = trainingReportRows(
    [cycle],
    [induction],
    [audit],
    [{ workflowCycleId: cycle.id, engagementId: cycle.engagementId }],
  );

  assert.equal(row.length, TRAINING_REPORT_HEADERS.length);
  assert.deepEqual(row.slice(3, 14), [
    "Completed",
    "Security",
    "Yes",
    "No",
    completedAt.toISOString(),
    "Trainer One",
    completedAt.toISOString(),
    "Training",
    "Security",
    "Induction completed",
    "Yes",
  ]);
});

test("awaiting cycle does not inherit an earlier cycle's induction, audit or document", () => {
  const nextCycle = {
    ...cycle,
    id: "cycle-2",
    cycleNumber: 2,
    workflowState: "AtTraining",
  };
  const rows = trainingReportRows(
    [cycle, nextCycle],
    [induction],
    [audit],
    [{ workflowCycleId: cycle.id, engagementId: cycle.engagementId }],
  );

  assert.equal(rows.length, 2);
  assert.deepEqual(rows[1].slice(3, 14), [
    "Awaiting",
    "Training",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "No",
  ]);
});

test("missing or mismatched historical audits stay blank", () => {
  const [row] = trainingReportRows(
    [cycle],
    [induction],
    [{ ...audit, engagementId: "another-engagement" }],
    [{ workflowCycleId: cycle.id, engagementId: "another-engagement" }],
  );

  assert.equal(row[3], "Completed");
  assert.deepEqual(row.slice(8, 13), ["", "", "", "", ""]);
  assert.equal(row[13], "No");
});

test("multiple historical records still produce one row per cycle using newest-first results", () => {
  const [row, ...extra] = trainingReportRows(
    [cycle],
    [induction, { ...induction, completedAt: new Date("2026-10-01") }],
    [audit, { ...audit, completedBy: "Older Trainer" }],
    [],
  );

  assert.equal(extra.length, 0);
  assert.equal(row[7], completedAt.toISOString());
  assert.equal(row[8], "Trainer One");
});

test("empty training report has no data rows", () => {
  assert.deepEqual(trainingReportRows([], [], [], []), []);
});

const trainingExemption: WorkflowExemptionReportRecord = {
  engagementId: cycle.engagementId,
  workflowCycleId: cycle.id,
  stage: "Training",
  reason: "Existing induction verified",
  approverName: "Stakeholder One",
  approverRole: "GMM",
  approvedAt: completedAt,
  archivedAt: null,
};

test("exempted Training is explicit without fabricated induction completion or clearance", () => {
  const [row] = trainingReportRows(
    [cycle],
    [induction],
    [audit],
    [],
    [trainingExemption],
  );
  assert.equal(row.length, TRAINING_REPORT_HEADERS.length);
  assert.equal(row[3], "Exempted");
  assert.deepEqual(row.slice(5, 13), Array(8).fill(""));
  assert.equal(row[13], "Not required");
  assert.deepEqual(row.slice(14), [
    "Training School",
    "Training School: Existing induction verified",
    "Stakeholder One (GMM)",
    completedAt.toISOString(),
  ]);
});

test("exemption reporting matches both the cycle and engagement, including historical cycles", () => {
  const nextCycle = { ...cycle, id: "cycle-2", cycleNumber: 2 };
  const rows = trainingReportRows(
    [cycle, nextCycle],
    [],
    [],
    [],
    [
      { ...trainingExemption, archivedAt: new Date() },
      {
        ...trainingExemption,
        workflowCycleId: nextCycle.id,
        engagementId: "wrong-engagement",
      },
    ],
  );
  assert.equal(rows[0][3], "Exempted");
  assert.equal(rows[1][3], "Awaiting");
  assert.deepEqual(rows[1].slice(14), ["", "", "", ""]);
});

test("Hospital-only exemption keeps actual Training completion and includes its authorisation", () => {
  const [row] = trainingReportRows(
    [cycle],
    [induction],
    [audit],
    [],
    [{ ...trainingExemption, stage: "Hospital" }],
  );
  assert.equal(row[3], "Completed");
  assert.equal(row[8], "Trainer One");
  assert.equal(row[14], "Hospital");
});
