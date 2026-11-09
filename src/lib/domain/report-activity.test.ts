import assert from "node:assert/strict";
import { test } from "node:test";

import { previousReportPeriod, withReportActivity } from "./report-activity";
import { workflowAiReportData } from "./workflow-ai-report";

const period = { start: "2026-11-01", end: "2026-11-08" };

const generatedAt = new Date("2026-11-08T12:00:00Z");

const activity = {
  completed: 12,
  medianHours: 30.5,
  rejected: 2,
  waiting: 5,
  waitingOver3Days: 3,
  waitingOver7Days: 1,
};

const idle = {
  completed: 0,
  medianHours: null,
  rejected: 0,
  waiting: 5,
  waitingOver3Days: 3,
  waitingOver7Days: 1,
};

test("the previous period has the same length and ends the day before", () => {
  assert.deepEqual(previousReportPeriod(period), {
    start: "2026-10-24",
    end: "2026-10-31",
  });
  assert.deepEqual(
    previousReportPeriod({ start: "2026-03-01", end: "2026-03-01" }),
    { start: "2026-02-28", end: "2026-02-28" },
  );
});

test("activity adds period and queue metrics, and rejections only where they exist", () => {
  const approvals = withReportActivity(
    workflowAiReportData("Approvals", period, [], generatedAt),
    activity,
    null,
  );

  const hospital = withReportActivity(
    workflowAiReportData("Hospital", period, [], generatedAt),
    { ...activity, rejected: null },
    null,
  );

  const groups = (names: { group?: string }[]) =>
    names.map((metric) => metric.group);

  assert.equal(
    groups(approvals.metrics).filter((group) => group === "Period activity")
      .length,
    3,
  );
  assert.equal(
    groups(hospital.metrics).filter((group) => group === "Period activity")
      .length,
    2,
  );
  assert.equal(
    groups(hospital.metrics).filter((group) => group === "Current queue")
      .length,
    3,
  );
  assert.equal(
    hospital.metrics.find((metric) => metric.unit === "hours")?.value,
    30.5,
  );
  assert.equal(approvals.totalRecords, 0);
});

test("the comparison holds only the total and period activity", () => {
  const data = withReportActivity(
    workflowAiReportData("Training", period, [], generatedAt),
    { ...activity, rejected: null },
    { totalRecords: 4, activity: { ...activity, rejected: null } },
  );

  assert.deepEqual(data.comparison?.period, {
    start: "2026-10-24",
    end: "2026-10-31",
  });
  assert.equal(data.comparison?.totalRecords, 4);
  assert.equal(
    data.comparison?.metrics.every(
      (metric) => metric.group === "Period activity",
    ),
    true,
  );
});

test("an empty previous period gives no comparison", () => {
  const data = withReportActivity(
    workflowAiReportData("Security", period, [], generatedAt),
    { ...activity, rejected: null },
    { totalRecords: 0, activity: { ...idle, rejected: null } },
  );

  assert.equal(data.comparison, null);
  assert.equal(
    data.dataLimitations.includes(
      "No previous-period data is available for comparison.",
    ),
    true,
  );
});
