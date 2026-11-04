import { z } from "zod";
import {
  type AccessPurpose,
  type SystemRole,
  WORKFLOW_EXEMPTION_STAGE_LABELS,
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

export function workflowExemptionNotification(
  message: WorkflowExemptionMessage,
): string {
  const stages = message.stages
    .map((stage) => WORKFLOW_EXEMPTION_STAGE_LABELS[stage])
    .join(", ");

  return `Workflow exemption approved for ${message.personName} (${message.passportNo}). Exempted: ${stages}. Approved by ${message.approverName} (${message.approverRole}) at ${message.approvedAt.toISOString()}. Comment: ${message.reason}. Next stage: ${workflowExemptionNextStageLabel(message.nextState)}.`;
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

  const required = requiredWorkflowStages(purpose);

  if (parsed.data.stages.some((stage) => !required.includes(stage))) {
    throw new Error("Only stages required for this engagement can be exempted");
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
