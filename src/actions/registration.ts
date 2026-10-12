"use server";

import { revalidatePath } from "next/cache";

import { requireWriteAccess } from "@/lib/auth/guards";
import { RegistrationError } from "@/lib/domain/registration-error";
import type { ActionResult } from "@/lib/domain/types";
import { sendEmail } from "@/lib/email/send";
import {
  departmentInvitationTemplate,
  registrationSubmittedTemplate,
} from "@/lib/email/templates";
import {
  issueInvitation,
  revokeInvitation,
} from "@/lib/services/invitation-service";
import {
  createRegistrationRequest,
  type LocalRegistrationFormInput,
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

    const { token, department } = await issueInvitation(
      session.staffUserId,
      email,
      registrationType,
    );

    const emailSent = await sendEmail({
      to: email,
      ...departmentInvitationTemplate({ token, department }),
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
    const { request, departmentHeads } = await createRegistrationRequest(
      token,
      formData,
    );

    let allEmailsSent = true;
    for (const head of departmentHeads) {
      const emailSent = await sendEmail({
        to: head.email,
        ...registrationSubmittedTemplate({ department: request.department }),
      });
      if (!emailSent) {
        allEmailsSent = false;
      }
    }

    return allEmailsSent
      ? { success: true }
      : {
          success: true,
          warning:
            "Submission received, but the Department Head may not have been notified by email",
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
