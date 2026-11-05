import {
  ACCESS_PURPOSE_LABELS,
  ACCESS_STATE_LABELS,
  type AccessState,
  getEffectiveAccessState,
  WORKFLOW_STATE_LABELS,
} from "@/lib/domain/types";
import {
  WORKFLOW_EXEMPTION_REPORT_HEADERS,
  type WorkflowExemptionReportRecord,
  workflowExemptionReportValues,
} from "@/lib/domain/workflow-exemption-report";

export const RECEPTION_REPORT_HEADERS = [
  "Name",
  "Passport/ID Number",
  "Registration Type",
  "Company",
  "Department",
  "Nature of Visit",
  "Arrival Date",
  "Departure Date",
  "Submission Status",
  "Submitted At (UTC)",
  "Current Workflow Stage",
  "Access Status",
  "Rejected By",
  "Rejection Reason",
  "Rejected At (UTC)",
  ...WORKFLOW_EXEMPTION_REPORT_HEADERS,
] as const;

export type ReceptionReportRecord = {
  engagementId: string | null;
  name: string;
  passport: string;
  registrationType: string;
  company: string;
  department: string;
  purpose: string;
  arrival: string;
  departure: string;
  submissionStatus: string;
  submittedAt: Date | null;
  workflowState: string;
  accessState: string;
  cardExpiry: string | null;
  rejectedBy: string;
  rejectionReason: string;
  rejectedAt: Date | null;
};

function labelFor(labels: Record<string, string>, value: string): string {
  return labels[value] ?? value;
}

export function receptionReportRows(
  records: ReceptionReportRecord[],
  exemptions: WorkflowExemptionReportRecord[] = [],
): string[][] {
  return records.map((record) => {
    // SAFETY: persisted access states are written from the AccessState domain union.
    const accessState = record.accessState
      ? getEffectiveAccessState(
          record.accessState as AccessState,
          record.cardExpiry ?? undefined,
        )
      : "";

    return [
      record.name,
      record.passport,
      record.registrationType,
      record.company,
      record.department,
      labelFor(ACCESS_PURPOSE_LABELS, record.purpose),
      record.arrival,
      record.departure,
      record.submissionStatus,
      record.submittedAt?.toISOString() ?? "",
      labelFor(WORKFLOW_STATE_LABELS, record.workflowState),
      labelFor(ACCESS_STATE_LABELS, accessState),
      record.rejectedBy,
      record.rejectionReason,
      record.rejectedAt?.toISOString() ?? "",
      ...workflowExemptionReportValues(
        exemptions.filter(
          (exemption) =>
            exemption.engagementId === record.engagementId &&
            exemption.archivedAt === null,
        ),
      ),
    ];
  });
}
