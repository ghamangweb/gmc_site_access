import {
  ACCESS_PURPOSE_LABELS,
  WORKFLOW_STATE_LABELS,
} from "@/lib/domain/types";

export const TRAINING_REPORT_HEADERS = [
  "Name",
  "Passport/ID Number",
  "Nature of Visit",
  "Training Status",
  "Current Workflow Stage",
  "General Site Induction",
  "Other Inductions",
  "Completion Date (UTC)",
  "Completed By",
  "Audit Timestamp (UTC)",
  "Previous Stage",
  "Next Stage",
  "Audit Note",
  "Clearance Form Uploaded",
] as const;

export type TrainingReportCycle = {
  id: string;
  engagementId: string;
  cycleNumber: number;
  name: string;
  passport: string;
  purpose: string;
  workflowState: string;
};

export type TrainingReportInduction = {
  workflowCycleId: string;
  generalSiteInduction: boolean;
  otherInductions: boolean;
  completedAt: Date;
};

export type TrainingReportAudit = {
  workflowCycleId: string;
  engagementId: string;
  completedBy: string | null;
  performedAt: Date;
  fromState: string;
  toState: string;
  comments: string | null;
};

type TrainingReportDocument = {
  workflowCycleId: string | null;
  engagementId: string | null;
};

function labelFor(labels: Record<string, string>, value: string): string {
  return labels[value] ?? value;
}

export function trainingReportRows(
  cycles: TrainingReportCycle[],
  inductions: TrainingReportInduction[],
  audits: TrainingReportAudit[],
  documents: TrainingReportDocument[],
): string[][] {
  return cycles.map((cycle) => {
    // Queries supply newest first so historical duplicates still produce one row per cycle.
    const induction = inductions.find(
      (row) => row.workflowCycleId === cycle.id,
    );

    const audit = induction
      ? audits.find(
          (row) =>
            row.workflowCycleId === cycle.id &&
            row.engagementId === cycle.engagementId,
        )
      : undefined;

    const hasClearance = documents.some(
      (row) =>
        row.workflowCycleId === cycle.id &&
        row.engagementId === cycle.engagementId,
    );

    return [
      cycle.name,
      cycle.passport,
      labelFor(ACCESS_PURPOSE_LABELS, cycle.purpose),
      induction ? "Completed" : "Awaiting",
      labelFor(WORKFLOW_STATE_LABELS, cycle.workflowState),
      induction ? (induction.generalSiteInduction ? "Yes" : "No") : "",
      induction ? (induction.otherInductions ? "Yes" : "No") : "",
      induction?.completedAt.toISOString() ?? "",
      audit?.completedBy ?? "",
      audit?.performedAt.toISOString() ?? "",
      audit ? labelFor(WORKFLOW_STATE_LABELS, audit.fromState) : "",
      audit ? labelFor(WORKFLOW_STATE_LABELS, audit.toState) : "",
      audit?.comments ?? "",
      hasClearance ? "Yes" : "No",
    ];
  });
}
