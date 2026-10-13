"use server";

import { revalidatePath } from "next/cache";

import { requireSystemAdmin } from "@/lib/auth/guards";
import { resetPin } from "@/lib/auth/pin";
import type {
  ActionResult,
  GmcLiaisonDepartment,
  SystemRole,
  WorkflowRole,
} from "@/lib/domain/types";
import { sendEmail } from "@/lib/email/send";
import {
  accessApprovedTemplate,
  delegatedApprovalGrantedTemplate,
  pinResetTemplate,
} from "@/lib/email/templates";
import {
  deactivateStaffUser,
  provisionStaffUser,
  reactivateStaffUser,
  revokeStaffAccess,
} from "@/lib/services/auth-service";
import {
  grantDelegatedApproval,
  revokeDelegatedApproval,
} from "@/lib/services/workflow-service";

export async function provisionUserAction(
  staffUserId: string,
  systemRole: SystemRole,
  workflowRoles: WorkflowRole[],
  department?: GmcLiaisonDepartment | null,
): Promise<ActionResult> {
  try {
    await requireSystemAdmin();

    if (workflowRoles.includes("DepartmentHead") && !department) {
      return {
        success: false,
        error: "Select a department for this Department Head",
      };
    }

    const user = await provisionStaffUser(
      staffUserId,
      systemRole,
      workflowRoles,
      department,
    );
    if (!user) {
      return { success: false, error: "User not found" };
    }

    const emailSent = await sendEmail({
      to: user.email,
      ...accessApprovedTemplate({
        recipientName: user.displayName,
        systemRole,
        workflowRoles,
        department: user.department ?? undefined,
      }),
    });

    revalidatePath("/dashboard/system-admin/users");
    return emailSent
      ? { success: true }
      : {
          success: true,
          warning:
            "User provisioned, but the notification email failed to send",
        };
  } catch (error) {
    console.error("[actions/admin]", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to provision user",
    };
  }
}

export async function grantDelegatedApprovalAction(
  engagementId: string,
  receptionistStaffUserId: string,
  reason: string,
): Promise<ActionResult> {
  try {
    const session = await requireSystemAdmin();
    if (!reason) {
      return { success: false, error: "Reason is required" };
    }

    const { recipient } = await grantDelegatedApproval(
      engagementId,
      receptionistStaffUserId,
      session.staffUserId,
      reason,
    );

    const emailSent = recipient
      ? await sendEmail({
          to: recipient.email,
          ...delegatedApprovalGrantedTemplate({
            recipientName: recipient.displayName,
            engagementId,
          }),
        })
      : true;

    revalidatePath("/dashboard/system-admin/delegations");
    return emailSent
      ? { success: true }
      : {
          success: true,
          warning: "Granted, but the notification email failed to send",
        };
  } catch (error) {
    console.error("[actions/admin]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to grant delegated approval",
    };
  }
}

export async function revokeDelegatedApprovalAction(
  engagementId: string,
): Promise<ActionResult> {
  try {
    await requireSystemAdmin();
    await revokeDelegatedApproval(engagementId);
    revalidatePath("/dashboard/system-admin/delegations");
    return { success: true };
  } catch (error) {
    console.error("[actions/admin]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to revoke delegated approval",
    };
  }
}

export async function resetPinAction(
  staffUserId: string,
): Promise<ActionResult> {
  try {
    await requireSystemAdmin();

    const user = await resetPin(staffUserId);
    if (!user) {
      return { success: false, error: "User not found" };
    }

    const emailSent = await sendEmail({
      to: user.email,
      ...pinResetTemplate({ recipientName: user.displayName }),
    });

    revalidatePath("/dashboard/system-admin/users");
    return emailSent
      ? { success: true }
      : {
          success: true,
          warning: "PIN reset, but the notification email failed to send",
        };
  } catch (error) {
    console.error("[actions/admin]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reset PIN",
    };
  }
}

export async function revokeAccessAction(
  staffUserId: string,
): Promise<ActionResult> {
  try {
    const session = await requireSystemAdmin();

    // Locking yourself out would leave the system with one fewer administrator
    // and no way back in from this screen.
    if (session.staffUserId === staffUserId) {
      return { success: false, error: "You cannot revoke your own access" };
    }

    const user = await revokeStaffAccess(staffUserId);

    if (!user) {
      return { success: false, error: "User not found" };
    }

    revalidatePath("/dashboard/system-admin/users");

    return { success: true };
  } catch (error) {
    console.error("[actions/admin]", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to revoke access",
    };
  }
}

export async function deactivateUserAction(
  staffUserId: string,
): Promise<ActionResult> {
  try {
    const session = await requireSystemAdmin();

    if (session.staffUserId === staffUserId) {
      return {
        success: false,
        error: "You cannot deactivate your own account",
      };
    }

    const user = await deactivateStaffUser(staffUserId, session.staffUserId);

    if (!user) {
      return { success: false, error: "User not found" };
    }

    revalidatePath("/dashboard/system-admin/users");

    return { success: true };
  } catch (error) {
    console.error("[actions/admin]", error);

    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to deactivate user",
    };
  }
}

export async function reactivateUserAction(
  staffUserId: string,
): Promise<ActionResult> {
  try {
    await requireSystemAdmin();

    const user = await reactivateStaffUser(staffUserId);

    if (!user) {
      return { success: false, error: "User not found" };
    }

    revalidatePath("/dashboard/system-admin/users");

    return { success: true };
  } catch (error) {
    console.error("[actions/admin]", error);

    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to reactivate user",
    };
  }
}
