import { reportTimestamp } from "@/lib/domain/report-timestamp";
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

export const SECURITY_REPORT_HEADERS = [
  "Name",
  "Passport/ID Number",
  "Company",
  "Nature of Visit",
  "Arrival Date",
  "Departure Date",
  "Security Status",
  "Current Workflow Stage",
  "Access Status",
  "Card Type",
  "Card Number",
  "Card Expiry",
  "Activated At (UTC)",
  "Activated By",
  "Activation Comments",
  "Revocation Requested At (UTC)",
  "Revocation Requested By",
  "Revocation Reason",
  "Revoked At (UTC)",
  "Revoked By",
  ...WORKFLOW_EXEMPTION_REPORT_HEADERS,
] as const;

export type SecurityReportEngagement = {
  id: string;
  name: string;
  passport: string;
  company: string;
  purpose: string;
  arrival: string;
  departure: string;
  workflowState: string;
  accessState: string;
};

export type SecurityReportProvisioning = {
  engagementId: string;
  workflowCycleId: string;
  idType: string;
  accessCardNumber: string;
  accessCardExpiry: string;
  activatedAt: Date;
};

export type SecurityReportAudit = {
  engagementId: string;
  workflowCycleId: string;
  performedBy: string | null;
  comments: string | null;
};

export type SecurityReportRevocation = {
  engagementId: string;
  requestedAt: Date;
  requestedBy: string;
  reason: string;
  status: string;
  decidedAt: Date | null;
  decidedBy: string;
};

function labelFor(labels: Record<string, string>, value: string): string {
  return labels[value] ?? value;
}

export function securityReportRows(
  engagements: SecurityReportEngagement[],
  provisionings: SecurityReportProvisioning[],
  audits: SecurityReportAudit[],
  revocations: SecurityReportRevocation[],
  exemptions: WorkflowExemptionReportRecord[] = [],
): string[][] {
  // Queries supply newest first. One row per engagement with its latest card.
  return engagements.map((engagement) => {
    const card = provisionings.find(
      (row) => row.engagementId === engagement.id,
    );

    const audit = card
      ? audits.find(
          (row) =>
            row.engagementId === engagement.id &&
            row.workflowCycleId === card.workflowCycleId,
        )
      : undefined;

    const revocation = revocations.find(
      (row) =>
        row.engagementId === engagement.id &&
        (!card || row.requestedAt >= card.activatedAt),
    );

    // SAFETY: engagement access states are written from the AccessState domain union.
    const accessState = getEffectiveAccessState(
      engagement.accessState as AccessState,
      card?.accessCardExpiry,
    );

    const status =
      accessState === "TerminationRequested"
        ? "Revocation Requested"
        : card
          ? "Access Issued"
          : "Awaiting Review";

    const cycleExemptions = exemptions.filter(
      (exemption) =>
        exemption.engagementId === engagement.id &&
        (engagement.workflowState === "AtSecurity" || !card
          ? exemption.archivedAt === null
          : exemption.workflowCycleId === card.workflowCycleId),
    );

    return [
      engagement.name,
      engagement.passport,
      engagement.company,
      labelFor(ACCESS_PURPOSE_LABELS, engagement.purpose),
      engagement.arrival,
      engagement.departure,
      status,
      labelFor(WORKFLOW_STATE_LABELS, engagement.workflowState),
      ACCESS_STATE_LABELS[accessState] ?? accessState,
      card?.idType ?? "",
      card?.accessCardNumber ?? "",
      card?.accessCardExpiry ?? "",
      reportTimestamp(card?.activatedAt),
      audit?.performedBy ?? "",
      audit?.comments ?? "",
      reportTimestamp(revocation?.requestedAt),
      revocation?.requestedBy ?? "",
      revocation?.reason ?? "",
      revocation?.status === "Revoked"
        ? reportTimestamp(revocation.decidedAt)
        : "",
      revocation?.status === "Revoked" ? revocation.decidedBy : "",
      ...workflowExemptionReportValues(cycleExemptions),
    ];
  });
}
