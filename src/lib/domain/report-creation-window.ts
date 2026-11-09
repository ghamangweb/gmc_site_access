import {
  type AiReportPeriod,
  aiReportDataSchema,
} from "@/lib/domain/ai-report";

export type ReportDateBounds = { start: Date; endExclusive: Date };

export type ReportCreationWindow = ReportDateBounds & { generatedAt: Date };

export function reportDateBounds(period: AiReportPeriod): ReportDateBounds {
  const validated = aiReportDataSchema.shape.period.parse(period);
  const start = new Date(`${validated.start}T00:00:00.000Z`);
  const endExclusive = new Date(`${validated.end}T00:00:00.000Z`);

  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

  return { start, endExclusive };
}
