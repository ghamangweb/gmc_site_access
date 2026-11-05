import { z } from "zod";
import { notice } from "@/lib/domain/notification-messages";
import {
  type AccessPurpose,
  type SystemRole,
  WORKFLOW_EXEMPTION_STAGES,
  WORKFLOW_STATE_LABELS,
  type WorkflowExemptionInput,
  type WorkflowExemptionStage,
  type WorkflowRole,
  type WorkflowState,
} from "@/lib/domain/types";

export const EXEMPTION_APPROVER_ROLES = ["CSO", "HCM", "GMM", "EM"] as const;

export type ExemptionActor = {
  systemRole: SystemRole;
  workflowRoles: WorkflowRole[];
  pinConfirmed: boolean;
};

export type WorkflowDestination = {
  nextState: WorkflowState;
  nextRole: WorkflowRole | null;
};

export type WorkflowExemptionMessage = {
  engagementId: string;
  personName: string;
  passportNo: string;
  stages: WorkflowExemptionStage[];
  reason: string;
  approverName: string;
  approverRole: string;
  approvedAt: Date;
  nextState: WorkflowState;
};

export function workflowExemptionNextStageLabel(state: WorkflowState): string {
  return state === "AtTraining"
    ? "Training School"
    : WORKFLOW_STATE_LABELS[state];
}

// The bell notice (wording agreed 2026-11-05). The approver, comment and next
// stage are on the record and in the email, not here.
export function workflowExemptionNotification(
  message: WorkflowExemptionMessage,
): string {
  return notice.approvedWithExemption(message.personName, message.stages);
}

export const workflowExemptionSchema = z.object({
  stages: z
    .array(z.enum(WORKFLOW_EXEMPTION_STAGES))
    .min(1, "Select at least one stage to exempt")
    .max(2)
    .refine(
      (stages) => new Set(stages).size === stages.length,
      "Each stage can be exempted only once",
    ),
  reason: z.string().trim().min(1, "A reason is required for an exemption"),
});

export type WorkflowExemptionApprovalInput = {
  signature: string;
  exemption: WorkflowExemptionInput;
};

export const workflowExemptionApprovalSchema = z.object({
  signature: z
    .string()
    .min(1, "Capture a signature before granting an exemption"),
  exemption: workflowExemptionSchema,
});

const signatureSchema = z.object({
  mode: z.enum(["draw", "upload", "type"]),
  value: z.string().trim().min(1),
});

export function canGrantWorkflowExemption(actor: ExemptionActor): boolean {
  return (
    actor.pinConfirmed &&
    actor.systemRole !== "Guest" &&
    actor.systemRole !== "User" &&
    EXEMPTION_APPROVER_ROLES.some((role) => actor.workflowRoles.includes(role))
  );
}

export function requiredWorkflowStages(
  purpose: AccessPurpose,
): WorkflowExemptionStage[] {
  switch (purpose) {
    case "Work":
    case "WorkMine":
      return ["Hospital", "Training"];
    case "VisitMine":
      return ["Training"];
    case "Visit":
      return [];
  }
}

// What a stakeholder can by-pass: Hospital only (2026-11-05), so only the
// paths that go through Hospital — work access — offer a Medical By-pass.
// `requiredWorkflowStages` stays the routing truth; Training exemptions
// already recorded remain valid history.
export function exemptableStages(
  purpose: AccessPurpose,
): WorkflowExemptionStage[] {
  return requiredWorkflowStages(purpose).filter(
    (stage) => stage === "Hospital",
  );
}

export function validateWorkflowExemption(
  input: WorkflowExemptionInput,
  purpose: AccessPurpose,
  actor: ExemptionActor,
  signature: string,
): WorkflowExemptionInput {
  if (!canGrantWorkflowExemption(actor)) {
    throw new Error(
      "Only CSO, HCM, GMM or EM stakeholders with write access can grant exemptions",
    );
  }

  const parsed = workflowExemptionSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid exemption");
  }

  const exemptable = exemptableStages(purpose);

  if (parsed.data.stages.some((stage) => !exemptable.includes(stage))) {
    throw new Error("Only the Hospital stage can be by-passed");
  }

  let capturedSignature: unknown;

  try {
    capturedSignature = JSON.parse(signature);
  } catch {
    throw new Error("Capture a signature before granting an exemption");
  }

  if (!signatureSchema.safeParse(capturedSignature).success) {
    throw new Error("Capture a signature before granting an exemption");
  }

  return parsed.data;
}

export function approvalDestination(
  purpose: AccessPurpose,
  exempted: readonly WorkflowExemptionStage[] = [],
): WorkflowDestination {
  if (purpose === "Visit") return { nextState: "Completed", nextRole: null };

  const remaining = requiredWorkflowStages(purpose).filter(
    (stage) => !exempted.includes(stage),
  );

  if (remaining[0] === "Hospital")
    return { nextState: "AtHospital", nextRole: "HospitalStaff" };

  if (remaining[0] === "Training")
    return { nextState: "AtTraining", nextRole: "TrainingStaff" };

  return { nextState: "AtSecurity", nextRole: "SecurityStaff" };
}

export type HospitalDestination = {
  nextState: "AtTraining" | "AtSecurity";
  nextRole: "TrainingStaff" | "SecurityStaff";
};

export function hospitalDestination(
  exempted: readonly WorkflowExemptionStage[],
): HospitalDestination {
  return exempted.includes("Training")
    ? { nextState: "AtSecurity", nextRole: "SecurityStaff" }
    : { nextState: "AtTraining", nextRole: "TrainingStaff" };
}
