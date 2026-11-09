import "server-only";

import { type DbClient, db } from "@/lib/db/client";
import type {
  AiReportData,
  AiReportPeriod,
  AiReportWorkflow,
  GeneratedAiReport,
} from "@/lib/domain/ai-report";
import { reportDateBounds } from "@/lib/domain/report-creation-window";
import { workflowAiReportData } from "@/lib/domain/workflow-ai-report";
import { generateAiReport } from "@/lib/services/ai-report-service";
import {
  exportApprovalsRows,
  exportHospitalRows,
  exportReceptionRows,
  exportSecurityRows,
  exportTrainingRows,
} from "@/lib/services/workflow-service";

// Callers must authorize the workflow and derive delegate scope from the authenticated session.
export async function buildWorkflowAiReportData(
  workflow: AiReportWorkflow,
  period: AiReportPeriod,
  delegatedApproverId?: string,
  client: DbClient = db,
): Promise<AiReportData> {
  const bounds = reportDateBounds(period);
  const generatedAt = new Date();
  const window = { ...bounds, generatedAt };
  let rows: string[][];

  switch (workflow) {
    case "Reception":
      rows = await exportReceptionRows(client, window);
      break;
    case "Hospital":
      rows = await exportHospitalRows(client, window);
      break;
    case "Training":
      rows = await exportTrainingRows(client, window);
      break;
    case "Security":
      rows = await exportSecurityRows(client, window);
      break;
    case "Approvals":
      rows = await exportApprovalsRows(delegatedApproverId, client, window);
      break;
  }

  return workflowAiReportData(workflow, period, rows, generatedAt);
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
