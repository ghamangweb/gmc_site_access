import { and, arrayOverlaps, eq, isNull } from "drizzle-orm";

import type { SessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { engagements, persons, staffUsers } from "@/lib/db/schema";
import { STAKEHOLDER_ROLES, type WorkflowRole } from "@/lib/domain/types";
import {
  rejectStakeholderApproval,
  submitForStakeholderApproval,
} from "@/lib/services/workflow-service";

// Puts a few records into Reception's "Rejected" tab: a stakeholder turning
// down an approval request. Takes engagements waiting at Reception, sends
// them for approval if Reception hasn't yet, then rejects them with a
// reason — all through the real services, so the request, the rejection
// history and the dashboard notifications are what the app writes. No emails
// (the actions send those, and they are not called). Run `db:seed:workflow`
// first. Local dev only.

const HOW_MANY = 3;

const REASONS = [
  "Company safety induction certificate is missing from the documents.",
  "Arrival and departure dates do not match the approved work schedule.",
  "Purpose of visit is unclear — please confirm the scope of work with the Department Head.",
];

async function rejecterSession(): Promise<SessionUser> {
  // A real stakeholder if there is one, so the rejection reads as theirs.
  const [stakeholder] = await db
    .select()
    .from(staffUsers)
    .where(
      and(
        arrayOverlaps(staffUsers.workflowRoles, [...STAKEHOLDER_ROLES]),
        isNull(staffUsers.deactivatedAt),
      ),
    );

  const [admin] = await db
    .select()
    .from(staffUsers)
    .where(eq(staffUsers.systemRole, "SystemAdmin"));

  const actor = stakeholder ?? admin;

  if (!actor) {
    throw new Error(
      "No stakeholder or System Administrator — run `bun run db:seed` first",
    );
  }

  // The admin signs as CSO, as in seed-workflow.
  const workflowRoles: WorkflowRole[] = stakeholder
    ? stakeholder.workflowRoles.filter((role): role is WorkflowRole =>
        (STAKEHOLDER_ROLES as readonly string[]).includes(role),
      )
    : ["CSO"];

  return {
    staffUserId: actor.id,
    systemRole: stakeholder ? "Admin" : "SystemAdmin",
    workflowRoles,
    pinConfirmed: true,
    hasPinSet: true,
    displayName: actor.displayName,
    email: actor.email,
    image: null,
  };
}

async function seedRejections() {
  const session = await rejecterSession();

  // Waiting at Reception and not already rejected.
  const waiting = await db
    .select({
      id: engagements.id,
      name: persons.fullName,
      approvalRequestedAt: engagements.approvalRequestedAt,
    })
    .from(engagements)
    .innerJoin(persons, eq(engagements.personId, persons.id))
    .where(
      and(
        eq(engagements.workflowState, "AtReception"),
        isNull(engagements.approvalRejectedAt),
      ),
    );

  let rejected = 0;

  for (const record of waiting) {
    if (rejected >= HOW_MANY) break;

    if (!record.approvalRequestedAt) {
      await submitForStakeholderApproval(record.id);
    }

    await rejectStakeholderApproval(
      record.id,
      session,
      REASONS[rejected % REASONS.length] ?? REASONS[0],
    );

    console.log(`Approval rejected: ${record.name}`);
    rejected += 1;
  }

  console.log(
    rejected > 0
      ? `Rejected ${rejected} record(s) as ${session.displayName}. They are in Reception's Rejected tab.`
      : "No record is waiting at Reception — run `bun run db:seed:workflow` first.",
  );
}

seedRejections()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[seed-rejections]", error);
    process.exit(1);
  });
