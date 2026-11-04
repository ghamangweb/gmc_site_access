import { arrayContains, eq, isNull } from "drizzle-orm";

import type { SessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import {
  documents,
  engagements,
  registrationRequests,
  staffUsers,
} from "@/lib/db/schema";
import type { HospitalClearanceStatus, WorkflowRole } from "@/lib/domain/types";
import { getDocumentsForInvitation } from "@/lib/services/document-service";
import {
  buildEngagementInput,
  linkRequestToEngagement,
} from "@/lib/services/registration-service";
import {
  activateAccess,
  applyStakeholderApproval,
  createEngagement,
  recordHospitalClearance,
  recordInductionCompletion,
} from "@/lib/services/workflow-service";

// Spreads the seeded registration submissions across every layer, so each
// dashboard has both work waiting and work already recorded: Reception,
// stakeholder approval, Hospital, Training School and Security. Run
// `db:seed:registrations` first. Local dev only.
//
// Like seed-approvals, it goes through the real services so every row a stage
// writes (cycle, transitions, clearance, induction, provisioning) is the one
// the app would write. Those services add dashboard notifications but send no
// emails — the actions do that, and they are not called here.

const SEED_EMAIL_DOMAIN = "@seed.gmc.local";

// How far each submission is taken. Anything not listed stays an unconverted
// submission in Reception's queue.
type Stage =
  | { stop: "AtReception" }
  | { stop: "AwaitingApproval" }
  | { stop: "Approved" }
  | { stop: "Hospital"; clearance: HospitalClearanceStatus; comments: string }
  | { stop: "Training"; clearance?: HospitalClearanceStatus }
  | { stop: "Security"; clearance?: HospitalClearanceStatus };

const PLAN: Record<string, Stage> = {
  // Reception: converted, not yet sent for sign-off
  [`m.rossi${SEED_EMAIL_DOMAIN}`]: { stop: "AtReception" },

  // Awaiting stakeholder approval
  [`c.oliveira${SEED_EMAIL_DOMAIN}`]: { stop: "AwaitingApproval" },
  [`a.hassan${SEED_EMAIL_DOMAIN}`]: { stop: "AwaitingApproval" },
  [`g.mwangi${SEED_EMAIL_DOMAIN}`]: { stop: "AwaitingApproval" },

  // Approved. Work records land at Hospital (awaiting), Visit records complete
  [`l.brandt${SEED_EMAIL_DOMAIN}`]: { stop: "Approved" },
  [`chen.jian${SEED_EMAIL_DOMAIN}`]: { stop: "Approved" },
  [`e.clarke${SEED_EMAIL_DOMAIN}`]: { stop: "Approved" },
  [`s.tremblay${SEED_EMAIL_DOMAIN}`]: { stop: "Approved" },
  [`p.nair${SEED_EMAIL_DOMAIN}`]: { stop: "Approved" },

  // Hospital recorded Unfit — the record stays at Hospital
  [`d.okonkwo${SEED_EMAIL_DOMAIN}`]: {
    stop: "Hospital",
    clearance: "Unfit",
    comments: "Uncontrolled blood pressure. Review again in four weeks.",
  },

  // Awaiting induction at Training School
  [`r.kumar${SEED_EMAIL_DOMAIN}`]: {
    stop: "Training",
    clearance: "FitWithConditions",
  },
  [`k.tanaka${SEED_EMAIL_DOMAIN}`]: { stop: "Training" },

  // Induction recorded, awaiting Security
  [`li.wei${SEED_EMAIL_DOMAIN}`]: { stop: "Security", clearance: "Fit" },
  [`m.yilmaz${SEED_EMAIL_DOMAIN}`]: { stop: "Security" },

  // Access activated by Security
  [`zhang.min${SEED_EMAIL_DOMAIN}`]: { stop: "Security" },
  [`t.molefe${SEED_EMAIL_DOMAIN}`]: { stop: "Security" },
  [`wang.fang${SEED_EMAIL_DOMAIN}`]: { stop: "Security" },
};

// Records that go all the way through Security.
const ACTIVATED = new Set([
  `zhang.min${SEED_EMAIL_DOMAIN}`,
  `t.molefe${SEED_EMAIL_DOMAIN}`,
  `wang.fang${SEED_EMAIL_DOMAIN}`,
]);

const CLEARANCE_COMMENTS: Record<HospitalClearanceStatus, string> = {
  Fit: "",
  FitWithConditions:
    "Fit for site work. Must wear prescription safety glasses.",
  Unfit: "",
};

// The first active staff user holding a workflow role, so Hospital and
// Training sign-offs are attributed to the people who do them. Falls back to
// the System Administrator.
async function staffFor(role: WorkflowRole, fallbackId: string) {
  const [user] = await db
    .select()
    .from(staffUsers)
    .where(arrayContains(staffUsers.workflowRoles, [role]));

  return user && !user.deactivatedAt ? user.id : fallbackId;
}

async function seedWorkflow() {
  const [admin] = await db
    .select()
    .from(staffUsers)
    .where(eq(staffUsers.systemRole, "SystemAdmin"));

  if (!admin) {
    throw new Error("No System Administrator — run `bun run db:seed` first");
  }

  const hospitalId = await staffFor("HospitalStaff", admin.id);
  const trainingId = await staffFor("TrainingStaff", admin.id);

  // Signs as CSO. Any one stakeholder approval is enough.
  const approver: SessionUser = {
    staffUserId: admin.id,
    systemRole: "SystemAdmin",
    workflowRoles: ["CSO"],
    pinConfirmed: true,
    hasPinSet: true,
    displayName: admin.displayName,
    email: admin.email,
    image: null,
  };

  const requests = await db
    .select()
    .from(registrationRequests)
    .where(isNull(registrationRequests.engagementId));

  let progressed = 0;

  for (const request of requests) {
    // SAFETY: written by seed-registrations from a ReceptionFormInput.
    const email = (request.formData as { person: { email: string } }).person
      .email;
    const stage = PLAN[email];

    if (!stage) {
      continue;
    }

    const visitorDocuments = await getDocumentsForInvitation(
      request.invitationId,
    );

    const input = buildEngagementInput(request, {
      applicableDocuments: visitorDocuments
        .map((document) => document.docType)
        .filter(
          (docType): docType is "passport_biodata" | "valid_visa" =>
            docType === "passport_biodata" || docType === "valid_visa",
        ),
      accommodationConfirmed: true,
      itineraryAttached: true,
      inflightUpdated: false,
      remarks: "Seeded dummy record.",
    });

    const engagement = await createEngagement(input, admin.id);
    await linkRequestToEngagement(request.id, engagement.id);

    const name = input.person.fullName;

    if (stage.stop === "AtReception") {
      console.log(`Reception:            ${name}`);
      progressed += 1;
      continue;
    }

    // What `submitForStakeholderApproval` stamps, without its notifications.
    await db
      .update(engagements)
      .set({ approvalRequestedAt: new Date() })
      .where(eq(engagements.id, engagement.id));

    if (stage.stop === "AwaitingApproval") {
      console.log(`Awaiting approval:    ${name}`);
      progressed += 1;
      continue;
    }

    const approved = await applyStakeholderApproval(
      engagement.id,
      approver,
      { signature: JSON.stringify({ mode: "type", value: admin.displayName }) },
      admin.id,
    );

    if (stage.stop === "Approved") {
      console.log(
        `Approved → ${approved.engagement.workflowState.padEnd(10)} ${name}`,
      );
      progressed += 1;
      continue;
    }

    if (input.accessPurpose === "Work") {
      const clearance =
        stage.stop === "Hospital"
          ? stage.clearance
          : (stage.clearance ?? "Fit");
      const comments =
        stage.stop === "Hospital"
          ? stage.comments
          : CLEARANCE_COMMENTS[clearance];

      await recordHospitalClearance(
        engagement.id,
        { clearanceStatus: clearance, doctorComments: comments },
        hospitalId,
      );

      if (stage.stop === "Hospital") {
        console.log(`Hospital ${clearance}:  ${name}`);
        progressed += 1;
        continue;
      }
    }

    if (stage.stop === "Training") {
      console.log(`Awaiting induction:   ${name}`);
      progressed += 1;
      continue;
    }

    await recordInductionCompletion(
      engagement.id,
      {
        generalSiteInduction: true,
        otherInductions: false,
        trainerComments: "General site induction completed.",
      },
      trainingId,
    );

    if (!ACTIVATED.has(email)) {
      console.log(`Awaiting Security:    ${name}`);
      progressed += 1;
      continue;
    }

    // Security cannot activate without a passport photograph on the record.
    const photo = await uploadSeedFile(
      `passport_photo-${email.split("@")[0]}.png`,
    );

    if (!photo) {
      console.log(`Awaiting Security:    ${name} (photo upload failed)`);
      progressed += 1;
      continue;
    }

    await db.insert(documents).values({
      engagementId: engagement.id,
      docType: "passport_photo",
      fileKey: photo.fileKey,
      fileUrl: photo.fileUrl,
      fileName: photo.fileName,
      contentType: "image/png",
      uploadedBy: admin.id,
    });

    await activateAccess(
      engagement.id,
      {
        idType: "Visitor Card",
        biometricCaptured: true,
        accessCardNumber: `GMC-${String(1000 + progressed).padStart(5, "0")}`,
        accessCardExpiry: input.departureDate,
        comments: "Security checks completed; access approved for activation.",
      },
      admin.id,
    );

    console.log(`Access activated:     ${name}`);
    progressed += 1;
  }

  console.log(
    progressed > 0
      ? `Progressed ${progressed} submission(s). The rest stay in Reception's submissions queue.`
      : "Nothing to progress — every planned submission is already converted.",
  );
}

// A 1×1 PNG, as in seed-registrations: real bytes so the photo opens.
const PIXEL_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function uploadSeedFile(fileName: string) {
  const { UTApi } = await import("uploadthing/server");
  const utapi = new UTApi();

  const file = new File([Buffer.from(PIXEL_PNG_BASE64, "base64")], fileName, {
    type: "image/png",
  });

  const result = await utapi.uploadFiles(file);

  if (result.error || !result.data) {
    console.error(
      `[seed-workflow] upload failed for ${fileName}:`,
      result.error,
    );

    return null;
  }

  return { fileKey: result.data.key, fileUrl: result.data.ufsUrl, fileName };
}

seedWorkflow()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[seed-workflow]", error);
    process.exit(1);
  });
