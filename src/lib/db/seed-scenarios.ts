import { createHash, randomBytes } from "node:crypto";
import { and, arrayOverlaps, eq, isNull } from "drizzle-orm";

import type { SessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import {
  accessProvisionings,
  documents,
  invitations,
  registrationRequests,
  staffUsers,
  workflowCycles,
} from "@/lib/db/schema";
import type { WorkflowRole } from "@/lib/domain/types";
import {
  approveRegistrationRequest,
  buildEngagementInput,
  linkRequestToEngagement,
} from "@/lib/services/registration-service";
import type { ReceptionFormInput } from "@/lib/services/workflow-service";
import {
  activateAccess,
  applyStakeholderApproval,
  applyStakeholderExemption,
  createEngagement,
  extendStay,
  recordHospitalClearance,
  recordInductionCompletion,
  rejectStakeholderApproval,
  requestTermination,
  submitForStakeholderApproval,
} from "@/lib/services/workflow-service";

// One fresh visitor per testing scenario, every run — so every dashboard,
// tab, menu item, dot and export has something to show, however much of the
// earlier seed data has already been used up. Each visitor gets a unique
// passport number and email, so runs never collide. Everything goes through
// the real services, so each record is exactly what the app would write
// (dashboard notifications included; no emails are sent — the actions do
// that). The one exception is backdating a card for the Expired case: no
// service can. Local dev only. Run `db:seed` first.

const SEED_EMAIL_DOMAIN = "@seed.gmc.local";

type Scenario =
  | "AwaitingHod"
  | "AwaitingReception"
  | "AwaitingApproval"
  | "Rejected"
  | "MedicalBypass"
  | "AtHospital"
  | "ReviewDue"
  | "Unfit"
  | "AwaitingInduction"
  | "AwaitingSecurity"
  | "Active"
  | "RevocationRequested"
  | "StayExtended"
  | "Expired";

// Who each scenario is, so a dashboard reads like real people.
const PEOPLE: [Scenario, string, string][] = [
  ["AwaitingHod", "Nadia Haddad", "Lebanon"],
  ["AwaitingReception", "Tomas Novak", "Czech Republic"],
  ["AwaitingApproval", "Ingrid Larsen", "Norway"],
  ["AwaitingApproval", "Kwesi Bekoe", "Ghana"],
  ["Rejected", "Paolo Ricci", "Italy"],
  ["MedicalBypass", "Amina Yusuf", "Nigeria"],
  ["AtHospital", "Lars Eriksson", "Sweden"],
  ["ReviewDue", "Mei Tanaka", "Japan"],
  ["Unfit", "Victor Dubois", "France"],
  ["AwaitingInduction", "Sofia Alvarez", "Spain"],
  ["AwaitingSecurity", "Owen Price", "United Kingdom"],
  ["Active", "Hannah Weber", "Germany"],
  ["Active", "Diego Morales", "Mexico"],
  ["RevocationRequested", "Ravi Shah", "India"],
  ["StayExtended", "Chloe Martin", "Canada"],
  ["Expired", "Peter Nowak", "Poland"],
];

function isoDate(daysFromToday: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

function formData(
  fullName: string,
  nationality: string,
  passportNo: string,
  email: string,
  department: string,
  liaison: string,
): ReceptionFormInput {
  return {
    person: {
      passportNo,
      fullName,
      dateOfBirth: "1988-04-12",
      gender: "Female",
      nationality,
      email,
      phone: "+233 244000444",
      emergencyContactName: "Grace Mensah",
      emergencyContactPhone: "+233 244000111",
    },
    // Work goes through every stage, so each scenario can stop where it needs.
    accessPurpose: "Work",
    arrivalDate: isoDate(-3),
    departureDate: isoDate(20),
    receptionData: {
      employmentStatus: "Contractor",
      telephoneOnSite: "+233 244000222",
      companyName: "Scenario Engineering Ltd",
      contactNameMonthly: "Daniel Owusu",
      contactEmail: `reports${SEED_EMAIL_DOMAIN}`,
      companyEmergencyName: "Abena Boateng",
      companyEmergencyTel: "+233 244000333",
      gmcLiaisonPerson: liaison,
      gmcLiaisonDept: department,
      reasonForRequest: "Seeded scenario for testing.",
      airportPickup: false,
      transportTo: true,
      transportFrom: false,
      accommodationRequired: false,
      permanentAccessBadge: false,
      ghanaVisaRequired: true,
      generalSiteInduction: true,
      otherInductions: false,
      bringingEquipment: false,
      ppeRequired: true,
      itAccessRequired: false,
      visaType: "Business Visa",
      accessLevel: "Plant",
      accommodationConfirmed: false,
      itineraryAttached: false,
      inflightUpdated: false,
      remarks: "",
      applicableDocuments: [],
    },
  } as ReceptionFormInput;
}

async function firstStaff(role: WorkflowRole) {
  const [user] = await db
    .select()
    .from(staffUsers)
    .where(
      and(
        arrayOverlaps(staffUsers.workflowRoles, [role]),
        isNull(staffUsers.deactivatedAt),
      ),
    );
  return user;
}

function session(
  user: typeof staffUsers.$inferSelect,
  workflowRoles: WorkflowRole[],
): SessionUser {
  return {
    staffUserId: user.id,
    systemRole: user.systemRole as SessionUser["systemRole"],
    workflowRoles,
    pinConfirmed: true,
    hasPinSet: true,
    displayName: user.displayName,
    email: user.email,
    image: null,
  };
}

async function seedScenarios() {
  const [admin] = await db
    .select()
    .from(staffUsers)
    .where(eq(staffUsers.systemRole, "SystemAdmin"));

  if (!admin) {
    throw new Error("No System Administrator — run `bun run db:seed` first");
  }

  const hod = await firstStaff("DepartmentHead");
  const department = hod?.department ?? "Mining";
  const hospitalId = (await firstStaff("HospitalStaff"))?.id ?? admin.id;
  const trainingId = (await firstStaff("TrainingStaff"))?.id ?? admin.id;
  const securityId = (await firstStaff("SecurityStaff"))?.id ?? admin.id;
  const receptionId = (await firstStaff("Receptionist"))?.id ?? admin.id;

  // By-pass and stay extension re-check the stakeholder role in the
  // database, so they need a real CSO / HCM / GMM / EM.
  const [stakeholderUser] = await db
    .select()
    .from(staffUsers)
    .where(
      and(
        arrayOverlaps(staffUsers.workflowRoles, ["CSO", "HCM", "GMM", "EM"]),
        isNull(staffUsers.deactivatedAt),
      ),
    );
  const stakeholder = stakeholderUser
    ? session(
        stakeholderUser,
        stakeholderUser.workflowRoles.filter((role): role is WorkflowRole =>
          ["CSO", "HCM", "GMM", "EM"].includes(role),
        ),
      )
    : session(admin, ["CSO"]);
  const signature = JSON.stringify({
    mode: "type",
    value: stakeholder.displayName,
  });

  // Security needs a passport photograph on the record to activate. Reuse a
  // file the earlier seeds uploaded, so it opens like a real one.
  const [photo] = await db
    .select()
    .from(documents)
    .where(eq(documents.docType, "passport_photo"));

  const runId = Date.now().toString(36).toUpperCase();
  let created = 0;
  const skipped: string[] = [];

  for (const [index, [scenario, fullName, nationality]] of PEOPLE.entries()) {
    const tag = `${runId}-${index + 1}`;
    const email = `scenario.${tag.toLowerCase()}${SEED_EMAIL_DOMAIN}`;
    const passportNo = `SC${tag}`;
    const data = formData(
      fullName,
      nationality,
      passportNo,
      email,
      department,
      hod?.displayName ?? "Department Head",
    );

    const needsStakeholder =
      scenario === "MedicalBypass" || scenario === "StayExtended";
    const needsPhoto = [
      "Active",
      "RevocationRequested",
      "StayExtended",
      "Expired",
    ].includes(scenario);

    if (needsStakeholder && !stakeholderUser) {
      skipped.push(`${fullName} (${scenario}: no CSO/HCM/GMM/EM user)`);
      continue;
    }
    if (needsPhoto && !photo) {
      skipped.push(`${fullName} (${scenario}: no seeded passport photo)`);
      continue;
    }
    if (scenario === "AwaitingReception" && !hod) {
      skipped.push(`${fullName} (${scenario}: no Department Head)`);
      continue;
    }

    // Every record starts as a visitor's submission, as in the app.
    const [invitation] = await db
      .insert(invitations)
      .values({
        department,
        registrationType: "Foreign",
        email,
        tokenHash: createHash("sha256")
          .update(randomBytes(32).toString("hex"))
          .digest("hex"),
        issuedBy: hod?.id ?? admin.id,
        consumedAt: new Date(),
      })
      .returning();

    const [request] = await db
      .insert(registrationRequests)
      .values({
        invitationId: invitation.id,
        department,
        registrationType: "Foreign",
        formData: data,
        status: "PendingDepartmentApproval",
      })
      .returning();

    if (scenario === "AwaitingHod") {
      console.log(`Awaiting HOD:           ${fullName}`);
      created += 1;
      continue;
    }

    if (hod) {
      await approveRegistrationRequest(request.id, hod.id);
    } else {
      await db
        .update(registrationRequests)
        .set({
          status: "Approved",
          approvedBy: admin.id,
          approvedAt: new Date(),
        })
        .where(eq(registrationRequests.id, request.id));
    }

    if (scenario === "AwaitingReception") {
      console.log(`Awaiting Reception:     ${fullName}`);
      created += 1;
      continue;
    }

    const [approvedRequest] = await db
      .select()
      .from(registrationRequests)
      .where(eq(registrationRequests.id, request.id));
    const input = buildEngagementInput(approvedRequest, {
      applicableDocuments: [],
      accommodationConfirmed: true,
      itineraryAttached: true,
      inflightUpdated: false,
      remarks: "Seeded scenario.",
    });
    const engagement = await createEngagement(input, receptionId);
    await linkRequestToEngagement(request.id, engagement.id);
    await submitForStakeholderApproval(engagement.id);
    const id = engagement.id;

    if (scenario === "AwaitingApproval") {
      console.log(`Awaiting approval:      ${fullName}`);
    } else if (scenario === "Rejected") {
      await rejectStakeholderApproval(
        id,
        stakeholder,
        "Arrival and departure dates do not match the approved work schedule.",
      );
      console.log(`Rejected:               ${fullName}`);
    } else if (scenario === "MedicalBypass") {
      await applyStakeholderExemption(
        id,
        stakeholder,
        {
          signature,
          exemption: {
            stages: ["Hospital"],
            reason: "Recent medical from the client's own clinic accepted.",
          },
        },
        stakeholder.staffUserId,
      );
      console.log(`Medical By-pass:        ${fullName}`);
    } else {
      await applyStakeholderApproval(
        id,
        stakeholder,
        { signature },
        stakeholder.staffUserId,
      );

      if (scenario === "AtHospital") {
        console.log(`At Hospital:            ${fullName}`);
      } else if (scenario === "Unfit") {
        await recordHospitalClearance(
          id,
          {
            clearanceStatus: "Unfit",
            doctorComments: "Elevated blood pressure. Reassess in two weeks.",
          },
          hospitalId,
        );
        console.log(`Unfit (at Hospital):    ${fullName}`);
      } else {
        const reviewDue = scenario === "ReviewDue";
        await recordHospitalClearance(
          id,
          reviewDue
            ? {
                clearanceStatus: "FitWithConditions",
                doctorComments: "Fit with corrective lenses; review shortly.",
                nextReviewDate: isoDate(1),
              }
            : { clearanceStatus: "Fit", doctorComments: "" },
          hospitalId,
        );

        if (reviewDue) {
          console.log(`Review due tomorrow:    ${fullName}`);
        } else if (scenario === "AwaitingInduction") {
          console.log(`Awaiting induction:     ${fullName}`);
        } else {
          await recordInductionCompletion(
            id,
            {
              generalSiteInduction: true,
              otherInductions: false,
              trainerComments: "General site induction completed.",
            },
            trainingId,
          );

          if (scenario === "AwaitingSecurity") {
            console.log(`Awaiting Security:      ${fullName}`);
          } else {
            const [cycle] = await db
              .select()
              .from(workflowCycles)
              .where(eq(workflowCycles.engagementId, id));
            await db.insert(documents).values({
              engagementId: id,
              workflowCycleId: cycle?.id,
              docType: "passport_photo",
              fileKey: photo.fileKey,
              fileUrl: photo.fileUrl,
              fileName: photo.fileName,
              contentType: photo.contentType,
              uploadedBy: securityId,
            });
            await activateAccess(
              id,
              {
                idType: "Visitor Card",
                biometricCaptured: true,
                accessCardNumber: `GMC-${tag}`,
                accessCardExpiry: isoDate(14),
                comments: "Security checks completed.",
              },
              securityId,
            );

            if (scenario === "Active") {
              console.log(`Active access:          ${fullName}`);
            } else if (scenario === "RevocationRequested") {
              await requestTermination(
                id,
                receptionId,
                "Contract ended early; contractor has demobilised from site.",
              );
              console.log(`Revocation requested:   ${fullName}`);
            } else if (scenario === "StayExtended") {
              await extendStay(id, stakeholder, {
                newDepartureDate: isoDate(45),
                reason: "Project phase extended by the client.",
                signature,
              });
              console.log(`Stay extended:          ${fullName}`);
            } else {
              // The one direct edit: no service can backdate a card.
              await db
                .update(accessProvisionings)
                .set({ accessCardExpiry: isoDate(-1) })
                .where(eq(accessProvisionings.workflowCycleId, cycle.id));
              console.log(`Expired access:         ${fullName}`);
            }
          }
        }
      }
    }

    created += 1;
  }

  console.log(`\nSeeded ${created} scenario record(s), run ${runId}.`);
  if (skipped.length > 0) {
    console.log(`Skipped: ${skipped.join("; ")}`);
  }
}

seedScenarios()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[seed-scenarios]", error);
    process.exit(1);
  });
