import { getSession, type SessionUser } from "@/lib/auth/session";
import type { WorkflowRole } from "@/lib/domain/types";
import { isStaffUserActive } from "@/lib/services/auth-service";

export async function requireProvisioned(): Promise<SessionUser> {
  const session = await getSession();

  if (!session || session.systemRole === "User") {
    throw new Error("Not provisioned");
  }

  // Deliberately a database read, not a JWT claim. Sessions live for up to an
  // hour, and deactivating someone — because they left, or their account is
  // compromised — has to take effect now, not whenever their token happens to
  // expire. Every other guard funnels through here, so this is the one place
  // it needs to happen. The proxy still reads the JWT only; this runs in page
  // and action code that is already querying.
  if (!(await isStaffUserActive(session.staffUserId))) {
    throw new Error("Account deactivated");
  }

  return session;
}

export async function requirePinConfirmed(): Promise<SessionUser> {
  const session = await requireProvisioned();
  if (!session.pinConfirmed) {
    throw new Error("PIN not confirmed");
  }
  return session;
}

export async function requireSystemAdmin(): Promise<SessionUser> {
  const session = await requirePinConfirmed();
  if (session.systemRole !== "SystemAdmin") {
    throw new Error("System Admin required");
  }
  return session;
}

export async function requireWriteAccess(
  layer: WorkflowRole,
): Promise<SessionUser> {
  const session = await requirePinConfirmed();
  if (
    session.systemRole === "Guest" ||
    !session.workflowRoles.includes(layer)
  ) {
    throw new Error("Write access required");
  }
  return session;
}
