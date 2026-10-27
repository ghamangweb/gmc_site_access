"use server";

import { revalidatePath } from "next/cache";

import { requirePinConfirmed, requireWriteAccess } from "@/lib/auth/guards";
import type { ActionResult, HospitalClearanceStatus } from "@/lib/domain/types";
import { sendEmail } from "@/lib/email/send";
import {
  accessActivatedTemplate,
  accessRevokedTemplate,
  delegatedApprovalRequestedTemplate,
  hospitalClearedTemplate,
  hospitalFitWithConditionsTemplate,
  hospitalUnfitTemplate,
  inductionCompletedTemplate,
  stakeholderApprovalReceivedTemplate,
  stakeholderApprovalRejectedTemplate,
  stakeholderApprovalRequestedTemplate,
  terminationRequestedTemplate,
} from "@/lib/email/templates";
import { findPersonByPassport } from "@/lib/services/person-registry-service";
import {
  buildEngagementInput,
  getRegistrationRequest,
  linkRequestToEngagement,
  type RegistrationCompletion,
} from "@/lib/services/registration-service";
import {
  activateAccess,
  applyStakeholderApproval,
  cancelEngagement,
  createEngagement,
  getActiveEngagementForPassport,
  getEngagementDetail,
  type ReceptionFormInput,
  recordHospitalClearance,
  recordInductionCompletion,
  rejectStakeholderApproval,
  requestDelegatedApproval,
  requestTermination,
  revokeAccess,
  submitForStakeholderApproval,
  updateReceptionData,
} from "@/lib/services/workflow-service";

export type PassportLookupResult = {
  person: {
    fullName: string;
    dateOfBirth: string;
    gender: string;
    nationality: string;
    email: string;
    phone: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
  };
  activeEngagementId: string | null;
};

export async function lookupPersonByPassportAction(
  passportNo: string,
): Promise<PassportLookupResult | null> {
  try {
    await requireWriteAccess("Receptionist");
    const person = await findPersonByPassport(passportNo);
    if (!person) {
      return null;
    }
    const active = await getActiveEngagementForPassport(passportNo);
    return {
      person: {
        fullName: person.fullName,
        dateOfBirth: person.dateOfBirth,
        gender: person.gender,
        nationality: person.nationality,
        email: person.email ?? "",
        phone: person.phone,
        emergencyContactName: person.emergencyContactName,
        emergencyContactPhone: person.emergencyContactPhone,
      },
      activeEngagementId: active?.engagementId ?? null,
    };
  } catch (error) {
    console.error("[actions/engagements]", error);
    return null;
  }
}

export async function submitReceptionAction(
  payload: ReceptionFormInput,
  registrationRequestId?: string,
): Promise<
  | { success: true; engagementId: string; warning?: string }
  | { success: false; error: string }
> {
  try {
    const session = await requireWriteAccess("Receptionist");
    const engagement = await createEngagement(payload, session.staffUserId);

    // Marks the visitor's submission as converted. Scoped to still-unlinked
    // rows in the service, so a second submit can't repoint it.
    if (registrationRequestId) {
      await linkRequestToEngagement(registrationRequestId, engagement.id);
    }

    revalidatePath("/dashboard/reception");
    return { success: true, engagementId: engagement.id };
  } catch (error) {
    console.error("[actions/engagements]", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create engagement",
    };
  }
}

// The preview path: Reception confirms a submission and supplies only what
// the visitor was never asked. The visitor's own answers are read from the
// stored row inside `buildEngagementInput`, never sent from the browser.
export async function createEngagementFromRequestAction(
  registrationRequestId: string,
  completion: RegistrationCompletion,
): Promise<
  | { success: true; engagementId: string; warning?: string }
  | { success: false; error: string }
> {
  try {
    const session = await requireWriteAccess("Receptionist");

    const request = await getRegistrationRequest(registrationRequestId);
    if (!request) {
      return { success: false, error: "Submission not found" };
    }

    if (request.engagementId) {
      return {
        success: false,
        error: "This submission has already been turned into an engagement",
      };
    }

    const engagement = await createEngagement(
      buildEngagementInput(request, completion),
      session.staffUserId,
    );

    await linkRequestToEngagement(registrationRequestId, engagement.id);

    revalidatePath("/dashboard/reception");
    return { success: true, engagementId: engagement.id };
  } catch (error) {
    console.error("[actions/engagements]", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create engagement",
    };
  }
}

export async function updateReceptionDataAction(
  engagementId: string,
  payload: ReceptionFormInput,
): Promise<ActionResult> {
  try {
    await requireWriteAccess("Receptionist");
    await updateReceptionData(engagementId, payload);
    revalidatePath(`/dashboard/reception/${engagementId}`);
    return { success: true };
  } catch (error) {
    console.error("[actions/engagements]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save changes",
    };
  }
}

export async function cancelEngagementAction(
  engagementId: string,
): Promise<ActionResult> {
  try {
    const session = await requireWriteAccess("Receptionist");
    await cancelEngagement(engagementId, session.staffUserId);
    revalidatePath("/dashboard/reception");
    revalidatePath("/dashboard/approvals");
    revalidatePath(`/dashboard/reception/${engagementId}`);
    return { success: true };
  } catch (error) {
    console.error("[actions/engagements]", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to cancel engagement",
    };
  }
}

export async function requestStakeholderApprovalAction(
  engagementId: string,
): Promise<ActionResult> {
  try {
    await requireWriteAccess("Receptionist");
    const { recipients } = await submitForStakeholderApproval(engagementId);
    const detail = await getEngagementDetail(engagementId);

    let allSent = true;
    if (detail) {
      for (const recipient of recipients) {
        const sent = await sendEmail({
          to: recipient.email,
          ...stakeholderApprovalRequestedTemplate({
            personName: detail.person.fullName,
            engagementId,
          }),
        });
        if (!sent) allSent = false;
      }
    }

    revalidatePath(`/dashboard/reception/${engagementId}`);
    revalidatePath("/dashboard/approvals");

    // Nobody holding CSO/HCM/GMM/EM means the request reached no one and the
    // engagement now sits in a queue with no audience. That has to be said
    // out loud — reporting plain success here is how a record gets lost.
    if (recipients.length === 0) {
      return {
        success: true,
        warning:
          "Approval requested, but no CSO, HCM, GMM or EM user is provisioned, so nobody was notified. Ask a System Administrator to assign a stakeholder role.",
      };
    }

    return allSent
      ? { success: true }
      : {
          success: true,
          warning:
            "Approval requested, but some notification emails may not have sent",
        };
  } catch (error) {
    console.error("[actions/engagements]", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to request approval",
    };
  }
}

export async function applyStakeholderApprovalAction(
  engagementId: string,
  input: {
    signature: string;
  },
): Promise<ActionResult> {
  try {
    const session = await requirePinConfirmed();
    if (session.systemRole === "Guest") {
      return { success: false, error: "Read-only access: cannot approve" };
    }

    const { recipients, nextRole } = await applyStakeholderApproval(
      engagementId,
      session,
      input,
      session.staffUserId,
    );
    const detail = await getEngagementDetail(engagementId);

    let allSent = true;
    if (detail && nextRole) {
      for (const recipient of recipients) {
        const sent = await sendEmail({
          to: recipient.email,
          ...stakeholderApprovalReceivedTemplate({
            personName: detail.person.fullName,
            engagementId,
            nextRole,
          }),
        });
        if (!sent) allSent = false;
      }
    }

    // Both routes onto the record, and both queues it moves between: the
    // approver lands on /dashboard/approvals immediately after this returns.
    revalidatePath("/dashboard/approvals");
    revalidatePath(`/dashboard/approvals/${engagementId}`);
    revalidatePath("/dashboard/reception");
    revalidatePath(`/dashboard/reception/${engagementId}`);
    return allSent
      ? { success: true }
      : {
          success: true,
          warning: "Approved, but some notification emails may not have sent",
        };
  } catch (error) {
    console.error("[actions/engagements]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to approve",
    };
  }
}

export async function rejectStakeholderApprovalAction(
  engagementId: string,
  reason: string,
): Promise<ActionResult> {
  try {
    const session = await requirePinConfirmed();
    if (session.systemRole === "Guest") {
      return { success: false, error: "Read-only access: cannot reject" };
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      return { success: false, error: "Reason is required" };
    }

    const { rejection, receptionists, departmentHead } =
      await rejectStakeholderApproval(engagementId, session, trimmedReason);
    const detail = await getEngagementDetail(engagementId);

    const recipients = [
      ...receptionists
        .filter((user) => user.id !== departmentHead?.id)
        .map((user) => ({ user, audience: "Receptionist" as const })),
      ...(departmentHead
        ? [{ user: departmentHead, audience: "DepartmentHead" as const }]
        : []),
    ];

    let allSent = true;
    if (detail) {
      for (const { user, audience } of recipients) {
        const sent = await sendEmail({
          to: user.email,
          ...stakeholderApprovalRejectedTemplate({
            personName: detail.person.fullName,
            rejectedBy: rejection.approverName,
            approverRole: rejection.approverRole,
            reason: trimmedReason,
            audience,
          }),
        });
        if (!sent) allSent = false;
      }
    }

    revalidatePath("/dashboard/approvals");
    revalidatePath(`/dashboard/approvals/${engagementId}`);
    revalidatePath("/dashboard/reception");
    revalidatePath(`/dashboard/reception/${engagementId}`);

    if (receptionists.length === 0) {
      return {
        success: true,
        warning:
          "Rejected, but no Receptionist is provisioned, so Reception was not notified.",
      };
    }

    return allSent
      ? { success: true }
      : {
          success: true,
          warning: "Rejected, but some notification emails may not have sent",
        };
  } catch (error) {
    console.error("[actions/engagements]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reject",
    };
  }
}

export async function requestDelegatedApprovalAction(
  engagementId: string,
  reason: string,
): Promise<ActionResult> {
  try {
    const session = await requireWriteAccess("Receptionist");
    if (!reason) {
      return { success: false, error: "Reason is required" };
    }

    const { recipients } = await requestDelegatedApproval(engagementId, reason);
    const detail = await getEngagementDetail(engagementId);

    let allSent = true;
    if (detail) {
      for (const recipient of recipients) {
        const sent = await sendEmail({
          to: recipient.email,
          ...delegatedApprovalRequestedTemplate({
            personName: detail.person.fullName,
            receptionistName:
              session.displayName ?? session.email ?? "A receptionist",
          }),
        });
        if (!sent) allSent = false;
      }
    }

    revalidatePath(`/dashboard/reception/${engagementId}`);
    return allSent
      ? { success: true }
      : {
          success: true,
          warning: "Requested, but some notification emails may not have sent",
        };
  } catch (error) {
    console.error("[actions/engagements]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to request delegated approval",
    };
  }
}

export async function submitHospitalClearanceAction(
  engagementId: string,
  input: {
    clearanceStatus: HospitalClearanceStatus;
    doctorComments: string;
  },
): Promise<ActionResult> {
  try {
    const session = await requireWriteAccess("HospitalStaff");
    const { trainingRecipients, receptionRecipients, outcome } =
      await recordHospitalClearance(engagementId, input, session.staffUserId);
    const detail = await getEngagementDetail(engagementId);

    let allSent = true;
    if (detail) {
      for (const recipient of trainingRecipients) {
        const sent = await sendEmail({
          to: recipient.email,
          ...hospitalClearedTemplate({
            personName: detail.person.fullName,
            engagementId,
          }),
        });
        if (!sent) allSent = false;
      }

      // Reception hears about a conditional clearance as well as an Unfit
      // one — the record moved on, but the conditions are theirs to manage.
      for (const recipient of receptionRecipients) {
        const sent = await sendEmail({
          to: recipient.email,
          ...(outcome === "Unfit"
            ? hospitalUnfitTemplate({
                personName: detail.person.fullName,
                engagementId,
              })
            : hospitalFitWithConditionsTemplate({
                personName: detail.person.fullName,
                engagementId,
                doctorComments: input.doctorComments.trim(),
              })),
        });

        if (!sent) allSent = false;
      }
    }

    revalidatePath("/dashboard/hospital");
    revalidatePath(`/dashboard/hospital/${engagementId}`);
    // The record lands in Training's queue and, when Reception is told, on
    // their dashboard too.
    revalidatePath("/dashboard/training");
    revalidatePath("/dashboard/reception");

    // Whoever should have been told but could not be. Reporting plain success
    // here is how a record goes quiet in a queue nobody is watching.
    const unreachable: string[] = [];

    if (outcome === "Cleared" && trainingRecipients.length === 0) {
      unreachable.push("no Training School user is provisioned");
    }

    if (input.clearanceStatus !== "Fit" && receptionRecipients.length === 0) {
      unreachable.push("no Receptionist is provisioned");
    }

    if (unreachable.length > 0) {
      return {
        success: true,
        warning: `Clearance recorded, but ${unreachable.join(" and ")}, so nobody was notified.`,
      };
    }
    return allSent
      ? { success: true }
      : {
          success: true,
          warning:
            "Clearance recorded, but some notification emails may not have sent",
        };
  } catch (error) {
    console.error("[actions/engagements]", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to record clearance",
    };
  }
}

export async function submitTrainingCompletionAction(
  engagementId: string,
  input: {
    generalSiteInduction: boolean;
    otherInductions: boolean;
    trainerComments: string;
  },
): Promise<ActionResult> {
  try {
    const session = await requireWriteAccess("TrainingStaff");

    const { recipients } = await recordInductionCompletion(
      engagementId,
      input,
      session.staffUserId,
    );

    const detail = await getEngagementDetail(engagementId);

    let allSent = true;

    if (detail) {
      for (const recipient of recipients) {
        const sent = await sendEmail({
          to: recipient.email,
          ...inductionCompletedTemplate({
            personName: detail.person.fullName,
            engagementId,
          }),
        });

        if (!sent) {
          allSent = false;
        }
      }
    }

    revalidatePath("/dashboard/training");
    revalidatePath(`/dashboard/training/${engagementId}`);

    if (recipients.length === 0) {
      return {
        success: true,
        warning:
          "Induction recorded, but no Security user is provisioned, so nobody was notified.",
      };
    }

    return allSent
      ? { success: true }
      : {
          success: true,
          warning: "Induction recorded, but Security may not have been emailed",
        };
  } catch (error) {
    console.error("[actions/engagements]", error);

    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to record induction",
    };
  }
}

export async function requestTerminationAction(
  engagementId: string,
  reason: string,
): Promise<ActionResult> {
  try {
    const session = await requireWriteAccess("Receptionist");
    if (!reason) {
      return { success: false, error: "Reason is required" };
    }

    const { recipients } = await requestTermination(
      engagementId,
      session.staffUserId,
      reason,
    );
    const detail = await getEngagementDetail(engagementId);

    let allSent = true;
    if (detail) {
      for (const recipient of recipients) {
        const sent = await sendEmail({
          to: recipient.email,
          ...terminationRequestedTemplate({
            personName: detail.person.fullName,
            reason,
          }),
        });
        if (!sent) allSent = false;
      }
    }

    revalidatePath("/dashboard/reception");
    revalidatePath(`/dashboard/reception/${engagementId}`);
    revalidatePath("/dashboard/security");

    if (recipients.length === 0) {
      return {
        success: true,
        warning:
          "Revocation requested, but no Security user is provisioned, so nobody was notified.",
      };
    }

    return allSent
      ? { success: true }
      : {
          success: true,
          warning:
            "Revocation requested, but some notification emails may not have sent",
        };
  } catch (error) {
    console.error("[actions/engagements]", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to request revocation",
    };
  }
}

export async function revokeAccessAction(
  engagementId: string,
): Promise<ActionResult> {
  try {
    const session = await requireWriteAccess("SecurityStaff");

    const { recipients } = await revokeAccess(
      engagementId,
      session.staffUserId,
    );
    const detail = await getEngagementDetail(engagementId);

    let allSent = true;

    if (detail) {
      for (const recipient of recipients) {
        const sent = await sendEmail({
          to: recipient.email,
          ...accessRevokedTemplate({
            personName: detail.person.fullName,
            engagementId,
          }),
        });

        if (!sent) allSent = false;
      }
    }

    revalidatePath("/dashboard/security");
    revalidatePath(`/dashboard/security/${engagementId}`);
    revalidatePath("/dashboard/reception");
    revalidatePath(`/dashboard/reception/${engagementId}`);

    if (recipients.length === 0) {
      return {
        success: true,
        warning:
          "Access revoked, but no Receptionist is provisioned, so nobody was notified.",
      };
    }

    return allSent
      ? { success: true }
      : {
          success: true,
          warning: "Access revoked, but some emails may not have sent",
        };
  } catch (error) {
    console.error("[actions/engagements]", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to revoke access",
    };
  }
}

export async function activateAccessAction(
  engagementId: string,
  input: {
    idType: string;
    biometricCaptured: boolean;
    accessCardNumber: string;
    accessCardExpiry: string;
  },
): Promise<ActionResult> {
  try {
    const session = await requireWriteAccess("SecurityStaff");

    const { recipients } = await activateAccess(
      engagementId,
      input,
      session.staffUserId,
    );
    const detail = await getEngagementDetail(engagementId);

    let allSent = true;

    if (detail) {
      for (const recipient of recipients) {
        const sent = await sendEmail({
          to: recipient.email,
          ...accessActivatedTemplate({
            personName: detail.person.fullName,
            accessCardNumber: input.accessCardNumber,
            accessCardExpiry: input.accessCardExpiry,
            engagementId,
          }),
        });

        if (!sent) allSent = false;
      }
    }

    revalidatePath("/dashboard/security");
    revalidatePath(`/dashboard/security/${engagementId}`);
    revalidatePath("/dashboard/reception");

    if (recipients.length === 0) {
      return {
        success: true,
        warning:
          "Access activated, but no Receptionist is provisioned, so nobody was notified.",
      };
    }

    return allSent
      ? { success: true }
      : {
          success: true,
          warning: "Access activated, but some emails may not have sent",
        };
  } catch (error) {
    console.error("[actions/engagements]", error);

    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to activate access",
    };
  }
}
