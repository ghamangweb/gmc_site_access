import { eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { engagements, registrationRequests, staffUsers } from "@/lib/db/schema";
import { getDocumentsForInvitation } from "@/lib/services/document-service";
import {
  buildEngagementInput,
  linkRequestToEngagement,
} from "@/lib/services/registration-service";
import { createEngagement } from "@/lib/services/workflow-service";

// Takes seeded submissions through Reception and leaves them exactly where a
// stakeholder picks them up: an Engagement at AtReception with
// approval_requested_at stamped and nobody signed yet, which is what
// /dashboard/approvals lists. Local dev only.
//
// It goes through the real services rather than inserting rows directly, so
// the Person, the workflow cycle and the document hand-off all happen the way
// they do in the app.

const TARGET_COUNT = 2;

const SEED_EMAIL_DOMAIN = "@seed.gmc.local";

async function seedApprovals() {
  const [receptionist] = await db
    .select()
    .from(staffUsers)
    .where(eq(staffUsers.systemRole, "SystemAdmin"));

  if (!receptionist) {
    throw new Error(
      "No staff user to attribute the engagements to — run `bun run db:seed` first",
    );
  }

  const requests = await db
    .select()
    .from(registrationRequests)
    .where(isNull(registrationRequests.engagementId));

  const alreadyAwaiting = await db
    .select()
    .from(engagements)
    .where(eq(engagements.workflowState, "AtReception"));

  const outstanding = alreadyAwaiting.filter(
    (engagement) => engagement.approvalRequestedAt !== null,
  );

  if (outstanding.length >= TARGET_COUNT) {
    console.log(
      `${outstanding.length} engagement(s) already awaiting approval — nothing to do.`,
    );

    return;
  }

  let created = 0;

  for (const request of requests) {
    if (outstanding.length + created >= TARGET_COUNT) {
      break;
    }

    const documents = await getDocumentsForInvitation(request.invitationId);

    // Mark exactly what the visitor supplied as applicable, so the engagement
    // has no missing required documents and would pass the real
    // `submitForStakeholderApproval` guard.
    const applicableDocuments = documents
      .map((document) => document.docType)
      .filter(
        (
          docType,
        ): docType is "passport_biodata" | "valid_visa" | "ghana_card" =>
          docType === "passport_biodata" ||
          docType === "valid_visa" ||
          docType === "ghana_card",
      );

    const input = buildEngagementInput(request, {
      // Only read for a Local submission, which carries no nationality.
      nationality: "Ghana",
      ghanaVisaRequired: false,
      visaType: "Tourist Visa",
      applicableDocuments,
      accommodationConfirmed: true,
      itineraryAttached: true,
      inflightUpdated: false,
      remarks: "Seeded for the stakeholder approval queue.",
    });

    const engagement = await createEngagement(input, receptionist.id);

    // Re-points the visitor's documents onto the new Engagement.
    await linkRequestToEngagement(request.id, engagement.id);

    // What `submitForStakeholderApproval` stamps. The notifications and
    // emails it would also send are skipped deliberately — this is seed data,
    // not a workflow event.
    await db
      .update(engagements)
      .set({ approvalRequestedAt: new Date() })
      .where(eq(engagements.id, engagement.id));

    console.log(
      `Awaiting approval: ${input.person.fullName} (${request.registrationType})`,
    );

    created += 1;
  }

  console.log(
    created > 0
      ? `Seeded ${created} engagement(s) awaiting stakeholder approval.`
      : `No unconverted ${SEED_EMAIL_DOMAIN} submissions left to convert.`,
  );
}

seedApprovals()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[seed-approvals]", error);
    process.exit(1);
  });
