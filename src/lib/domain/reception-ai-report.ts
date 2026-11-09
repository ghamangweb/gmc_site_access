import type { AiReportData, AiReportPeriod } from "@/lib/domain/ai-report";
import {
  type ReportDateBounds,
  reportDateBounds,
} from "@/lib/domain/report-creation-window";
import { workflowAiReportData } from "@/lib/domain/workflow-ai-report";

export type ReceptionReportPeriod = AiReportPeriod;

export function receptionReportBounds(
  period: ReceptionReportPeriod,
): ReportDateBounds {
  return reportDateBounds(period);
}

export function receptionAiReportData(
  period: ReceptionReportPeriod,
  rows: readonly string[][],
  generatedAt: Date,
): AiReportData {
  return workflowAiReportData("Reception", period, rows, generatedAt);
}
