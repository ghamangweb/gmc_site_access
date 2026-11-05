import { format, parseISO } from "date-fns";

import {
  HOSPITAL_CLEARANCE_LABELS,
  type HospitalClearanceStatus,
  WORKFLOW_EXEMPTION_STAGE_LABELS,
  type WorkflowExemptionStage,
  type WorkflowRole,
} from "@/lib/domain/types";

// Every dashboard (bell) notification's wording, agreed 2026-11-05: short and
// formal, naming the person, saying what happened and — where there is one —
// what the reader should do. No passport numbers, timestamps, role codes,
// comments or "routed to": those live on the record. Notifications don't
// link anywhere, so the name is what tells the reader which record it is.

/** "2026-11-12" → "12 Nov 2026". */
export function noticeDate(isoDate: string): string {
  return format(parseISO(isoDate), "dd MMM yyyy");
}

export const notice = {
  // Role labels carry an abbreviation, e.g. "Chief Sustainability Officer
  // (CSO)"; the notice uses the name alone.
  accessRequested: (requester: string, roleLabel: string) =>
    `${requester} has requested access as ${roleLabel.replace(/\s*\([^)]*\)$/, "")}.`,

  registrationSubmitted: (name: string) =>
    `${name} has submitted a registration and is awaiting your approval.`,

  registrationApproved: (name: string) =>
    `${name}'s registration has been approved by the Department Head.`,

  approvalRequested: (name: string) =>
    `${name}'s application is awaiting your approval.`,

  // The one notice that carries a reason: it isn't stored or emailed
  // anywhere else, and the System Admin needs it to decide the grant.
  delegatedApprovalRequested: (name: string, reason: string) =>
    `Delegated approval has been requested for ${name}'s application. Reason: ${reason}`,

  delegationGranted: (name: string) =>
    `You have been granted approval of ${name}'s application.`,

  /** To the stage a record moves to next. */
  readyFor: (name: string, role: WorkflowRole) =>
    role === "HospitalStaff"
      ? `${name} is ready for medical assessment.`
      : role === "TrainingStaff"
        ? `${name} is ready for induction.`
        : `${name} is ready for access activation.`,

  approvedWithExemption: (name: string, stages: WorkflowExemptionStage[]) =>
    `${name}'s application has been approved with an exemption from ${stages
      .map((stage) => WORKFLOW_EXEMPTION_STAGE_LABELS[stage])
      .join(" and ")}.`,

  applicationRejected: (name: string) =>
    `${name}'s application has not been approved.`,

  medicallyCleared: (name: string, next: "TrainingStaff" | "SecurityStaff") =>
    next === "SecurityStaff"
      ? `${name} has been medically cleared and is ready for access activation.`
      : `${name} has been medically cleared and is ready for induction.`,

  fitWithConditions: (name: string) =>
    `${name} has been cleared Fit with Conditions.`,

  unfit: (name: string) => `${name} has been assessed as Unfit.`,

  clearanceRecorded: (name: string) =>
    `Medical clearance has been recorded for ${name}.`,

  reviewRecorded: (name: string, status: HospitalClearanceStatus) =>
    `${name}'s follow-up medical review has been recorded as ${HOSPITAL_CLEARANCE_LABELS[status]}.`,

  reviewRecordedForHse: (name: string) =>
    `A follow-up medical review has been recorded for ${name}.`,

  reviewDue: (name: string, dueToday: boolean) =>
    `${name}'s follow-up medical review is due ${dueToday ? "today" : "tomorrow"}.`,

  inductionCompleted: (name: string) =>
    `${name} has completed induction and is ready for access activation.`,

  inductionCompletedForHse: (name: string) =>
    `${name} has completed induction.`,

  accessActivated: (name: string) =>
    `Site access has been activated for ${name}.`,

  revocationRequested: (name: string) =>
    `Revocation of site access has been requested for ${name}.`,

  accessRevoked: (name: string) => `${name}'s site access has been revoked.`,

  stayExtended: (name: string, newDepartureDate: string) =>
    `${name}'s stay has been extended to ${noticeDate(newDepartureDate)}.`,

  stayExtendedForSecurity: (name: string, newDepartureDate: string) =>
    `${name}'s stay has been extended to ${noticeDate(newDepartureDate)}. Please update the access card.`,

  cardExpiryUpdated: (name: string, newExpiry: string) =>
    `${name}'s access card now expires on ${noticeDate(newExpiry)}.`,
};
