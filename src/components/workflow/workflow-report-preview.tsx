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
import { reportDocument } from "@/lib/domain/report-document";

type WorkflowReportPreviewProps = {
  result: GeneratedAiReport;
};

export function WorkflowReportPreview({
  result,
}: WorkflowReportPreviewProps): ReactElement {
  const id = useId();
  const content = reportDocument(result);
  const { statistics } = result;

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
          {content.title}
        </h3>
        <p className="text-sm text-muted-foreground">{content.period}</p>
        <p className="text-xs text-muted-foreground">
          Generated{" "}
          <time dateTime={statistics.generatedAt}>{content.generated}</time>
        </p>
        <p className="text-sm text-muted-foreground">{content.scope}</p>
      </header>

      <section aria-labelledby={`${id}-summary`} className="space-y-2">
        <h4
          id={`${id}-summary`}
          className="text-sm font-semibold text-foreground"
        >
          Executive summary
        </h4>
        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
          {content.executiveSummary}
        </p>
      </section>

      <section aria-labelledby={`${id}-statistics`} className="space-y-4">
        <h4
          id={`${id}-statistics`}
          className="text-sm font-semibold text-foreground"
        >
          Recorded statistics
        </h4>
        <p className="text-sm text-foreground">
          {content.totalLabel}:{" "}
          <strong className="font-semibold tabular-nums">
            {content.total}
          </strong>
          {content.previousTotal !== null && (
            <span className="text-muted-foreground">
              {" "}
              (previous period, {content.previousPeriod}:{" "}
              <span className="tabular-nums">{content.previousTotal}</span>)
            </span>
          )}
        </p>

        {content.groups.map((group) => (
          <div key={group.title} className="space-y-2">
            <div>
              <h5 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {group.title}
              </h5>
              <p className="text-xs text-muted-foreground">{group.note}</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead className="text-right">This period</TableHead>
                  {group.showShare && (
                    <TableHead className="text-right">Share</TableHead>
                  )}
                  {group.showPrevious && (
                    <TableHead className="text-right">
                      Previous period
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.rows.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell className="whitespace-normal">
                      {row.name}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.value}
                    </TableCell>
                    {group.showShare && (
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {row.share ?? "—"}
                      </TableCell>
                    )}
                    {group.showPrevious && (
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {row.previous ?? "—"}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))}
      </section>

      {content.findings.length > 0 && (
        <section aria-labelledby={`${id}-findings`} className="space-y-2">
          <h4
            id={`${id}-findings`}
            className="text-sm font-semibold text-foreground"
          >
            Key findings
          </h4>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-foreground">
            {content.findings.map((finding) => (
              <li key={finding} className="whitespace-pre-wrap break-words">
                {finding}
              </li>
            ))}
          </ul>
        </section>
      )}

      {content.workloadAnalysis && (
        <section aria-labelledby={`${id}-workload`} className="space-y-2">
          <h4
            id={`${id}-workload`}
            className="text-sm font-semibold text-foreground"
          >
            Workload and outstanding work
          </h4>
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
            {content.workloadAnalysis}
          </p>
        </section>
      )}

      {content.recommendedActions.length > 0 && (
        <section aria-labelledby={`${id}-actions`} className="space-y-2">
          <h4
            id={`${id}-actions`}
            className="text-sm font-semibold text-foreground"
          >
            Recommended actions
          </h4>
          <ol className="list-decimal space-y-3 pl-5 text-sm leading-6 text-foreground">
            {content.recommendedActions.map((recommendation) => (
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
