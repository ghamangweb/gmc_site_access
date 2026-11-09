import { format, parseISO } from "date-fns";

import {
  type AiReportData,
  type GeneratedAiReport,
  REPORT_METRIC_GROUPS,
  type ReportMetric,
  type ReportMetricGroup,
} from "@/lib/domain/ai-report";
import { WORKFLOW_REPORT_PRESENTATION } from "@/lib/domain/workflow-report-presentation";

export type ReportStatisticRow = {
  name: string;
  value: string;
  /** Share of the total; only for groups that describe the creation cohort. */
  share: string | null;
  previous: string | null;
};

export type ReportStatisticGroup = {
  title: ReportMetricGroup;
  note: string;
  showShare: boolean;
  showPrevious: boolean;
  rows: ReportStatisticRow[];
};

export type ReportDocument = {
  title: string;
  period: string;
  generated: string;
  scope: string;
  totalLabel: string;
  total: string;
  previousTotal: string | null;
  previousPeriod: string | null;
  executiveSummary: string;
  groups: ReportStatisticGroup[];
  findings: string[];
  workloadAnalysis: string;
  recommendedActions: GeneratedAiReport["report"]["recommendedActions"];
};

const GROUP_NOTES: Record<ReportMetricGroup, string> = {
  "Dashboard tabs":
    "Records created in the period, by dashboard tab. Tabs can overlap, so they do not add up to the total.",
  "Current status":
    "Records created in the period, by their status when the report was generated.",
  "Period activity":
    "Work done during the period, whenever the record was created.",
  "Current queue":
    "Snapshot when the report was generated, not limited to the period.",
};

const COHORT_GROUPS: readonly ReportMetricGroup[] = [
  "Dashboard tabs",
  "Current status",
];

function count(value: number): string {
  return value.toLocaleString("en-GB");
}

export function formatMetricValue(metric: ReportMetric): string {
  if (metric.value === null) return "Not available";

  return metric.unit === "hours"
    ? `${metric.value.toLocaleString("en-GB", { maximumFractionDigits: 1 })} hours`
    : count(metric.value);
}

function formatDay(value: string): string {
  return format(parseISO(value), "dd MMM yyyy");
}

export function formatReportPeriod(period: AiReportData["period"]): string {
  return `${formatDay(period.start)} to ${formatDay(period.end)}`;
}

export function formatGeneratedAt(generatedAt: string): string {
  return `${new Date(generatedAt).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  })} UTC`;
}

export function reportStatisticGroups(
  statistics: AiReportData,
): ReportStatisticGroup[] {
  const previous = new Map(
    (statistics.comparison?.metrics ?? []).map((metric) => [
      metric.name,
      metric,
    ]),
  );

  return REPORT_METRIC_GROUPS.map((title) => {
    const metrics = statistics.metrics.filter(
      (metric) => (metric.group ?? "Current status") === title,
    );

    const showShare =
      COHORT_GROUPS.includes(title) && statistics.totalRecords > 0;

    const showPrevious = metrics.some((metric) => previous.has(metric.name));

    return {
      title,
      note: GROUP_NOTES[title],
      showShare,
      showPrevious,
      rows: metrics.map((metric) => {
        const before = previous.get(metric.name);

        return {
          name: metric.name,
          value: formatMetricValue(metric),
          share:
            showShare && metric.value !== null
              ? `${Math.round((metric.value / statistics.totalRecords) * 100)}%`
              : null,
          previous: before ? formatMetricValue(before) : null,
        };
      }),
    };
  }).filter((group) => group.rows.length > 0);
}

export function reportDocument(result: GeneratedAiReport): ReportDocument {
  const { statistics, report } = result;
  const presentation = WORKFLOW_REPORT_PRESENTATION[statistics.workflow];

  return {
    title: `${presentation.title} Report`,
    period: formatReportPeriod(statistics.period),
    generated: formatGeneratedAt(statistics.generatedAt),
    scope: `${
      statistics.workflow === "Reception"
        ? "Submissions and engagements created during the selected period."
        : "Engagements created during the selected period."
    } Statuses reflect the time of generation.`,
    totalLabel: presentation.totalLabel,
    total: count(statistics.totalRecords),
    previousTotal: statistics.comparison
      ? count(statistics.comparison.totalRecords)
      : null,
    previousPeriod: statistics.comparison
      ? formatReportPeriod(statistics.comparison.period)
      : null,
    executiveSummary: report.executiveSummary,
    groups: reportStatisticGroups(statistics),
    findings: Array.from(new Set(report.keyFindings)),
    workloadAnalysis: report.workloadAnalysis,
    recommendedActions: report.recommendedActions,
  };
}

export function reportFileName(
  statistics: AiReportData,
  extension: "docx" | "pdf",
): string {
  return `${statistics.workflow.toLowerCase()}-report-${statistics.period.start}-to-${statistics.period.end}.${extension}`;
}
