"use server";

import { unstable_update } from "@/lib/auth/entra";
import {
  clearLockout,
  handleFailedAttempt,
  hashPin,
  isLocked,
  setPinHash,
  validatePin,
  verifyPin,
} from "@/lib/auth/pin";
import { getSession } from "@/lib/auth/session";
import {
  type ActionResult,
  GMC_LIAISON_DEPARTMENTS,
  type SystemRole,
  type WorkflowRole,
} from "@/lib/domain/types";
import { sendEmail } from "@/lib/email/send";
import { accessRequestedTemplate } from "@/lib/email/templates";
import {
  findPendingAccessRequest,
  getStaffUserById,
  requestAccess,
} from "@/lib/services/auth-service";

export async function requestAccessAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await getSession();
    if (!session) {
      return {
        success: false,
        error: "You must be signed in to request access",
      };
    }

    const requestedRole = formData.get("requestedRole");
    if (typeof requestedRole !== "string" || !requestedRole) {
      return { success: false, error: "Select a role to request" };
    }

    let requestedDepartment: string | undefined;
    if (requestedRole === "DepartmentHead") {
      const department = formData.get("requestedDepartment");
      if (
        typeof department !== "string" ||
        !GMC_LIAISON_DEPARTMENTS.includes(
          department as (typeof GMC_LIAISON_DEPARTMENTS)[number],
        )
      ) {
        return { success: false, error: "Select a department" };
      }
      requestedDepartment = department;
    }

    const requester = await getStaffUserById(session.staffUserId);
    if (!requester) {
      return { success: false, error: "Account not found" };
    }

    const existingRequest = await findPendingAccessRequest(requester.id);
    if (existingRequest) {
      return { success: false, error: "Your request is already pending" };
    }

    const { admins } = await requestAccess(
      requester,
      requestedRole,
      requestedDepartment,
    );

    let allEmailsSent = true;
    for (const admin of admins) {
      const emailSent = await sendEmail({
        to: admin.email,
        ...accessRequestedTemplate({
          requesterName: requester.displayName,
          requesterEmail: requester.email,
          requestedRole,
          department: requestedDepartment,
        }),
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
            "Request submitted, but some System Admins may not have been notified by email",
        };
  } catch (error) {
    console.error("[actions/auth]", error);
    return { success: false, error: "Failed to submit access request" };
  }
}

export async function verifyPinAction(pin: string): Promise<ActionResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Not signed in" };
    }

    const user = await getStaffUserById(session.staffUserId);
    if (!user) {
      return { success: false, error: "Account not found" };
    }

    if (isLocked(user)) {
      const minutesLeft = Math.ceil(
        ((user.pinLockedUntil as Date).getTime() - Date.now()) / 60_000,
      );
      return {
        success: false,
        error: `Too many attempts. Try again in ${minutesLeft} minute(s).`,
      };
    }

    if (!user.pinHash) {
      return { success: false, error: "PIN not set up" };
    }

    const isValid = await verifyPin(pin, user.pinHash);
    if (!isValid) {
      const { locked, attemptsRemaining } = await handleFailedAttempt(user.id);
      if (locked) {
        return {
          success: false,
          error: "Too many attempts. Locked for 15 minutes.",
        };
      }
      return {
        success: false,
        error: `Incorrect PIN. ${attemptsRemaining} attempt(s) remaining.`,
      };
    }

    await clearLockout(user.id);
    await unstable_update({ user: { pinConfirmed: true } });

    return { success: true };
  } catch (error) {
    console.error("[actions/auth]", error);
    return { success: false, error: "Failed to verify PIN" };
  }
}

export async function setupPinAction(
  pin: string,
  confirmPin: string,
): Promise<ActionResult> {
  try {
    if (pin !== confirmPin) {
      return { success: false, error: "PINs do not match" };
    }

    const { valid, reason } = validatePin(pin);
    if (!valid) {
      return { success: false, error: reason ?? "Invalid PIN" };
    }

    const session = await getSession();
    if (!session) {
      return { success: false, error: "Not signed in" };
    }

    const pinHash = await hashPin(pin);
    await setPinHash(session.staffUserId, pinHash);
    await unstable_update({ user: { pinConfirmed: true, hasPinSet: true } });

    return { success: true };
  } catch (error) {
    console.error("[actions/auth]", error);
    return { success: false, error: "Failed to set up PIN" };
  }
}

export async function refreshSessionAction(): Promise<ActionResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Not signed in" };
    }

    const user = await getStaffUserById(session.staffUserId);
    if (!user || user.systemRole === "User") {
      return { success: false, error: "Not yet provisioned" };
    }

    await unstable_update({
      user: {
        systemRole: user.systemRole as SystemRole,
        workflowRoles: user.workflowRoles as WorkflowRole[],
        hasPinSet: !!user.pinHash,
        pinConfirmed: false,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[actions/auth]", error);
    return { success: false, error: "Failed to refresh session" };
  }
}
