import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  type AiReportWorkflow,
  aiReportDataSchema,
} from "@/lib/domain/ai-report";
import { workflowAiReportData } from "@/lib/domain/workflow-ai-report";
import { WorkflowReportPreview } from "./workflow-report-preview";

type ExpectedPresentation = {
  workflow: AiReportWorkflow;
  title: string;
  total: string;
  unit: string;
};

const presentations: ExpectedPresentation[] = [
  {
    workflow: "Reception",
    title: "Reception",
    total: "Total records",
    unit: "records",
  },
  {
    workflow: "Hospital",
    title: "Hospital",
    total: "Total report entries",
    unit: "report entries",
  },
  {
    workflow: "Training",
    title: "Training School",
    total: "Total workflow cycles",
    unit: "workflow cycles",
  },
  {
    workflow: "Security",
    title: "Security",
    total: "Total engagements",
    unit: "engagements",
  },
  {
    workflow: "Approvals",
    title: "Approvals",
    total: "Total approval records",
    unit: "approval records",
  },
];

for (const presentation of presentations) {
  test(`${presentation.workflow} preview identifies its workflow and counting units`, () => {
    const statistics = workflowAiReportData(
      presentation.workflow,
      { start: "2026-11-01", end: "2026-11-08" },
      [],
      new Date("2026-11-08T12:00:00Z"),
    );

    const html = renderToStaticMarkup(
      createElement(WorkflowReportPreview, {
        result: {
          statistics,
          report: {
            executiveSummary: "No matching records were found.",
            keyFindings: [],
            workloadAnalysis: "No workload conclusions can be drawn.",
            recommendedActions: [],
          },
        },
      }),
    );

    assert.match(html, new RegExp(`${presentation.title} Report`));
    assert.equal(html.includes(presentation.total), true);
    assert.equal(html.includes(presentation.unit), true);
    assert.equal(html.includes("No matching records were found."), true);
    assert.equal(html.includes("Data limitations"), false);
    assert.equal(html.includes("Metrics may overlap"), false);

    if (
      presentation.workflow === "Hospital" ||
      presentation.workflow === "Training"
    ) {
      assert.equal(html.includes("Total engagements"), false);
    }
  });
}

test("every supported backend workflow has a preview case", () => {
  assert.deepEqual(
    presentations.map((presentation) => presentation.workflow),
    aiReportDataSchema.shape.workflow.options,
  );
});

test("formal reports omit internal interpretation notes and empty sections", () => {
  const statistics = workflowAiReportData(
    "Hospital",
    { start: "2026-11-01", end: "2026-11-08" },
    [],
    new Date("2026-11-08T12:00:00Z"),
  );

  const html = renderToStaticMarkup(
    createElement(WorkflowReportPreview, {
      result: {
        statistics: {
          ...statistics,
          dataLimitations: ["INTERNAL INTERPRETATION NOTE"],
        },
        report: {
          executiveSummary: "No hospital records match the selected period.",
          keyFindings: [],
          workloadAnalysis: "",
          recommendedActions: [],
        },
      },
    }),
  );

  assert.equal(
    html.includes("No hospital records match the selected period."),
    true,
  );

  for (const unwanted of [
    "Data limitations",
    "INTERNAL INTERPRETATION NOTE",
    "Key findings",
    "Workload and outstanding work",
    "Recommended actions",
    "No additional findings",
    "No actions recommended",
  ]) {
    assert.equal(html.includes(unwanted), false);
  }
});
