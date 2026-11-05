import { and, arrayContains, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { engagements, persons, staffUsers } from "@/lib/db/schema";
import type { AccessState } from "@/lib/domain/types";
import { getEffectiveAccessState } from "@/lib/domain/types";
import {
  getAccessProvisioning,
  requestTermination,
} from "@/lib/services/workflow-service";

// Puts a few records with live access into Security's "Revocations" tab, as
// Reception asking for them to be switched off. Goes through the real
// `requestTermination`, so the request row, the TerminationRequested state
// and Security's dashboard notifications are exactly what the app writes; no
// emails are sent (the action sends those, and it is not called). Run
// `db:seed:workflow` first so there is active access to revoke. Local dev
// only.

const HOW_MANY = 3;

const REASONS = [
  "Contract ended early; contractor has demobilised from site.",
  "Visitor reported lost access card; revoke and reissue on return.",
  "Department Head asked for access to be withdrawn pending review.",
];

async function seedRevocations() {
  const [receptionist] = await db
    .select()
    .from(staffUsers)
    .where(arrayContains(staffUsers.workflowRoles, ["Receptionist"]));

  const [admin] = await db
    .select()
    .from(staffUsers)
    .where(eq(staffUsers.systemRole, "SystemAdmin"));

  const requestedBy = receptionist?.id ?? admin?.id;

  if (!requestedBy) {
    throw new Error(
      "No Receptionist or System Administrator — run `bun run db:seed` first",
    );
  }

  const active = await db
    .select({ id: engagements.id, name: persons.fullName })
    .from(engagements)
    .innerJoin(persons, eq(engagements.personId, persons.id))
    .where(
      and(
        eq(engagements.workflowState, "Completed"),
        eq(engagements.accessState, "Active"),
      ),
    );

  let requested = 0;

  for (const record of active) {
    if (requested >= HOW_MANY) break;

    // A card past its expiry reads Expired and can't be revoked.
    const card = await getAccessProvisioning(record.id);
    if (
      getEffectiveAccessState(
        "Active" as AccessState,
        card?.accessCardExpiry,
      ) !== "Active"
    ) {
      continue;
    }

    await requestTermination(
      record.id,
      requestedBy,
      REASONS[requested % REASONS.length] ?? REASONS[0],
    );

    console.log(`Revocation requested: ${record.name}`);
    requested += 1;
  }

  console.log(
    requested > 0
      ? `Requested ${requested} revocation(s). They are in Security's Revocations tab.`
      : "No record has active access to revoke — run `bun run db:seed:workflow` first.",
  );
}

seedRevocations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[seed-revocations]", error);
    process.exit(1);
  });
