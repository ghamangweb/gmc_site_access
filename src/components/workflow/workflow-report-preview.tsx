import { format, parseISO } from "date-fns";
import { type ReactElement, useId } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { GeneratedAiReport } from "@/lib/domain/ai-report";
import { WORKFLOW_REPORT_PRESENTATION } from "@/lib/domain/workflow-report-presentation";

type WorkflowReportPreviewProps = {
  result: GeneratedAiReport;
};

export function WorkflowReportPreview({
  result,
}: WorkflowReportPreviewProps): ReactElement {
  const id = useId();
  const { statistics, report } = result;
  const presentation = WORKFLOW_REPORT_PRESENTATION[statistics.workflow];
  const findings = Array.from(new Set(report.keyFindings));

  return (
    <article
      aria-labelledby={`${id}-title`}
      className="space-y-6 rounded-xl border border-border bg-card p-6"
    >
      <header className="space-y-2">
        <h3
          id={`${id}-title`}
          className="text-lg font-semibold text-foreground"
        >
          {presentation.title} Report
        </h3>
        <p className="text-sm text-muted-foreground">
          {format(parseISO(statistics.period.start), "dd MMM yyyy")} to{" "}
          {format(parseISO(statistics.period.end), "dd MMM yyyy")}
        </p>
        <p className="text-xs text-muted-foreground">
          Generated{" "}
          <time dateTime={statistics.generatedAt}>
            {new Date(statistics.generatedAt).toLocaleString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "UTC",
            })}{" "}
            UTC
          </time>
        </p>
        <p className="text-sm text-muted-foreground">
          {statistics.workflow === "Reception"
            ? "Submissions and engagements created during the selected period."
            : "Engagements created during the selected period."}{" "}
          Statuses reflect the time of generation.
        </p>
      </header>

      <section aria-labelledby={`${id}-summary`} className="space-y-2">
        <h4
          id={`${id}-summary`}
          className="text-sm font-semibold text-foreground"
        >
          Executive summary
        </h4>
        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
          {report.executiveSummary}
        </p>
      </section>

      <section aria-labelledby={`${id}-statistics`} className="space-y-3">
        <h4
          id={`${id}-statistics`}
          className="text-sm font-semibold text-foreground"
        >
          Recorded statistics
        </h4>
        <p className="text-sm text-foreground">
          {presentation.totalLabel}:{" "}
          <strong className="font-semibold tabular-nums">
            {statistics.totalRecords.toLocaleString("en-GB")}
          </strong>
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Metric</TableHead>
              <TableHead className="text-right">Count</TableHead>
              <TableHead>Unit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {statistics.metrics.map((metric) => (
              <TableRow key={metric.name}>
                <TableCell>{metric.name}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {metric.value === null
                    ? "Not available"
                    : metric.value.toLocaleString("en-GB")}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {metric.unit}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      {findings.length > 0 && (
        <section aria-labelledby={`${id}-findings`} className="space-y-2">
          <h4
            id={`${id}-findings`}
            className="text-sm font-semibold text-foreground"
          >
            Key findings
          </h4>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-foreground">
            {findings.map((finding) => (
              <li key={finding} className="whitespace-pre-wrap break-words">
                {finding}
              </li>
            ))}
          </ul>
        </section>
      )}

      {report.workloadAnalysis && (
        <section aria-labelledby={`${id}-workload`} className="space-y-2">
          <h4
            id={`${id}-workload`}
            className="text-sm font-semibold text-foreground"
          >
            Workload and outstanding work
          </h4>
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
            {report.workloadAnalysis}
          </p>
        </section>
      )}

      {report.recommendedActions.length > 0 && (
        <section aria-labelledby={`${id}-actions`} className="space-y-2">
          <h4
            id={`${id}-actions`}
            className="text-sm font-semibold text-foreground"
          >
            Recommended actions
          </h4>
          <ol className="list-decimal space-y-3 pl-5 text-sm leading-6 text-foreground">
            {report.recommendedActions.map((recommendation) => (
              <li key={recommendation.action} className="space-y-1 break-words">
                <p className="whitespace-pre-wrap">
                  {recommendation.observation}
                </p>
                <p className="whitespace-pre-wrap">{recommendation.action}</p>
                <p className="text-xs text-muted-foreground">
                  Responsible: {recommendation.responsibleWorkflow}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </article>
  );
}
