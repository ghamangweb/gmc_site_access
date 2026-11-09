import assert from "node:assert/strict";
import { test } from "node:test";

import {
  type AiReportData,
  type AiReportWorkflow,
  aiReportDataSchema,
} from "./ai-report";
import {
  WORKFLOW_REPORT_DEFINITIONS,
  workflowAiReportData,
} from "./workflow-ai-report";

const period = { start: "2026-11-01", end: "2026-11-08" };

const generatedAt = new Date("2026-11-08T12:00:00Z");

function row(workflow: AiReportWorkflow, fields: [string, string][]): string[] {
  const values = new Map(fields);

  return WORKFLOW_REPORT_DEFINITIONS[workflow].headers.map(
    (header) => values.get(header) ?? "PRIVATE",
  );
}

function value(report: AiReportData, name: string): number | null | undefined {
  return report.metrics.find((metric) => metric.name === name)?.value;
}

test("Reception covers unconverted submissions, engagements and standing rejections", () => {
  const report = workflowAiReportData(
    "Reception",
    period,
    [
      row("Reception", [
        ["Submission Status", "Approved — Awaiting Conversion"],
        ["Current Workflow Stage", ""],
        ["Rejected At (UTC)", ""],
      ]),
      row("Reception", [
        ["Submission Status", "Converted"],
        ["Current Workflow Stage", "Reception"],
        ["Rejected At (UTC)", "12:00:00"],
      ]),
      row("Reception", [
        ["Submission Status", ""],
        ["Current Workflow Stage", "Completed"],
        ["Rejected At (UTC)", ""],
      ]),
    ],
    generatedAt,
  );

  assert.equal(report.totalRecords, 3);
  assert.equal(value(report, "Submitted Registrations"), 2);
  assert.equal(value(report, "Engagements"), 2);
  assert.equal(value(report, "Rejected"), 1);
  assert.equal(value(report, "Submission: Approved — Awaiting Conversion"), 1);
  assert.equal(JSON.stringify(report).includes("PRIVATE"), false);
});

test("Hospital counts recorded decisions/reviews as entries and distinguishes overdue reviews", () => {
  const report = workflowAiReportData(
    "Hospital",
    period,
    [
      row("Hospital", [
        ["Hospital Status", "Awaiting Re-clearance"],
        ["Clearance Outcome", "Unfit"],
        ["Review Status", ""],
      ]),
      row("Hospital", [
        ["Hospital Status", "Awaiting Review"],
        ["Clearance Outcome", "Fit with Conditions"],
        ["Review Status", "Overdue"],
      ]),
      row("Hospital", [
        ["Hospital Status", "Recorded"],
        ["Clearance Outcome", "Fit"],
        ["Review Status", ""],
      ]),
    ],
    generatedAt,
  );

  assert.equal(report.totalRecords, 3);
  assert.equal(value(report, "Awaiting Clearance"), 1);
  assert.equal(value(report, "Recorded Clearances"), 3);
  assert.equal(value(report, "Review: Overdue"), 1);
  assert.equal(value(report, "Outcome: Unfit"), 1);
  assert.match(report.dataLimitations[0], /not unique visitors/);
  assert.equal(JSON.stringify(report).includes("PRIVATE"), false);
});

test("Training separates awaiting, completed and exempted workflow cycles", () => {
  const report = workflowAiReportData(
    "Training",
    period,
    [
      row("Training", [["Training Status", "Awaiting"]]),
      row("Training", [["Training Status", "Completed"]]),
      row("Training", [["Training Status", "Exempted"]]),
    ],
    generatedAt,
  );

  assert.equal(report.totalRecords, 3);
  assert.equal(value(report, "Awaiting Induction"), 1);
  assert.equal(value(report, "Recorded Inductions"), 1);
  assert.equal(value(report, "Induction: Exempted"), 1);
  assert.equal(
    report.metrics.every((metric) => metric.unit === "workflow cycles"),
    true,
  );
});

test("Security issued-card totals include expired and revocation-requested cards without claiming active access", () => {
  const report = workflowAiReportData(
    "Security",
    period,
    [
      row("Security", [
        ["Security Status", "Access Issued"],
        ["Card Number", "PRIVATE-CARD"],
        ["Access Status", "Expired"],
      ]),
      row("Security", [
        ["Security Status", "Revocation Requested"],
        ["Card Number", "PRIVATE-CARD"],
        ["Access Status", "Revocation Requested"],
      ]),
      row("Security", [
        ["Security Status", "Awaiting Review"],
        ["Card Number", ""],
        ["Access Status", "Pending"],
      ]),
    ],
    generatedAt,
  );

  assert.equal(value(report, "Site Access Granted"), 2);
  assert.equal(value(report, "Revocations"), 1);
  assert.equal(value(report, "Access: Expired"), 1);
  assert.equal(value(report, "Access: Active"), 0);
  assert.equal(JSON.stringify(report).includes("PRIVATE"), false);
});

test("Approvals separates pending, approved and delegated records", () => {
  const report = workflowAiReportData(
    "Approvals",
    period,
    [
      row("Approvals", [
        ["Approval Status", "Awaiting Approval"],
        ["Delegated Approval", "Yes"],
      ]),
      row("Approvals", [
        ["Approval Status", "Approved"],
        ["Delegated Approval", "No"],
      ]),
    ],
    generatedAt,
  );

  assert.equal(value(report, "Awaiting Approval"), 1);
  assert.equal(value(report, "Approved"), 1);
  assert.equal(value(report, "Delegated approval: Yes"), 1);
  assert.equal(JSON.stringify(report).includes("PRIVATE"), false);
});

for (const workflow of aiReportDataSchema.shape.workflow.options) {
  test(`${workflow} empty periods retain zero metrics and reject malformed export columns`, () => {
    const report = workflowAiReportData(workflow, period, [], generatedAt);

    assert.equal(report.totalRecords, 0);
    assert.equal(
      report.metrics.every((metric) => metric.value === 0),
      true,
    );
    assert.equal(aiReportDataSchema.safeParse(report).success, true);
    assert.throws(() =>
      workflowAiReportData(workflow, period, [["bad columns"]], generatedAt),
    );
  });
}
