import "server-only";

import { type DbClient, db } from "@/lib/db/client";
import type { AiReportData, GeneratedAiReport } from "@/lib/domain/ai-report";
import type { ReceptionReportPeriod } from "@/lib/domain/reception-ai-report";
import {
  buildWorkflowAiReportData,
  generateWorkflowAiReport,
} from "@/lib/services/workflow-ai-report-service";

export async function generateReceptionAiReport(
  period: ReceptionReportPeriod,
): Promise<GeneratedAiReport> {
  return generateWorkflowAiReport("Reception", period);
}

export async function buildReceptionAiReportData(
  period: ReceptionReportPeriod,
  client: DbClient = db,
): Promise<AiReportData> {
  return buildWorkflowAiReportData("Reception", period, undefined, client);
}
