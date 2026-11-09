import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { GeneratedAiReport } from "@/lib/domain/ai-report";
import { receptionAiReportData } from "@/lib/domain/reception-ai-report";
import { RECEPTION_REPORT_HEADERS } from "@/lib/domain/reception-report";
import { ReceptionReportPreview } from "./reception-report-preview";

const result: GeneratedAiReport = {
  statistics: receptionAiReportData(
    { start: "2026-11-01", end: "2026-11-08" },
    Array.from({ length: 3 }, () =>
      RECEPTION_REPORT_HEADERS.map((header) =>
        header === "Current Workflow Stage" ? "Reception" : "",
      ),
    ),
    new Date("2026-11-08T12:00:00.000Z"),
  ),
  report: {
    executiveSummary: "Three engagements remain at Reception.",
    keyFindings: ["Three engagements are at Reception."],
    workloadAnalysis: "The selected cohort is currently at Reception.",
    recommendedActions: [],
  },
};

test("preview displays the reporting period, authoritative totals and summary together", () => {
  const html = renderToStaticMarkup(
    createElement(ReceptionReportPreview, { result }),
  );

  assert.match(html, /01 Nov 2026/);
  assert.match(html, /08 Nov 2026/);
  assert.match(html, /2026-11-08T12:00:00.000Z/);
  assert.match(html, /Three engagements remain at Reception/);
  assert.match(html, /Total records:/);
  assert.equal(html.includes("Data limitations"), false);
  assert.equal(
    html.includes(
      "Converted submissions are represented by their engagement only",
    ),
    false,
  );
  assert.equal(html.includes("Recommended actions"), false);
});

test("generated HTML-like text is escaped in summaries, findings and actions", () => {
  const untrusted = "<script>alert('report')</script>";

  const html = renderToStaticMarkup(
    createElement(ReceptionReportPreview, {
      result: {
        ...result,
        report: {
          ...result.report,
          executiveSummary: untrusted,
          keyFindings: [untrusted],
          workloadAnalysis: untrusted,
          recommendedActions: [
            {
              observation: untrusted,
              action: untrusted,
              responsibleWorkflow: untrusted,
            },
          ],
        },
      },
    }),
  );

  assert.equal(html.includes("<script>"), false);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&lt;\/script&gt;/);
});

test("missing metrics remain unavailable rather than displaying as zero", () => {
  const html = renderToStaticMarkup(
    createElement(ReceptionReportPreview, {
      result: {
        ...result,
        statistics: {
          ...result.statistics,
          metrics: [
            {
              name: "Unknown metric",
              definition: "Not supplied",
              value: null,
              unit: "engagements",
            },
          ],
        },
      },
    }),
  );

  assert.match(html, /Unknown metric/);
  assert.match(html, /Not available/);
});
