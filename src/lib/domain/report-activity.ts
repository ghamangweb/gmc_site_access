import {
  type AiReportData,
  type AiReportPeriod,
  type AiReportWorkflow,
  aiReportDataSchema,
  type ReportMetric,
} from "@/lib/domain/ai-report";

/** Activity during a period plus the queue at generation, read from the audit tables. */
export type ReportActivity = {
  completed: number;
  medianHours: number | null;
  /** Stakeholder rejections; null for workflows that cannot reject. */
  rejected: number | null;
  waiting: number;
  waitingOver3Days: number;
  waitingOver7Days: number;
};

type ActivityLabels = {
  completed: string;
  completedDefinition: string;
  median: string;
  medianDefinition: string;
  rejected?: string;
  waiting: string;
  waitingDefinition: string;
};

const ACTIVITY_LABELS = {
  Reception: {
    completed: "Approved and sent on",
    completedDefinition:
      "Engagements that left Reception for the next stage after stakeholder approval during the selected dates, regardless of when they were created.",
    median: "Median time from registration to approval",
    medianDefinition:
      "Median hours between an engagement entering Reception and leaving it after approval, for engagements that left Reception during the selected dates.",
    rejected: "Stakeholder rejections",
    waiting: "At Reception",
    waitingDefinition:
      "Engagements currently at the Reception stage, including those awaiting stakeholder approval. Age is measured from entering Reception.",
  },
  Hospital: {
    completed: "Cleared and sent on",
    completedDefinition:
      "Engagements medically cleared and moved to the next stage during the selected dates, regardless of when they were created.",
    median: "Median time at Hospital before clearance",
    medianDefinition:
      "Median hours between an engagement entering the Hospital stage and being cleared, for clearances during the selected dates.",
    waiting: "At Hospital",
    waitingDefinition:
      "Engagements currently at the Hospital stage, including those awaiting re-clearance. Age is measured from entering the Hospital stage.",
  },
  Training: {
    completed: "Inductions completed",
    completedDefinition:
      "Engagements that completed Training and moved to Security during the selected dates, regardless of when they were created.",
    median: "Median time at Training before completion",
    medianDefinition:
      "Median hours between an engagement entering Training and moving to Security, for completions during the selected dates.",
    waiting: "At Training",
    waitingDefinition:
      "Engagements currently at the Training stage. Age is measured from entering Training.",
  },
  Security: {
    completed: "Access cards issued",
    completedDefinition:
      "Engagements issued an access card, completing the Security stage, during the selected dates, regardless of when they were created.",
    median: "Median time at Security before card issue",
    medianDefinition:
      "Median hours between an engagement entering Security and its access card being issued, for cards issued during the selected dates.",
    waiting: "At Security",
    waitingDefinition:
      "Engagements currently at the Security stage. Age is measured from entering Security.",
  },
  Approvals: {
    completed: "Approvals signed",
    completedDefinition:
      "Stakeholder approvals signed during the selected dates, regardless of when the engagement was created.",
    median: "Median time from request to approval",
    medianDefinition:
      "Median hours between Reception requesting approval and the approval being signed, for approvals signed during the selected dates.",
    rejected: "Requests rejected",
    waiting: "Awaiting approval",
    waitingDefinition:
      "Approval requests currently awaiting a decision. Age is measured from the latest request.",
  },
} satisfies Record<AiReportWorkflow, ActivityLabels>;

function periodMetrics(
  workflow: AiReportWorkflow,
  activity: ReportActivity,
): ReportMetric[] {
  const labels: ActivityLabels = ACTIVITY_LABELS[workflow];

  const metrics: ReportMetric[] = [
    {
      name: labels.completed,
      group: "Period activity",
      definition: labels.completedDefinition,
      value: activity.completed,
      unit: "engagements",
    },
    {
      name: labels.median,
      group: "Period activity",
      definition: labels.medianDefinition,
      value: activity.medianHours,
      unit: "hours",
    },
  ];

  if (labels.rejected && activity.rejected !== null) {
    metrics.push({
      name: labels.rejected,
      group: "Period activity",
      definition:
        "Stakeholder rejections recorded during the selected dates, regardless of when the engagement was created.",
      value: activity.rejected,
      unit: "rejections",
    });
  }

  return metrics;
}

function queueMetrics(
  workflow: AiReportWorkflow,
  activity: ReportActivity,
): ReportMetric[] {
  const labels: ActivityLabels = ACTIVITY_LABELS[workflow];

  return [
    {
      name: `${labels.waiting} now`,
      group: "Current queue",
      definition: `${labels.waitingDefinition} A snapshot at generation, not limited to the selected dates.`,
      value: activity.waiting,
      unit: "engagements",
    },
    {
      name: `${labels.waiting} for more than 3 days`,
      group: "Current queue",
      definition: `Subset of "${labels.waiting} now" waiting more than 72 hours at generation.`,
      value: activity.waitingOver3Days,
      unit: "engagements",
    },
    {
      name: `${labels.waiting} for more than 7 days`,
      group: "Current queue",
      definition: `Subset of "${labels.waiting} for more than 3 days" waiting more than 168 hours at generation.`,
      value: activity.waitingOver7Days,
      unit: "engagements",
    },
  ];
}

/** The equal-length period ending the day before `period` starts. */
export function previousReportPeriod(period: AiReportPeriod): AiReportPeriod {
  const day = 86_400_000;
  const start = Date.parse(`${period.start}T00:00:00Z`);
  const end = Date.parse(`${period.end}T00:00:00Z`);
  const previousEnd = start - day;
  const previousStart = previousEnd - (end - start);

  return {
    start: new Date(previousStart).toISOString().slice(0, 10),
    end: new Date(previousEnd).toISOString().slice(0, 10),
  };
}

/**
 * Adds period activity, the current queue and a previous-period comparison
 * to the creation-cohort statistics. The comparison holds only the total and
 * period activity: current statuses of an older cohort are not comparable.
 */
export function withReportActivity(
  data: AiReportData,
  activity: ReportActivity,
  previous: { totalRecords: number; activity: ReportActivity } | null,
): AiReportData {
  const previousMetrics = previous
    ? periodMetrics(data.workflow, previous.activity)
    : [];

  const hasPreviousData =
    previous !== null &&
    (previous.totalRecords > 0 ||
      previousMetrics.some((metric) => (metric.value ?? 0) > 0));

  return aiReportDataSchema.parse({
    ...data,
    metrics: [
      ...data.metrics,
      ...periodMetrics(data.workflow, activity),
      ...queueMetrics(data.workflow, activity),
    ],
    comparison: hasPreviousData
      ? {
          period: previousReportPeriod(data.period),
          totalRecords: previous.totalRecords,
          metrics: previousMetrics,
        }
      : null,
    dataLimitations: [
      ...data.dataLimitations,
      "Period activity metrics count events during the selected dates, regardless of creation date, so they are not part of the creation-cohort total. A null median means no completions in the period.",
      "Current queue metrics are a snapshot at generation and are not limited to the selected dates.",
      hasPreviousData
        ? "The comparison covers the immediately preceding period of equal length and contains only the total and period activity metrics."
        : "No previous-period data is available for comparison.",
    ],
  });
}
