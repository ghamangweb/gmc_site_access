import { reportTimestamp } from "@/lib/domain/report-timestamp";
import {
  ACCESS_PURPOSE_LABELS,
  WORKFLOW_STATE_LABELS,
} from "@/lib/domain/types";
import {
  WORKFLOW_EXEMPTION_REPORT_HEADERS,
  type WorkflowExemptionReportRecord,
  workflowExemptionReportValues,
} from "@/lib/domain/workflow-exemption-report";

export const APPROVALS_REPORT_HEADERS = [
  "Name",
  "Passport/ID Number",
  "Company",
  "Nature of Visit",
  "Arrival Date",
  "Departure Date",
  "Approval Status",
  "Current Workflow Stage",
  "Approval Requested At (UTC)",
  "Approved By",
  "Approver Role",
  "Approved At (UTC)",
  "Delegated Approval",
  "Delegated To",
  "Delegated By",
  "Delegated At (UTC)",
  "Delegation Reason",
  ...WORKFLOW_EXEMPTION_REPORT_HEADERS,
] as const;

export type ApprovalsReportRecord = {
  engagementId: string;
  name: string;
  passport: string;
  company: string;
  purpose: string;
  arrival: string;
  departure: string;
  workflowState: string;
  requestedAt: Date | null;
  approvalId: string | null;
  approvedBy: string;
  approverRole: string;
  approvedAt: Date | null;
  isDelegated: boolean;
  delegatedTo: string;
  delegatedBy: string;
  delegatedAt: Date | null;
  delegationReason: string;
};

export type ApprovalsReportExemption = WorkflowExemptionReportRecord & {
  stakeholderApprovalId: string;
};

function labelFor(labels: Record<string, string>, value: string): string {
  return labels[value] ?? value;
}

export function approvalsReportRows(
  records: ApprovalsReportRecord[],
  exemptions: ApprovalsReportExemption[] = [],
): string[][] {
  return records.map((record) => {
    const approved = record.approvalId !== null;

    const approvalExemptions = approved
      ? exemptions.filter(
          (exemption) =>
            exemption.engagementId === record.engagementId &&
            exemption.stakeholderApprovalId === record.approvalId,
        )
      : [];

    return [
      record.name,
      record.passport,
      record.company,
      labelFor(ACCESS_PURPOSE_LABELS, record.purpose),
      record.arrival,
      record.departure,
      approved ? "Approved" : "Awaiting Approval",
      labelFor(WORKFLOW_STATE_LABELS, record.workflowState),
      reportTimestamp(record.requestedAt),
      approved ? record.approvedBy : "",
      approved ? record.approverRole : "",
      approved ? reportTimestamp(record.approvedAt) : "",
      record.isDelegated ? "Yes" : "No",
      record.isDelegated ? record.delegatedTo : "",
      record.isDelegated ? record.delegatedBy : "",
      record.isDelegated ? reportTimestamp(record.delegatedAt) : "",
      record.isDelegated ? record.delegationReason : "",
      ...workflowExemptionReportValues(approvalExemptions),
    ];
  });
}
