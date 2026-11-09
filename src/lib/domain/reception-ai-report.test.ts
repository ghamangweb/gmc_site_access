import assert from "node:assert/strict";
import { test } from "node:test";

import { aiReportDataSchema } from "./ai-report";
import {
  receptionAiReportData,
  receptionReportBounds,
} from "./reception-ai-report";
import { RECEPTION_REPORT_HEADERS } from "./reception-report";

const period = { start: "2026-11-01", end: "2026-11-08" };

const generatedAt = new Date("2026-11-08T12:00:00.000Z");

test("date range includes both selected days in UTC and excludes the following midnight", () => {
  const bounds = receptionReportBounds(period);

  assert.equal(bounds.start.toISOString(), "2026-11-01T00:00:00.000Z");
  assert.equal(bounds.endExclusive.toISOString(), "2026-11-09T00:00:00.000Z");

  const singleDay = receptionReportBounds({
    start: "2026-11-08",
    end: "2026-11-08",
  });

  assert.equal(
    singleDay.endExclusive.getTime() - singleDay.start.getTime(),
    86_400_000,
  );
});

test("date boundaries handle leap days and year changes without local-time conversion", () => {
  assert.equal(
    receptionReportBounds({
      start: "2028-02-29",
      end: "2028-02-29",
    }).endExclusive.toISOString(),
    "2028-03-01T00:00:00.000Z",
  );
  assert.equal(
    receptionReportBounds({
      start: "2026-12-31",
      end: "2026-12-31",
    }).endExclusive.toISOString(),
    "2027-01-01T00:00:00.000Z",
  );
});

test("invalid calendar dates and reversed ranges are rejected before querying", () => {
  assert.throws(() =>
    receptionReportBounds({ start: "2026-02-29", end: "2026-03-01" }),
  );
  assert.throws(() =>
    receptionReportBounds({ start: "2026-11-09", end: "2026-11-01" }),
  );
});

test("Reception wrapper includes submissions while keeping counts non-identifying", () => {
  const rows = [
    RECEPTION_REPORT_HEADERS.map((header) =>
      header === "Submission Status" ? "Approved — Awaiting Conversion" : "",
    ),
    RECEPTION_REPORT_HEADERS.map((header) =>
      header === "Current Workflow Stage" ? "Reception" : "",
    ),
  ];

  const report = receptionAiReportData(period, rows, generatedAt);

  assert.equal(report.totalRecords, 2);
  assert.equal(
    report.metrics.find((metric) => metric.name === "Engagements")?.value,
    1,
  );
  assert.equal(
    report.metrics.find(
      (metric) => metric.name === "Submission: Approved — Awaiting Conversion",
    )?.value,
    1,
  );
  assert.equal(aiReportDataSchema.safeParse(report).success, true);
  assert.equal(report.comparison, null);
});
