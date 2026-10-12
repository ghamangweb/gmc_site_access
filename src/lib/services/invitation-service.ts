import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";

import type { DbClient } from "@/lib/db/client";
import { db } from "@/lib/db/client";
import { invitations, staffUsers } from "@/lib/db/schema";
import type { RegistrationType } from "@/lib/domain/types";

export type InvitationRow = typeof invitations.$inferSelect;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function validateInvitationToken(token: string): Promise<{
  id: string;
  department: string;
  registrationType: RegistrationType;
  issuerName: string;
} | null> {
  const [invitation] = await db
    .select({
      id: invitations.id,
      revokedAt: invitations.revokedAt,
      consumedAt: invitations.consumedAt,
      department: invitations.department,
      registrationType: invitations.registrationType,
      issuerName: staffUsers.displayName,
    })
    .from(invitations)
    .innerJoin(staffUsers, eq(staffUsers.id, invitations.issuedBy))
    .where(eq(invitations.tokenHash, hashToken(token)));

  if (!invitation || invitation.revokedAt || invitation.consumedAt) {
    return null;
  }

  return {
    id: invitation.id,
    department: invitation.department,
    registrationType: invitation.registrationType as RegistrationType,
    issuerName: invitation.issuerName,
  };
}

export async function consumeInvitation(
  token: string,
  tx: DbClient = db,
): Promise<InvitationRow | undefined> {
  const [consumed] = await tx
    .update(invitations)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(invitations.tokenHash, hashToken(token)),
        isNull(invitations.revokedAt),
        isNull(invitations.consumedAt),
      ),
    )
    .returning();
  return consumed;
}

export async function issueInvitation(
  issuerStaffUserId: string,
  email: string,
  registrationType: RegistrationType,
): Promise<{ token: string; department: string }> {
  const [issuer] = await db
    .select({ department: staffUsers.department })
    .from(staffUsers)
    .where(eq(staffUsers.id, issuerStaffUserId));

  if (!issuer?.department) {
    throw new Error("You are not assigned to a department");
  }

  const token = randomBytes(32).toString("hex");

  await db.insert(invitations).values({
    department: issuer.department,
    registrationType,
    email,
    tokenHash: hashToken(token),
    issuedBy: issuerStaffUserId,
  });

  return { token, department: issuer.department };
}

export async function revokeInvitation(
  invitationId: string,
  issuerStaffUserId: string,
): Promise<boolean> {
  const [revoked] = await db
    .update(invitations)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(invitations.id, invitationId),
        eq(invitations.issuedBy, issuerStaffUserId),
      ),
    )
    .returning();
  return !!revoked;
}

export async function listInvitationsForIssuer(
  issuerStaffUserId: string,
): Promise<InvitationRow[]> {
  return db
    .select()
    .from(invitations)
    .where(eq(invitations.issuedBy, issuerStaffUserId))
    .orderBy(desc(invitations.issuedAt));
}
