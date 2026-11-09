import assert from "node:assert/strict";
import { test } from "node:test";

import { withReportActivity } from "./report-activity";
import {
  reportDocument,
  reportFileName,
  reportStatisticGroups,
} from "./report-document";
import {
  WORKFLOW_REPORT_DEFINITIONS,
  workflowAiReportData,
} from "./workflow-ai-report";

const period = { start: "2026-11-01", end: "2026-11-08" };

const generatedAt = new Date("2026-11-08T12:00:00Z");

const activity = {
  completed: 6,
  medianHours: 12.25,
  rejected: null,
  waiting: 2,
  waitingOver3Days: 1,
  waitingOver7Days: 0,
};

function trainingRows(statuses: string[]): string[][] {
  const headers = WORKFLOW_REPORT_DEFINITIONS.Training.headers;

  return statuses.map((status) =>
    headers.map((header) => (header === "Training Status" ? status : "")),
  );
}

const statistics = withReportActivity(
  workflowAiReportData(
    "Training",
    period,
    trainingRows(["Awaiting", "Completed", "Completed", "Exempted"]),
    generatedAt,
  ),
  activity,
  { totalRecords: 3, activity: { ...activity, medianHours: null } },
);

test("statistics are grouped in a fixed order with shares only for the creation cohort", () => {
  const groups = reportStatisticGroups(statistics);

  assert.deepEqual(
    groups.map((group) => group.title),
    ["Dashboard tabs", "Current status", "Period activity", "Current queue"],
  );
  assert.equal(groups[0].showShare, true);
  assert.equal(groups[2].showShare, false);
  assert.equal(groups[3].showShare, false);
  assert.equal(
    groups[1].rows.find((row) => row.name === "Induction: Exempted")?.share,
    "25%",
  );
});

test("only period activity carries previous-period values", () => {
  const groups = reportStatisticGroups(statistics);
  const activityRows = groups[2].rows;

  assert.equal(groups[0].showPrevious, false);
  assert.equal(groups[2].showPrevious, true);
  assert.equal(activityRows[0].previous, "6");
  assert.equal(activityRows[1].value, "12.3 hours");
  assert.equal(activityRows[1].previous, "Not available");
});

test("the document carries the previous total and a dated file name", () => {
  const content = reportDocument({
    statistics,
    report: {
      executiveSummary: "Summary.",
      keyFindings: ["Finding.", "Finding."],
      workloadAnalysis: "",
      recommendedActions: [],
    },
  });

  assert.equal(content.title, "Training School Report");
  assert.equal(content.total, "4");
  assert.equal(content.previousTotal, "3");
  assert.equal(content.previousPeriod, "24 Oct 2026 to 31 Oct 2026");
  assert.deepEqual(content.findings, ["Finding."]);
  assert.equal(
    reportFileName(statistics, "pdf"),
    "training-report-2026-11-01-to-2026-11-08.pdf",
  );
});
