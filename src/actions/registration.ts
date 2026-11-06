"use server";

import { revalidatePath } from "next/cache";

import { requireWriteAccess } from "@/lib/auth/guards";
import { RegistrationError } from "@/lib/domain/registration-error";
import type { ActionResult } from "@/lib/domain/types";
import { sendEmail } from "@/lib/email/send";
import {
  departmentInvitationTemplate,
  registrationRejectedTemplate,
  registrationSubmittedTemplate,
} from "@/lib/email/templates";
import {
  getInvitationEmail,
  issueInvitation,
  revokeInvitation,
} from "@/lib/services/invitation-service";
import {
  approveRegistrationRequest,
  createRegistrationRequest,
  type LocalRegistrationFormInput,
  rejectRegistrationRequest,
} from "@/lib/services/registration-service";
import type { ReceptionFormInput } from "@/lib/services/workflow-service";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function issueInvitationAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await requireWriteAccess("DepartmentHead");

    const email = formData.get("email");
    if (typeof email !== "string" || !EMAIL_PATTERN.test(email)) {
      return { success: false, error: "Enter a valid email address" };
    }

    const registrationType = formData.get("registrationType");
    if (registrationType !== "Local" && registrationType !== "Foreign") {
      return { success: false, error: "Select a registration type" };
    }

    const { token } = await issueInvitation(
      session.staffUserId,
      email,
      registrationType,
    );

    const emailSent = await sendEmail({
      to: email,
      ...departmentInvitationTemplate({ token }),
    });

    revalidatePath("/dashboard/department");
    return emailSent
      ? { success: true }
      : {
          success: true,
          warning: "Invitation created, but the email failed to send",
        };
  } catch (error) {
    console.error("[actions/registration]", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to send invitation",
    };
  }
}

export async function submitRegistrationRequestAction(
  token: string,
  formData: ReceptionFormInput | LocalRegistrationFormInput,
): Promise<ActionResult> {
  try {
    const { request, departmentHeads, visitorName } =
      await createRegistrationRequest(token, formData);

    // A visitor must never be shown GMC's internal staffing problems, so this
    // is logged rather than returned as a warning — but it still must not pass
    // silently: with no Department Head to approve it, a submission goes
    // nowhere.
    if (departmentHeads.length === 0) {
      console.error(
        "[actions/registration] submission has no Department Head to approve it:",
        { department: request.department },
      );
    }

    // Only the Department Head for now: Reception is mailed when the Head
    // approves. Sent in parallel: a visitor is waiting on this response, and
    // one slow mailbox shouldn't hold up the rest.
    const results = await Promise.all(
      departmentHeads.map((head) =>
        sendEmail({
          to: head.email,
          ...registrationSubmittedTemplate({
            visitorName,
            audience: "DepartmentHead",
          }),
        }),
      ),
    );

    const allEmailsSent = results.every(Boolean);

    return allEmailsSent
      ? { success: true }
      : {
          success: true,
          warning:
            "Submission received, but GMC staff may not have been notified by email",
        };
  } catch (error) {
    console.error("[actions/registration]", error);

    if (error instanceof RegistrationError) {
      return {
        success: false,
        error: error.message,
        errorCode: error.code,
        missingDocTypes: error.missingDocTypes,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to submit form",
      errorCode: "submit_failed",
    };
  }
}

export async function revokeInvitationAction(
  invitationId: string,
): Promise<ActionResult> {
  try {
    const session = await requireWriteAccess("DepartmentHead");

    const revoked = await revokeInvitation(invitationId, session.staffUserId);
    if (!revoked) {
      return { success: false, error: "Invitation not found" };
    }

    revalidatePath("/dashboard/department");
    return { success: true };
  } catch (error) {
    console.error("[actions/registration]", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to revoke invitation",
    };
  }
}

export async function approveRegistrationRequestAction(
  requestId: string,
): Promise<ActionResult> {
  try {
    const session = await requireWriteAccess("DepartmentHead");

    const { request, receptionists, visitorName } =
      await approveRegistrationRequest(requestId, session.staffUserId);

    if (receptionists.length === 0) {
      console.error(
        "[actions/registration] approved submission has no Receptionist to notify:",
        { requestId: request.id },
      );
    }

    // SAFETY: `form_data` is jsonb written only by `createRegistrationRequest`;
    // both payload shapes carry `companyName` under their own key.
    const submitted = request.formData as {
      receptionData?: { companyName?: string };
      registrationData?: { companyName?: string };
    };
    const companyName =
      submitted.receptionData?.companyName ??
      submitted.registrationData?.companyName;

    const results = await Promise.all(
      receptionists.map((receptionist) =>
        sendEmail({
          to: receptionist.email,
          ...registrationSubmittedTemplate({
            visitorName,
            companyName,
            audience: "Receptionist",
          }),
        }),
      ),
    );

    revalidatePath("/dashboard/department");
    revalidatePath("/dashboard/reception");
    return results.every(Boolean)
      ? { success: true }
      : {
          success: true,
          warning:
            "Approved, but Reception may not have been notified by email",
        };
  } catch (error) {
    console.error("[actions/registration]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to approve",
    };
  }
}

export async function rejectRegistrationRequestAction(
  requestId: string,
  reason: string,
): Promise<ActionResult> {
  try {
    const session = await requireWriteAccess("DepartmentHead");

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      return { success: false, error: "Reason is required" };
    }

    const request = await rejectRegistrationRequest(
      requestId,
      session.staffUserId,
      trimmedReason,
    );

    revalidatePath("/dashboard/department");

    // Rejection is already saved. A notification failure must not report that
    // the decision failed or encourage a retry of a final decision.
    let emailSent = false;

    try {
      const recipient = await getInvitationEmail(request.invitationId);

      if (recipient) {
        emailSent = await sendEmail({
          to: recipient,
          ...registrationRejectedTemplate({
            department: request.department,
            reason: trimmedReason,
          }),
        });
      }
    } catch (error) {
      console.error("[actions/registration] rejection email", error);
    }

    return emailSent
      ? { success: true }
      : {
          success: true,
          warning:
            "Registration rejected, but the invitation recipient could not be notified by email",
        };
  } catch (error) {
    console.error("[actions/registration]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reject",
    };
  }
}
