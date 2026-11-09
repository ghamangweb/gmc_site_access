import assert from "node:assert/strict";
import { test } from "node:test";

import {
  type AiReportData,
  aiReportDataSchema,
  aiReportResponseSchema,
  parseAiReport,
} from "./ai-report";

const data: AiReportData = {
  workflow: "Reception",
  period: { start: "2026-11-01", end: "2026-11-08" },
  generatedAt: "2026-11-08T12:00:00Z",
  recordScope: "Records created during the selected period",
  statusBasis: "Current status at generation",
  totalRecords: 0,
  metrics: [
    {
      name: "Pending",
      definition: "Awaiting approval",
      value: 0,
      unit: "records",
    },
  ],
  comparison: null,
  dataLimitations: ["No previous-period statistics supplied."],
};

const report = {
  executiveSummary: "No matching records were found.",
  keyFindings: [],
  workloadAnalysis: "No workload conclusions can be drawn.",
  recommendedActions: [],
};

test("accepts empty-period reports without forcing findings or actions", () => {
  assert.deepEqual(parseAiReport(JSON.stringify(report)), report);
  assert.equal(aiReportDataSchema.safeParse(data).success, true);
});

test("formal report output omits limitations and permits omitting repetitive workload analysis", () => {
  assert.deepEqual(
    parseAiReport(JSON.stringify({ ...report, workloadAnalysis: "" })),
    { ...report, workloadAnalysis: "" },
  );
  assert.throws(() =>
    parseAiReport(
      JSON.stringify({
        ...report,
        dataLimitations: ["Unnecessary commentary"],
      }),
    ),
  );
});

test("rejects unexpected input fields instead of forwarding raw records", () => {
  assert.equal(
    aiReportDataSchema.safeParse({
      ...data,
      visitors: [{ passportNo: "private" }],
    }).success,
    false,
  );
  assert.equal(
    aiReportDataSchema.safeParse({
      ...data,
      metrics: [{ ...data.metrics[0], visitorName: "private" }],
    }).success,
    false,
  );
});

test("rejects invalid reporting dates and counts while allowing unknown metrics", () => {
  assert.equal(
    aiReportDataSchema.safeParse({
      ...data,
      period: { start: "2026-11-08", end: "2026-11-01" },
    }).success,
    false,
  );
  assert.equal(
    aiReportDataSchema.safeParse({
      ...data,
      period: { start: "2026-02-30", end: "2026-11-08" },
    }).success,
    false,
  );
  assert.equal(
    aiReportDataSchema.safeParse({ ...data, totalRecords: -1 }).success,
    false,
  );
  assert.equal(
    aiReportDataSchema.safeParse({
      ...data,
      metrics: [{ ...data.metrics[0], value: null }],
    }).success,
    true,
  );
});

test("rejects malformed, incomplete and oversized generated reports", () => {
  assert.throws(() => parseAiReport("This is not JSON"));
  assert.throws(() =>
    parseAiReport(JSON.stringify({ executiveSummary: "Incomplete" })),
  );
  assert.throws(() =>
    parseAiReport(JSON.stringify({ ...report, executiveSummary: " " })),
  );
  assert.throws(() =>
    parseAiReport(
      JSON.stringify({ ...report, keyFindings: Array(6).fill("Finding") }),
    ),
  );
  assert.throws(() =>
    parseAiReport(
      JSON.stringify({ ...report, executiveSummary: "word ".repeat(650) }),
    ),
  );
});

test("client response validation accepts complete reports and safe server errors", () => {
  assert.equal(
    aiReportResponseSchema.safeParse({
      success: true,
      data: { statistics: data, report },
    }).success,
    true,
  );
  assert.equal(
    aiReportResponseSchema.safeParse({
      success: false,
      error: "Not authorized",
    }).success,
    true,
  );
});

test("client response validation rejects missing statistics and malformed success responses", () => {
  for (const response of [
    { success: true },
    { success: true, data: { report } },
    { success: "true", data: { statistics: data, report } },
    {
      success: true,
      data: { statistics: { ...data, totalRecords: -1 }, report },
    },
  ]) {
    assert.equal(aiReportResponseSchema.safeParse(response).success, false);
  }
});
