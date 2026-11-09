import "server-only";

import { type DbClient, db } from "@/lib/db/client";
import type {
  AiReportData,
  AiReportPeriod,
  AiReportWorkflow,
  GeneratedAiReport,
} from "@/lib/domain/ai-report";
import {
  previousReportPeriod,
  withReportActivity,
} from "@/lib/domain/report-activity";
import {
  type ReportCreationWindow,
  reportDateBounds,
} from "@/lib/domain/report-creation-window";
import { workflowAiReportData } from "@/lib/domain/workflow-ai-report";
import { generateAiReport } from "@/lib/services/ai-report-service";
import { collectReportActivity } from "@/lib/services/report-activity-service";
import {
  exportApprovalsRows,
  exportHospitalRows,
  exportReceptionRows,
  exportSecurityRows,
  exportTrainingRows,
} from "@/lib/services/workflow-service";

function exportRows(
  workflow: AiReportWorkflow,
  window: ReportCreationWindow,
  delegatedApproverId: string | undefined,
  client: DbClient,
): Promise<string[][]> {
  switch (workflow) {
    case "Reception":
      return exportReceptionRows(client, window);
    case "Hospital":
      return exportHospitalRows(client, window);
    case "Training":
      return exportTrainingRows(client, window);
    case "Security":
      return exportSecurityRows(client, window);
    case "Approvals":
      return exportApprovalsRows(delegatedApproverId, client, window);
  }
}

// Callers must authorize the workflow and derive delegate scope from the authenticated session.
export async function buildWorkflowAiReportData(
  workflow: AiReportWorkflow,
  period: AiReportPeriod,
  delegatedApproverId?: string,
  client: DbClient = db,
): Promise<AiReportData> {
  const generatedAt = new Date();
  const window = { ...reportDateBounds(period), generatedAt };

  const previousWindow = {
    ...reportDateBounds(previousReportPeriod(period)),
    generatedAt,
  };

  // Sequential: `client` may be a transaction, which can't run queries concurrently.
  const rows = await exportRows(workflow, window, delegatedApproverId, client);

  const activity = await collectReportActivity(
    workflow,
    window,
    delegatedApproverId,
    client,
  );

  const previousRows = await exportRows(
    workflow,
    previousWindow,
    delegatedApproverId,
    client,
  );

  const previousActivity = await collectReportActivity(
    workflow,
    previousWindow,
    delegatedApproverId,
    client,
  );

  return withReportActivity(
    workflowAiReportData(workflow, period, rows, generatedAt),
    activity,
    { totalRecords: previousRows.length, activity: previousActivity },
  );
}

export async function generateWorkflowAiReport(
  workflow: AiReportWorkflow,
  period: AiReportPeriod,
  delegatedApproverId?: string,
): Promise<GeneratedAiReport> {
  const statistics = await buildWorkflowAiReportData(
    workflow,
    period,
    delegatedApproverId,
  );

  const report = await generateAiReport(statistics);

  return { statistics, report };
}
