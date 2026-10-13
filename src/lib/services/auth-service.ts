import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { notifications, staffUsers } from "@/lib/db/schema";
import type {
  GmcLiaisonDepartment,
  SystemRole,
  WorkflowRole,
} from "@/lib/domain/types";

export type StaffUser = typeof staffUsers.$inferSelect;
type NotificationRow = typeof notifications.$inferSelect;

export async function getStaffUserById(
  staffUserId: string,
): Promise<StaffUser | undefined> {
  const [user] = await db
    .select()
    .from(staffUsers)
    .where(eq(staffUsers.id, staffUserId));
  return user;
}

export async function findPendingAccessRequest(
  requesterStaffUserId: string,
): Promise<NotificationRow | undefined> {
  const [existing] = await db
    .select()
    .from(notifications)
    .where(
      and(
        isNull(notifications.readAt),
        eq(notifications.requesterStaffUserId, requesterStaffUserId),
      ),
    );
  return existing;
}

export async function isStaffUserActive(staffUserId: string): Promise<boolean> {
  const [user] = await db
    .select({ deactivatedAt: staffUsers.deactivatedAt })
    .from(staffUsers)
    .where(eq(staffUsers.id, staffUserId));

  return !!user && user.deactivatedAt === null;
}

export async function requestAccess(
  requester: StaffUser,
  requestedRole: string,
  requestedDepartment?: string,
): Promise<{ admins: StaffUser[] }> {
  const admins = await db
    .select()
    .from(staffUsers)
    .where(
      and(
        eq(staffUsers.systemRole, "SystemAdmin"),
        isNull(staffUsers.deactivatedAt),
      ),
    );

  if (admins.length > 0) {
    const roleDescription = requestedDepartment
      ? `${requestedRole} (${requestedDepartment})`
      : requestedRole;
    const message = `Access request from ${requester.displayName} (${requester.email}) for role ${roleDescription}`;
    await db.insert(notifications).values(
      admins.map((admin) => ({
        recipientStaffUserId: admin.id,
        requesterStaffUserId: requester.id,
        requestedRole,
        requestedDepartment,
        message,
      })),
    );
  }

  return { admins };
}

export async function provisionStaffUser(
  staffUserId: string,
  systemRole: SystemRole,
  workflowRoles: WorkflowRole[],
  department?: GmcLiaisonDepartment | null,
): Promise<StaffUser | undefined> {
  const [user] = await db
    .update(staffUsers)
    .set({
      systemRole,
      workflowRoles,
      department: workflowRoles.includes("DepartmentHead")
        ? (department ?? null)
        : null,
      provisionedAt: new Date(),
    })
    .where(eq(staffUsers.id, staffUserId))
    .returning();
  return user;
}

export async function listStaffUsersWithPendingRequests(): Promise<{
  users: StaffUser[];
  pendingRequests: NotificationRow[];
}> {
  const users = await db
    .select()
    .from(staffUsers)
    .orderBy(desc(staffUsers.createdAt));
  const pendingRequests = await db
    .select()
    .from(notifications)
    .where(isNull(notifications.readAt));
  return { users, pendingRequests };
}

// Back to an unprovisioned account: they can still sign in with Entra but
// reach nothing, exactly like someone who has just been granted a Microsoft
// account. Deliberately separate from `provisionStaffUser` so revoking
// access is an explicit act rather than an ordinary role edit.
export async function revokeStaffAccess(
  staffUserId: string,
): Promise<StaffUser | undefined> {
  const [user] = await db
    .update(staffUsers)
    .set({
      systemRole: "User",
      workflowRoles: [],
      department: null,
      provisionedAt: null,
    })
    .where(eq(staffUsers.id, staffUserId))
    .returning();

  return user;
}

// Soft delete. The row stays so the twelve tables that reference it keep
// their attribution; the user simply cannot sign in and is excluded from
// every recipient and approver lookup.
export async function deactivateStaffUser(
  staffUserId: string,
  deactivatedBy: string,
): Promise<StaffUser | undefined> {
  const [user] = await db
    .update(staffUsers)
    .set({
      deactivatedAt: new Date(),
      deactivatedBy,
      // A deactivated account must not come back with its old powers if it is
      // ever reactivated, and must stop counting as an approver immediately.
      systemRole: "User",
      workflowRoles: [],
      department: null,
      provisionedAt: null,
      // Any live session is useless without a PIN, and the PIN should not
      // survive the person leaving.
      pinHash: null,
    })
    .where(eq(staffUsers.id, staffUserId))
    .returning();

  return user;
}

export async function reactivateStaffUser(
  staffUserId: string,
): Promise<StaffUser | undefined> {
  // Comes back unprovisioned: a System Admin re-grants roles deliberately
  // rather than having them silently restored.
  const [user] = await db
    .update(staffUsers)
    .set({ deactivatedAt: null, deactivatedBy: null })
    .where(eq(staffUsers.id, staffUserId))
    .returning();

  return user;
}
