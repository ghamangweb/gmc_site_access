import {
  WORKFLOW_EXEMPTION_STAGE_LABELS,
  type WorkflowExemptionStage,
} from "@/lib/domain/types";

export const WORKFLOW_EXEMPTION_REPORT_HEADERS = [
  "Exempted Stages",
  "Exemption Reason / Comment",
  "Exemption Approved By",
  "Exemption Approved At (UTC)",
] as const;

export type WorkflowExemptionReportRecord = {
  engagementId: string;
  workflowCycleId: string;
  stage: WorkflowExemptionStage;
  reason: string;
  approverName: string;
  approverRole: string;
  approvedAt: Date;
  archivedAt: Date | null;
};

export function workflowExemptionReportValues(
  exemptions: WorkflowExemptionReportRecord[],
): string[] {
  return [
    exemptions
      .map((exemption) => WORKFLOW_EXEMPTION_STAGE_LABELS[exemption.stage])
      .join("; "),
    exemptions
      .map(
        (exemption) =>
          `${WORKFLOW_EXEMPTION_STAGE_LABELS[exemption.stage]}: ${exemption.reason}`,
      )
      .join("\n"),
    [
      ...new Set(
        exemptions.map(
          (exemption) =>
            `${exemption.approverName} (${exemption.approverRole})`,
        ),
      ),
    ].join("; "),
    [
      ...new Set(
        exemptions.map((exemption) => exemption.approvedAt.toISOString()),
      ),
    ].join("; "),
  ];
}
