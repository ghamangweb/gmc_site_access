import assert from "node:assert/strict";
import { test } from "node:test";
import {
  TRAINING_REPORT_HEADERS,
  type TrainingReportCycle,
  trainingReportRows,
} from "./training-report";

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
  assert.deepEqual(row.slice(3), [
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
  assert.deepEqual(rows[1].slice(3), [
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
