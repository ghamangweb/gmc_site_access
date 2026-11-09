import {
  type AiReportData,
  type AiReportPeriod,
  type AiReportWorkflow,
  aiReportDataSchema,
} from "@/lib/domain/ai-report";
import { APPROVALS_REPORT_HEADERS } from "@/lib/domain/approvals-report";
import { HOSPITAL_REPORT_HEADERS } from "@/lib/domain/hospital-report";
import { RECEPTION_REPORT_HEADERS } from "@/lib/domain/reception-report";
import {
  APPROVALS_SHEETS,
  HOSPITAL_SHEETS,
  RECEPTION_SHEETS,
  type ReportSheetSpec,
  SECURITY_SHEETS,
  TRAINING_SHEETS,
} from "@/lib/domain/report-sheets";
import { SECURITY_REPORT_HEADERS } from "@/lib/domain/security-report";
import { TRAINING_REPORT_HEADERS } from "@/lib/domain/training-report";
import { WORKFLOW_STATE_LABELS } from "@/lib/domain/types";

type ExportRecord = Parameters<ReportSheetSpec<string>["include"]>[0];

type ReportCount = {
  name: string;
  definition: string;
  include: (row: ExportRecord) => boolean;
};

type WorkflowReportDefinition = {
  headers: readonly string[];
  tabs: readonly ReportSheetSpec<string>[];
  unit: string;
  countingNote: string;
  additionalCounts: ReportCount[];
};

function categoryCounts(
  column: string,
  prefix: string,
  values: readonly string[],
): ReportCount[] {
  return values.map((value) => ({
    name: `${prefix}: ${value}`,
    definition: `Export entries whose ${column} is ${value}. These are current export classifications, not events during the selected dates.`,
    include: (row: ExportRecord): boolean => row[column] === value,
  }));
}

export const WORKFLOW_REPORT_DEFINITIONS = {
  Reception: {
    headers: RECEPTION_REPORT_HEADERS,
    tabs: RECEPTION_SHEETS,
    unit: "records",
    countingNote:
      "Each row is one engagement or one approved submission awaiting conversion. Converted submissions are represented by their engagement only.",
    additionalCounts: [
      ...categoryCounts("Submission Status", "Submission", [
        "Approved — Awaiting Conversion",
      ]),
      ...categoryCounts(
        "Current Workflow Stage",
        "Stage",
        Object.values(WORKFLOW_STATE_LABELS),
      ),
    ],
  },
  Hospital: {
    headers: HOSPITAL_REPORT_HEADERS,
    tabs: HOSPITAL_SHEETS,
    unit: "report entries",
    countingNote:
      "Rows include recorded medical decisions/reviews across workflow cycles and awaiting-clearance entries. One person or cycle may have multiple rows; totals are not unique visitors. Medical by-pass cycles are excluded, as in the export.",
    additionalCounts: [
      ...categoryCounts("Clearance Outcome", "Outcome", [
        "Fit",
        "Fit with Conditions",
        "Unfit",
      ]),
      ...categoryCounts("Review Status", "Review", [
        "Overdue",
        "Due Today",
        "Upcoming",
      ]),
    ],
  },
  Training: {
    headers: TRAINING_REPORT_HEADERS,
    tabs: TRAINING_SHEETS,
    unit: "workflow cycles",
    countingNote:
      "Each export row represents one workflow cycle, including historical cycles and recorded exemptions. One engagement or person may have multiple cycles; totals are not unique visitors.",
    additionalCounts: categoryCounts("Training Status", "Induction", [
      "Exempted",
    ]),
  },
  Security: {
    headers: SECURITY_REPORT_HEADERS,
    tabs: SECURITY_SHEETS,
    unit: "engagements",
    countingNote:
      "Each row represents one engagement with its latest issued card. Site Access Granted counts issued cards, including expired cards and cards awaiting revocation; it does not mean all access is currently active.",
    additionalCounts: categoryCounts("Access Status", "Access", [
      "Pending",
      "Active",
      "Expired",
      "Revocation Requested",
      "Revoked",
    ]),
  },
  Approvals: {
    headers: APPROVALS_REPORT_HEADERS,
    tabs: APPROVALS_SHEETS,
    unit: "approval records",
    countingNote:
      "Rows contain pending approval requests or recorded approvals, with the same stakeholder/delegate visibility as the export. Rejections are not included in this export scope.",
    additionalCounts: categoryCounts(
      "Delegated Approval",
      "Delegated approval",
      ["Yes"],
    ),
  },
} satisfies Record<AiReportWorkflow, WorkflowReportDefinition>;

export function workflowAiReportData(
  workflow: AiReportWorkflow,
  period: AiReportPeriod,
  rows: readonly string[][],
  generatedAt: Date,
): AiReportData {
  const definition = WORKFLOW_REPORT_DEFINITIONS[workflow];

  const counters: ReportCount[] = [
    ...definition.tabs.map((tab) => ({
      name: tab.name,
      definition: `Export entries included in the ${tab.name} dashboard tab. Tab counts may overlap and must not be added together.`,
      include: tab.include,
    })),
    ...definition.additionalCounts,
  ];

  const values = counters.map(() => 0);

  for (const row of rows) {
    if (row.length !== definition.headers.length) {
      throw new Error(
        "The workflow export columns do not match the report definition.",
      );
    }

    const record = Object.fromEntries(
      definition.headers.map((header, index) => [header, row[index]]),
    );

    for (const [index, counter] of counters.entries()) {
      if (counter.include(record)) values[index] += 1;
    }
  }

  return aiReportDataSchema.parse({
    workflow,
    period,
    generatedAt: generatedAt.toISOString(),
    recordScope:
      workflow === "Reception"
        ? "The existing Reception export scope, filtered by engagement creation date or unconverted submission creation date, inclusive in UTC (Ghana time) and capped at generation time. Converted submissions count through their engagement creation date. Dashboard filters and pages do not restrict this report."
        : `The existing ${workflow} export scope, restricted to engagements created within the selected dates inclusive in UTC (Ghana time), capped at generation time. All qualifying export entries for those engagements are counted, regardless of current dashboard tab, search or page.`,
    statusBasis:
      "Current export classifications when the report statistics are collected, not historical statuses at the period end.",
    totalRecords: rows.length,
    metrics: counters.map((counter, index) => ({
      name: counter.name,
      definition: counter.definition,
      value: values[index],
      unit: definition.unit,
    })),
    comparison: null,
    dataLimitations: [
      definition.countingNote,
      "The date range selects creation cohorts, not the dates of approvals, clearances, inductions or card activations. Recorded events for selected engagements may fall outside the selected dates.",
      "Metrics may overlap or cover only part of the total; do not sum them into a new total or infer missing categories.",
      "Statuses are current at generation. Historical period-end snapshots, processing times, service targets and previous-period comparisons are not supplied.",
      "Only fixed-label aggregate counts are provided to the AI. Personal details and free-text comments from export rows are excluded.",
    ],
  });
}
