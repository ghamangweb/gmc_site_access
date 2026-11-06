import { reportTimestamp } from "@/lib/domain/report-timestamp";
import {
  ACCESS_PURPOSE_LABELS,
  HOSPITAL_CLEARANCE_LABELS,
  isoToday,
  WORKFLOW_STATE_LABELS,
} from "@/lib/domain/types";
import type { WorkflowExemptionReportRecord } from "@/lib/domain/workflow-exemption-report";

export const HOSPITAL_REPORT_HEADERS = [
  "Name",
  "Passport/ID Number",
  "Company",
  "Nature of Visit",
  "Arrival Date",
  "Departure Date",
  "Hospital Status",
  "Current Workflow Stage",
  "Clearance Outcome",
  "Doctor Comments",
  "Recorded At (UTC)",
  "Recorded By",
  "Next Review Date",
  "Latest Clearance",
  "Review Status",
] as const;

export type HospitalReportCycle = {
  id: string;
  engagementId: string;
  name: string;
  passport: string;
  company: string;
  purpose: string;
  arrival: string;
  departure: string;
  workflowState: string;
  archivedAt: Date | null;
};

export type HospitalReportClearance = {
  workflowCycleId: string;
  clearanceStatus: string;
  doctorComments: string;
  clearanceDate: Date;
  recordedByName: string | null;
  nextReviewDate: string | null;
  isLatest: boolean;
  awaitingReview: boolean;
};

function labelFor(labels: Record<string, string>, value: string): string {
  return labels[value] ?? value;
}

export function hospitalReportRows(
  cycles: HospitalReportCycle[],
  clearances: HospitalReportClearance[],
  exemptions: WorkflowExemptionReportRecord[] = [],
  today: string = isoToday(),
): string[][] {
  return cycles.flatMap((cycle) => {
    const cycleExemptions = exemptions.filter(
      (exemption) =>
        exemption.workflowCycleId === cycle.id &&
        exemption.engagementId === cycle.engagementId,
    );

    // A Medical By-pass skipped Hospital, so the cycle is not Hospital's
    // record at all and stays out of its export (2026-11-05). Exemption
    // details live in the other stages' exports.
    if (cycleExemptions.some((exemption) => exemption.stage === "Hospital")) {
      return [];
    }

    const recorded = clearances.filter(
      (clearance) => clearance.workflowCycleId === cycle.id,
    );

    const awaitingClearance =
      cycle.archivedAt === null && cycle.workflowState === "AtHospital";

    // Preserve every recorded decision/review; an empty cycle gets one awaiting row.
    const entries: (HospitalReportClearance | undefined)[] = recorded.length
      ? recorded
      : [undefined];

    return entries.map((clearance) => {
      const awaitingReview =
        cycle.archivedAt === null && clearance?.awaitingReview === true;

      const status = awaitingReview
        ? "Awaiting Review"
        : awaitingClearance && (!clearance || clearance.isLatest)
          ? clearance?.clearanceStatus === "Unfit"
            ? "Awaiting Re-clearance"
            : "Awaiting Clearance"
          : "Recorded";

      const reviewDate = clearance?.nextReviewDate;

      const reviewStatus =
        awaitingReview && reviewDate
          ? reviewDate < today
            ? "Overdue"
            : reviewDate === today
              ? "Due Today"
              : "Upcoming"
          : "";

      return [
        cycle.name,
        cycle.passport,
        cycle.company,
        labelFor(ACCESS_PURPOSE_LABELS, cycle.purpose),
        cycle.arrival,
        cycle.departure,
        status,
        labelFor(WORKFLOW_STATE_LABELS, cycle.workflowState),
        clearance
          ? labelFor(HOSPITAL_CLEARANCE_LABELS, clearance.clearanceStatus)
          : "",
        clearance?.doctorComments ?? "",
        reportTimestamp(clearance?.clearanceDate),
        clearance?.recordedByName ?? "",
        reviewDate ?? "",
        clearance ? (clearance.isLatest ? "Yes" : "No") : "",
        reviewStatus,
      ];
    });
  });
}
