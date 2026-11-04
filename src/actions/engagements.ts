"use server";

import { revalidatePath } from "next/cache";

import { requirePinConfirmed, requireWriteAccess } from "@/lib/auth/guards";
import type { CardExpiryUpdateInput } from "@/lib/domain/card-expiry";
import type { StayExtensionInput } from "@/lib/domain/stay-extensions";
import {
  type ActionResult,
  HOSPITAL_CLEARANCE_LABELS,
} from "@/lib/domain/types";
import {
  canGrantWorkflowExemption,
  type WorkflowExemptionApprovalInput,
  workflowExemptionApprovalSchema,
} from "@/lib/domain/workflow-exemptions";
import { sendEmail } from "@/lib/email/send";
import {
  accessActivatedTemplate,
  accessRevokedTemplate,
  cardExpiryUpdatedTemplate,
  delegatedApprovalRequestedTemplate,
  hospitalClearedTemplate,
  hospitalFitWithConditionsTemplate,
  hospitalReviewTemplate,
  hospitalUnfitTemplate,
  hseRecordUpdateTemplate,
  inductionCompletedTemplate,
  type MedicalAudience,
  stakeholderApprovalReceivedTemplate,
  stakeholderApprovalRejectedTemplate,
  stakeholderApprovalRequestedTemplate,
  stakeholderExemptionApprovedTemplate,
  stayExtendedTemplate,
  terminationRequestedTemplate,
} from "@/lib/email/templates";
import type { StaffUser } from "@/lib/services/auth-service";
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
  applyStakeholderExemption,
  cancelEngagement,
  createEngagement,
  extendStay,
  getActiveEngagementForPassport,
  getEngagementDetail,
  type HospitalClearanceInput,
  type ReceptionFormInput,
  recordHospitalClearance,
  recordHospitalReview,
  recordInductionCompletion,
  rejectStakeholderApproval,
  requestDelegatedApproval,
  requestTermination,
  revokeAccess,
  type StakeholderApprovalResult,
  submitForStakeholderApproval,
  updateCardExpiry,
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

export async function applyStakeholderExemptionAction(
  engagementId: string,
  input: WorkflowExemptionApprovalInput,
): Promise<ActionResult> {
  let decision: StakeholderApprovalResult;

  try {
    const session = await requirePinConfirmed();

    if (!canGrantWorkflowExemption(session)) {
      return {
        success: false,
        error:
          "Only CSO, HCM, GMM or EM stakeholders with write access can grant exemptions",
      };
    }

    const parsed = workflowExemptionApprovalSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid exemption approval",
      };
    }

    decision = await applyStakeholderExemption(
      engagementId,
      session,
      parsed.data,
      session.staffUserId,
    );
  } catch (error) {
    console.error("[actions/engagements/exemption]", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to approve with exemption",
    };
  }

  // The decision has committed. Delivery or refresh failures must not invite a duplicate approval.
  const warnings: string[] = [];

  if (decision.recipients.length === 0) {
    warnings.push(
      "Approved with exemption, but no active Receptionist is provisioned, so Reception was not notified.",
    );
  } else if (!decision.exemptionMessage) {
    warnings.push(
      "Approved with exemption, but the Reception email could not be prepared.",
    );
  } else {
    let emailFailed = false;

    for (const recipient of decision.recipients) {
      try {
        const sent = await sendEmail({
          to: recipient.email,
          ...stakeholderExemptionApprovedTemplate(decision.exemptionMessage),
        });

        if (!sent) emailFailed = true;
      } catch (error) {
        console.error("[actions/engagements/exemption-email]", error);
        emailFailed = true;
      }
    }

    if (emailFailed)
      warnings.push(
        "Approved with exemption, but some Reception notification emails may not have sent.",
      );
  }

  let refreshFailed = false;

  for (const route of [
    "approvals",
    "reception",
    "hospital",
    "training",
    "security",
  ]) {
    try {
      revalidatePath(`/dashboard/${route}`);
      revalidatePath(`/dashboard/${route}/${engagementId}`);
    } catch (error) {
      console.error("[actions/engagements/exemption-refresh]", error);
      refreshFailed = true;
    }
  }

  try {
    revalidatePath("/dashboard", "layout");
  } catch (error) {
    console.error("[actions/engagements/exemption-refresh]", error);
    refreshFailed = true;
  }

  if (refreshFailed)
    warnings.push(
      "The approval is saved. Refresh the dashboard to see the latest status.",
    );

  return warnings.length
    ? { success: true, warning: warnings.join(" ") }
    : { success: true };
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
            engagementId,
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

// The warning a layer sees after recording its work: which audiences had
// nobody provisioned to tell, and which audiences' emails failed — named, so
// "nobody was notified" is never said when HSE (or anyone else) was. Reporting
// plain success here is how a record goes quiet in a queue nobody is watching.
function notificationResult(
  done: string,
  unprovisioned: string[],
  failedEmails: string[],
): ActionResult {
  const problems: string[] = [];

  if (unprovisioned.length > 0) {
    problems.push(
      `no ${unprovisioned.join(" or ")} user is provisioned, so they were not notified`,
    );
  }

  if (failedEmails.length > 0) {
    problems.push(`${failedEmails.join(" and ")} may not have been emailed`);
  }

  return problems.length > 0
    ? { success: true, warning: `${done}, but ${problems.join(", and ")}.` }
    : { success: true };
}

export async function submitHospitalClearanceAction(
  engagementId: string,
  input: HospitalClearanceInput,
): Promise<ActionResult> {
  try {
    const session = await requireWriteAccess("HospitalStaff");

    const {
      nextRecipients,
      nextRole,
      receptionRecipients,
      departmentHeads,
      hseRecipients,
      outcome,
    } = await recordHospitalClearance(engagementId, input, session.staffUserId);

    const detail = await getEngagementDetail(engagementId);

    const nextLabel =
      nextRole === "SecurityStaff" ? "Security" : "Training School";
    const failedEmails = new Set<string>();

    if (detail) {
      for (const recipient of nextRecipients) {
        const sent = await sendEmail({
          to: recipient.email,
          ...hospitalClearedTemplate({
            personName: detail.person.fullName,
            engagementId,
            nextRole: nextRole ?? "TrainingStaff",
          }),
        });
        if (!sent) failedEmails.add(nextLabel);
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
                nextRole: nextRole ?? "TrainingStaff",
              })),
        });

        if (!sent) failedEmails.add("Reception");
      }

      // The record's HOD gets Reception's wording, linked to their own
      // dashboard. Not required: a record keyed in directly may have none.
      for (const recipient of departmentHeads) {
        const sent = await sendEmail({
          to: recipient.email,
          ...(outcome === "Unfit"
            ? hospitalUnfitTemplate({
                personName: detail.person.fullName,
                engagementId,
                audience: "DepartmentHead",
              })
            : hospitalFitWithConditionsTemplate({
                personName: detail.person.fullName,
                engagementId,
                nextRole: nextRole ?? "TrainingStaff",
                audience: "DepartmentHead",
              })),
        });

        if (!sent) failedEmails.add("Department Head");
      }

      for (const recipient of hseRecipients) {
        const sent = await sendEmail({
          to: recipient.email,
          ...hseRecordUpdateTemplate({
            personName: detail.person.fullName,
            event: "MedicalClearance",
          }),
        });

        if (!sent) failedEmails.add("HSE");
      }
    }

    revalidatePath("/dashboard/hospital");
    revalidatePath(`/dashboard/hospital/${engagementId}`);
    // Refresh both possible destinations, including Security when Training is exempted.
    revalidatePath("/dashboard/training");
    revalidatePath("/dashboard/security");
    revalidatePath("/dashboard/reception");

    // Whoever should have been told but could not be. HSE is not required:
    // it follows records, and the record moves on without it.
    const unprovisioned: string[] = [];

    if (outcome === "Cleared" && nextRecipients.length === 0) {
      unprovisioned.push(nextLabel);
    }

    if (input.clearanceStatus !== "Fit" && receptionRecipients.length === 0) {
      unprovisioned.push("Reception");
    }

    return notificationResult("Clearance recorded", unprovisioned, [
      ...failedEmails,
    ]);
  } catch (error) {
    console.error("[actions/engagements]", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to record clearance",
    };
  }
}

// A review of a Fit with Conditions clearance from Hospital's recorded tab.
// The record's stage is untouched, so only Reception is told, and only when
// the review comes back Unfit.
export async function submitHospitalReviewAction(
  engagementId: string,
  reviewedClearanceId: string,
  input: HospitalClearanceInput,
): Promise<ActionResult> {
  try {
    const session = await requireWriteAccess("HospitalStaff");

    const {
      stageRole,
      stageRecipients,
      receptionRecipients,
      departmentHeads,
      hseRecipients,
    } = await recordHospitalReview(
      engagementId,
      reviewedClearanceId,
      input,
      session.staffUserId,
    );

    const detail = await getEngagementDetail(engagementId);
    const failedEmails = new Set<string>();
    const stageLabel =
      stageRole === "SecurityStaff" ? "Security" : "Training School";

    if (detail) {
      const review = {
        personName: detail.person.fullName,
        engagementId,
        outcomeLabel: HOSPITAL_CLEARANCE_LABELS[input.clearanceStatus],
        unfit: input.clearanceStatus === "Unfit",
      };
      const groups: [StaffUser[], MedicalAudience, string][] = [
        [stageRecipients, stageRole ?? "TrainingStaff", stageLabel],
        [receptionRecipients, "Receptionist", "Reception"],
        [departmentHeads, "DepartmentHead", "Department Head"],
      ];

      for (const [recipients, audience, label] of groups) {
        for (const recipient of recipients) {
          const sent = await sendEmail({
            to: recipient.email,
            ...hospitalReviewTemplate({ ...review, audience }),
          });

          if (!sent) failedEmails.add(label);
        }
      }

      for (const recipient of hseRecipients) {
        const sent = await sendEmail({
          to: recipient.email,
          ...hseRecordUpdateTemplate({
            personName: detail.person.fullName,
            event: "MedicalReview",
          }),
        });

        if (!sent) failedEmails.add("HSE");
      }
    }

    revalidatePath("/dashboard/hospital");
    revalidatePath(`/dashboard/hospital/${engagementId}`);
    revalidatePath("/dashboard/reception");

    // Reception is the one audience an Unfit or conditional review can't do
    // without — it is who follows them up.
    return notificationResult(
      "Review recorded",
      input.clearanceStatus !== "Fit" && receptionRecipients.length === 0
        ? ["Reception"]
        : [],
      [...failedEmails],
    );
  } catch (error) {
    console.error("[actions/engagements]", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to record review",
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

    const { recipients, hseRecipients } = await recordInductionCompletion(
      engagementId,
      input,
      session.staffUserId,
    );

    const detail = await getEngagementDetail(engagementId);

    const failedEmails = new Set<string>();

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
          failedEmails.add("Security");
        }
      }

      for (const recipient of hseRecipients) {
        const sent = await sendEmail({
          to: recipient.email,
          ...hseRecordUpdateTemplate({
            personName: detail.person.fullName,
            event: "InductionCompleted",
          }),
        });

        if (!sent) {
          failedEmails.add("HSE");
        }
      }
    }

    revalidatePath("/dashboard/training");
    revalidatePath(`/dashboard/training/${engagementId}`);

    return notificationResult(
      "Induction recorded",
      recipients.length === 0 ? ["Security"] : [],
      [...failedEmails],
    );
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
    comments: string;
  },
): Promise<ActionResult> {
  try {
    const session = await requireWriteAccess("SecurityStaff");

    const { recipients, hseRecipients } = await activateAccess(
      engagementId,
      input,
      session.staffUserId,
    );
    const detail = await getEngagementDetail(engagementId);

    const failedEmails = new Set<string>();

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

        if (!sent) failedEmails.add("Reception");
      }

      for (const recipient of hseRecipients) {
        const sent = await sendEmail({
          to: recipient.email,
          ...hseRecordUpdateTemplate({
            personName: detail.person.fullName,
            event: "AccessActivated",
          }),
        });

        if (!sent) failedEmails.add("HSE");
      }
    }

    revalidatePath("/dashboard/security");
    revalidatePath(`/dashboard/security/${engagementId}`);
    revalidatePath("/dashboard/reception");

    return notificationResult(
      "Access activated",
      recipients.length === 0 ? ["Reception"] : [],
      [...failedEmails],
    );
  } catch (error) {
    console.error("[actions/engagements]", error);

    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to activate access",
    };
  }
}

export async function extendStayAction(
  engagementId: string,
  input: StayExtensionInput,
): Promise<ActionResult> {
  try {
    const session = await requirePinConfirmed();

    const {
      extension,
      securityRecipients,
      receptionRecipients,
      departmentHeads,
      hseRecipients,
    } = await extendStay(engagementId, session, input);

    const detail = await getEngagementDetail(engagementId);
    const failedEmails = new Set<string>();

    if (detail) {
      const groups: [
        StaffUser[],
        "SecurityStaff" | "Receptionist" | "DepartmentHead" | "HSE",
        string,
      ][] = [
        [securityRecipients, "SecurityStaff", "Security"],
        [receptionRecipients, "Receptionist", "Reception"],
        [departmentHeads, "DepartmentHead", "Department Head"],
        [hseRecipients, "HSE", "HSE"],
      ];

      for (const [recipients, audience, label] of groups) {
        for (const recipient of recipients) {
          const sent = await sendEmail({
            to: recipient.email,
            ...stayExtendedTemplate({
              personName: detail.person.fullName,
              engagementId,
              previousDepartureDate: extension.previousDepartureDate,
              newDepartureDate: extension.newDepartureDate,
              extendedBy: extension.extendedByName,
              extendedByRole: extension.extendedByRole,
              audience,
            }),
          });

          if (!sent) failedEmails.add(label);
        }
      }
    }

    revalidatePath("/dashboard/approvals");
    revalidatePath(`/dashboard/approvals/${engagementId}`);
    revalidatePath("/dashboard/reception");
    revalidatePath(`/dashboard/reception/${engagementId}`);
    revalidatePath("/dashboard/security");
    revalidatePath(`/dashboard/security/${engagementId}`);

    // Security has to update the card, so it is the one audience this can't
    // go without.
    return notificationResult(
      "Stay extended",
      securityRecipients.length === 0 ? ["Security"] : [],
      [...failedEmails],
    );
  } catch (error) {
    console.error("[actions/engagements]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to extend stay",
    };
  }
}

export async function updateCardExpiryAction(
  engagementId: string,
  accessProvisioningId: string,
  input: CardExpiryUpdateInput,
): Promise<ActionResult> {
  try {
    const session = await requireWriteAccess("SecurityStaff");

    const { update, receptionRecipients, hseRecipients } =
      await updateCardExpiry(
        engagementId,
        accessProvisioningId,
        input,
        session.staffUserId,
      );

    const detail = await getEngagementDetail(engagementId);
    const failedEmails = new Set<string>();

    if (detail) {
      const groups: [StaffUser[], "Receptionist" | "HSE", string][] = [
        [receptionRecipients, "Receptionist", "Reception"],
        [hseRecipients, "HSE", "HSE"],
      ];

      for (const [recipients, audience, label] of groups) {
        for (const recipient of recipients) {
          const sent = await sendEmail({
            to: recipient.email,
            ...cardExpiryUpdatedTemplate({
              personName: detail.person.fullName,
              engagementId,
              previousExpiry: update.previousExpiry,
              newExpiry: update.newExpiry,
              audience,
            }),
          });

          if (!sent) failedEmails.add(label);
        }
      }
    }

    revalidatePath("/dashboard/security");
    revalidatePath(`/dashboard/security/${engagementId}`);
    revalidatePath("/dashboard/reception");
    revalidatePath("/dashboard/overview");

    return notificationResult("Card expiry updated", [], [...failedEmails]);
  } catch (error) {
    console.error("[actions/engagements]", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update card expiry",
    };
  }
}
