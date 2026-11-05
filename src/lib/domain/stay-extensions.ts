import { z } from "zod";
import { type Attention, danger, warning } from "@/lib/domain/attention";
import {
  type AccessState,
  isoToday,
  STAKEHOLDER_ROLES,
  type StakeholderRole,
  type SystemRole,
  type WorkflowRole,
  type WorkflowState,
} from "@/lib/domain/types";

// Extending a stay is a stakeholder sign-off, like approval: any one of the
// stakeholder roles, never a delegate (a delegation covers one engagement's
// approval, nothing after it) and never a read-only account.
export type StayExtensionActor = {
  systemRole: SystemRole;
  workflowRoles: WorkflowRole[];
  pinConfirmed: boolean;
};

export function stayExtensionRole(
  actor: StayExtensionActor,
): StakeholderRole | undefined {
  if (
    !actor.pinConfirmed ||
    actor.systemRole === "Guest" ||
    actor.systemRole === "User"
  ) {
    return undefined;
  }

  return STAKEHOLDER_ROLES.find((role) => actor.workflowRoles.includes(role));
}

// Approved means past Reception; Cancelled and Revoked are over for good.
// Expired access still qualifies — that is the usual reason to extend.
const EXTENDABLE_STATES: WorkflowState[] = [
  "AtHospital",
  "AtTraining",
  "AtSecurity",
  "Completed",
];

export function isStayExtendable(engagement: {
  workflowState: WorkflowState;
  accessState: AccessState;
}): boolean {
  return (
    EXTENDABLE_STATES.includes(engagement.workflowState) &&
    engagement.accessState !== "Terminated"
  );
}

export type StayExtensionInput = {
  newDepartureDate: string;
  reason: string;
  signature: string;
};

const signatureSchema = z.object({
  mode: z.enum(["draw", "upload", "type"]),
  value: z.string().trim().min(1),
});

const stayExtensionSchema = z.object({
  newDepartureDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the new departure date"),
  reason: z.string().trim().min(1, "A reason is required to extend a stay"),
  signature: z.string().min(1, "Capture a signature to extend the stay"),
});

// The new date must move the stay later, and can't already be over.
export function validateStayExtension(
  input: StayExtensionInput,
  currentDepartureDate: string,
): StayExtensionInput {
  const parsed = stayExtensionSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "Invalid stay extension",
    );
  }

  const { newDepartureDate } = parsed.data;

  if (newDepartureDate <= currentDepartureDate) {
    throw new Error(
      `The new departure date must be after the current one (${currentDepartureDate})`,
    );
  }

  if (newDepartureDate < isoToday()) {
    throw new Error("The new departure date cannot be in the past");
  }

  let captured: unknown;

  try {
    captured = JSON.parse(parsed.data.signature);
  } catch {
    throw new Error("Capture a signature to extend the stay");
  }

  if (!signatureSchema.safeParse(captured).success) {
    throw new Error("Capture a signature to extend the stay");
  }

  return { ...parsed.data, reason: parsed.data.reason.trim() };
}

// The earliest date the picker offers: the day after the current departure,
// or today if that has already passed.
export function earliestExtensionDate(currentDepartureDate: string): string {
  const next = new Date(`${currentDepartureDate}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const dayAfter = next.toISOString().slice(0, 10);
  const today = isoToday();

  return dayAfter > today ? dayAfter : today;
}

// How close a stay is to ending, for the approvals queue's Approved tab:
// red once the departure date has passed, yellow within the last week. Only
// shown where Extend Stay is available, so the dot always points at
// something the stakeholder can act on.
export const STAY_ENDING_WARNING_DAYS = 7;

export function stayEndAttention(
  departureDate: string,
  today: string = isoToday(),
): Attention | undefined {
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysLeft = Math.round(
    (Date.parse(`${departureDate}T00:00:00Z`) -
      Date.parse(`${today}T00:00:00Z`)) /
      msPerDay,
  );

  if (daysLeft < 0) {
    return danger(`Stay ended on ${departureDate}`);
  }

  if (daysLeft <= STAY_ENDING_WARNING_DAYS) {
    return warning(
      daysLeft === 0
        ? "Stay ends today"
        : `Stay ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
    );
  }

  return undefined;
}
