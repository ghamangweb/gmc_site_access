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

export async function requestAccess(
  requester: StaffUser,
  requestedRole: string,
  requestedDepartment?: string,
): Promise<{ admins: StaffUser[] }> {
  const admins = await db
    .select()
    .from(staffUsers)
    .where(eq(staffUsers.systemRole, "SystemAdmin"));

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
