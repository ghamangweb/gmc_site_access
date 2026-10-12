import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  documents,
  invitations,
  registrationRequests,
  staffUsers,
} from "@/lib/db/schema";
import { REGISTRATION_DOCUMENT_TYPES, type VisaType } from "@/lib/domain/types";
import type { LocalRegistrationFormInput } from "@/lib/services/registration-service";
import type { ReceptionFormInput } from "@/lib/services/workflow-service";

// Dummy pre-registration submissions for local development, so Reception's
// "Submitted Registrations" queue has something to act on without having to
// walk an invitation link end to end. Never run this against production.
//
// Each submission needs an invitation to hang off (the FK is notNull and
// unique), so one consumed invitation is created per row — exactly what a
// real submission leaves behind.

const SEED_EMAIL_DOMAIN = "@seed.gmc.local";

// Typed against the real payloads the two public forms submit, so a seeded
// row can never drift into a shape Reception's prefill cannot read.
type SeedSubmission = {
  email: string;
  department: string;
  registrationType: "Foreign" | "Local";
  formData: ReceptionFormInput | LocalRegistrationFormInput;
};

function foreignSubmission(input: {
  email: string;
  department: string;
  passportNo: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  phone: string;
  companyName: string;
  liaisonPerson: string;
  accessPurpose: "Work" | "Visit" | "VisitMine";
  arrivalDate: string;
  departureDate: string;
  visaType: VisaType;
  reasonForRequest: string;
}): SeedSubmission {
  return {
    email: input.email,
    department: input.department,
    registrationType: "Foreign",
    formData: {
      person: {
        passportNo: input.passportNo,
        fullName: input.fullName,
        dateOfBirth: input.dateOfBirth,
        gender: input.gender,
        nationality: input.nationality,
        email: input.email,
        phone: input.phone,
        emergencyContactName: "Emergency Contact",
        emergencyContactPhone: "+233 244000111",
      },
      accessPurpose: input.accessPurpose,
      arrivalDate: input.arrivalDate,
      departureDate: input.departureDate,
      receptionData: {
        employmentStatus: "Contractor",
        telephoneOnSite: "+233 244000222",
        companyName: input.companyName,
        contactNameMonthly: "Monthly Reporting Contact",
        contactEmail: `reports${SEED_EMAIL_DOMAIN}`,
        companyEmergencyName: "Company Emergency Contact",
        companyEmergencyTel: "+233 244000333",
        gmcLiaisonPerson: input.liaisonPerson,
        gmcLiaisonDept: input.department,
        reasonForRequest: input.reasonForRequest,
        airportPickup: true,
        pickupDate: input.arrivalDate,
        transportTo: true,
        transportFrom: false,
        accommodationRequired: true,
        accommodationLocation: "Tarkwa",
        permanentAccessBadge: false,
        ghanaVisaRequired: true,
        generalSiteInduction: true,
        otherInductions: false,
        bringingEquipment: true,
        ppeRequired: true,
        itAccessRequired: false,
        visaType: input.visaType,
        accessLevel: "Contractor/Service Personnel Access",
        accommodationConfirmed: false,
        itineraryAttached: false,
        inflightUpdated: false,
        remarks: "",
        applicableDocuments: [],
      },
    },
  };
}

function localSubmission(input: {
  email: string;
  department: string;
  ghanaCardNo: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  companyName: string;
  liaisonPerson: string;
  accessPurpose: "Work" | "Visit" | "VisitMine";
  arrivalDate: string;
  departureDate: string;
  reasonForRequest: string;
}): SeedSubmission {
  return {
    email: input.email,
    department: input.department,
    registrationType: "Local",
    formData: {
      person: {
        passportNo: input.ghanaCardNo,
        fullName: input.fullName,
        dateOfBirth: input.dateOfBirth,
        gender: input.gender,
        email: input.email,
        phone: input.phone,
        emergencyContactName: "Emergency Contact",
        emergencyContactPhone: "+233 244000444",
      },
      accessPurpose: input.accessPurpose,
      arrivalDate: input.arrivalDate,
      departureDate: input.departureDate,
      registrationData: {
        employmentStatus: "Contractor",
        telephoneOnSite: "+233 244000555",
        companyName: input.companyName,
        contactNameMonthly: "Monthly Reporting Contact",
        contactEmail: `reports${SEED_EMAIL_DOMAIN}`,
        companyEmergencyName: "Company Emergency Contact",
        companyEmergencyTel: "+233 244000666",
        gmcLiaisonPerson: input.liaisonPerson,
        reasonForRequest: input.reasonForRequest,
        airportPickup: false,
        transportTo: true,
        transportFrom: true,
        accommodationRequired: false,
        permanentAccessBadge: false,
        generalSiteInduction: true,
        otherInductions: false,
        bringingEquipment: false,
        ppeRequired: true,
        itAccessRequired: true,
        accessLevel: "Visitor Access",
        accommodationConfirmed: false,
        itineraryAttached: false,
        inflightUpdated: false,
        remarks: "",
      },
    },
  };
}

const SUBMISSIONS: SeedSubmission[] = [
  foreignSubmission({
    email: `li.wei${SEED_EMAIL_DOMAIN}`,
    department: "Mining",
    passportNo: "EH4821966",
    fullName: "Li Wei",
    dateOfBirth: "1986-04-12",
    gender: "Male",
    nationality: "China",
    phone: "+86 13800138000",
    companyName: "Ningxia Tianyuan Engineering Ltd",
    liaisonPerson: "Kwame Mensah",
    accessPurpose: "Work",
    arrivalDate: "2026-11-03",
    departureDate: "2027-02-28",
    visaType: "Work Visa",
    reasonForRequest: "Commissioning of the new crushing circuit.",
  }),
  foreignSubmission({
    email: `zhang.min${SEED_EMAIL_DOMAIN}`,
    department: "Carbonate Plant",
    passportNo: "EJ7733410",
    fullName: "Zhang Min",
    dateOfBirth: "1991-09-25",
    gender: "Female",
    nationality: "China",
    phone: "+86 13900139000",
    companyName: "Ningxia Tianyuan Engineering Ltd",
    liaisonPerson: "Abena Owusu",
    accessPurpose: "VisitMine",
    arrivalDate: "2026-10-28",
    departureDate: "2026-11-11",
    visaType: "Business Visa",
    reasonForRequest: "Process audit of the carbonate plant.",
  }),
  foreignSubmission({
    email: `d.okonkwo${SEED_EMAIL_DOMAIN}`,
    department: "Mine Maintenance (EME)",
    passportNo: "A09881234",
    fullName: "Daniel Okonkwo",
    dateOfBirth: "1979-01-30",
    gender: "Male",
    nationality: "Nigeria",
    phone: "+234 8030001122",
    companyName: "Sahel Heavy Equipment Services",
    liaisonPerson: "Yaw Boateng",
    accessPurpose: "Work",
    arrivalDate: "2026-11-17",
    departureDate: "2026-12-20",
    visaType: "Visa on Arrival",
    reasonForRequest: "Overhaul of two haul trucks.",
  }),
  localSubmission({
    email: `ama.asante${SEED_EMAIL_DOMAIN}`,
    department: "Human Capital",
    ghanaCardNo: "GHA-723451908-4",
    fullName: "Ama Asante",
    dateOfBirth: "1994-06-18",
    gender: "Female",
    phone: "+233 244112233",
    companyName: "Takoradi Occupational Health Services",
    liaisonPerson: "Esi Darko",
    accessPurpose: "Visit",
    arrivalDate: "2026-10-20",
    departureDate: "2026-10-22",
    reasonForRequest: "Occupational health review meeting.",
  }),
  localSubmission({
    email: `kofi.annan${SEED_EMAIL_DOMAIN}`,
    department: "Information Technology",
    ghanaCardNo: "GHA-559201776-1",
    fullName: "Kofi Annan",
    dateOfBirth: "1988-12-02",
    gender: "Male",
    phone: "+233 201445566",
    companyName: "Accra Network Systems",
    liaisonPerson: "Nana Adjei",
    accessPurpose: "VisitMine",
    arrivalDate: "2026-11-05",
    departureDate: "2026-11-08",
    reasonForRequest: "Install network links at the mine site office.",
  }),
];

async function seedRegistrations() {
  const [issuer] = await db
    .select()
    .from(staffUsers)
    .where(eq(staffUsers.systemRole, "SystemAdmin"));

  if (!issuer) {
    throw new Error(
      "No staff user to attribute the seeded invitations to — run `bun run db:seed` first",
    );
  }

  const existing = await db.select().from(invitations);

  const alreadySeeded = existing.filter((invitation) =>
    invitation.email.endsWith(SEED_EMAIL_DOMAIN),
  );

  if (alreadySeeded.length > 0) {
    console.log(
      `${alreadySeeded.length} seeded submission(s) already present — leaving them as they are.`,
    );

    // Documents are seeded separately and per-invitation, so an existing set
    // of submissions can still gain them (e.g. after the token is added).
    await seedDocuments();

    return;
  }

  for (const submission of SUBMISSIONS) {
    // Hashed like a real token, and marked consumed: a submitted invitation
    // is spent, and its link must not still open the form.
    const tokenHash = createHash("sha256")
      .update(randomBytes(32).toString("hex"))
      .digest("hex");

    const [invitation] = await db
      .insert(invitations)
      .values({
        department: submission.department,
        registrationType: submission.registrationType,
        email: submission.email,
        tokenHash,
        issuedBy: issuer.id,
        consumedAt: new Date(),
      })
      .returning();

    await db.insert(registrationRequests).values({
      invitationId: invitation.id,
      department: submission.department,
      registrationType: submission.registrationType,
      formData: submission.formData,
      status: "Approved",
      approvedBy: issuer.id,
      approvedAt: new Date(),
    });
  }

  console.log(`Seeded ${SUBMISSIONS.length} registration submissions.`);

  await seedDocuments();
}

// A 1×1 PNG. Real bytes rather than a placeholder row: the documents a seeded
// submission carries must open from Reception, and a fabricated file key
// cannot be turned into a signed URL.
const PIXEL_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

// Only runs when UPLOADTHING_TOKEN is configured — without it there is no
// storage to upload to, and the submissions are still perfectly usable for
// everything except the document hand-off.
async function seedDocuments() {
  const hasToken = Boolean(process.env.UPLOADTHING_TOKEN);

  const seeded = await db.select().from(invitations);

  const seededInvitations = seeded.filter((invitation) =>
    invitation.email.endsWith(SEED_EMAIL_DOMAIN),
  );

  const existingDocuments = await db.select().from(documents);
  let uploaded = 0;

  for (const invitation of seededInvitations) {
    const alreadyHasDocuments = existingDocuments.some(
      (document) => document.invitationId === invitation.id,
    );

    if (alreadyHasDocuments) {
      continue;
    }

    const registrationType =
      invitation.registrationType === "Local" ? "Local" : "Foreign";

    for (const docType of REGISTRATION_DOCUMENT_TYPES[registrationType]) {
      const fileName = `${docType}-${invitation.email.split("@")[0]}.png`;

      const stored = hasToken
        ? await uploadSeedFile(fileName)
        : placeholderFile(fileName);

      if (!stored) {
        continue;
      }

      await db.insert(documents).values({
        invitationId: invitation.id,
        docType,
        fileKey: stored.fileKey,
        fileUrl: stored.fileUrl,
        fileName,
        contentType: "image/png",
      });

      uploaded += 1;
    }
  }

  if (uploaded === 0) {
    console.log("Seeded submissions already have their documents.");

    return;
  }

  console.log(
    hasToken
      ? `Uploaded and attached ${uploaded} document(s).`
      : `Attached ${uploaded} placeholder document(s). No UPLOADTHING_TOKEN, so these rows have no file behind them — they list and hand off correctly, but View won't open. Delete them and re-run once the token is set to get real files.`,
  );
}

type StoredFile = { fileKey: string; fileUrl: string };

// Real bytes, so the document opens from Reception.
async function uploadSeedFile(fileName: string): Promise<StoredFile | null> {
  const { UTApi } = await import("uploadthing/server");
  const utapi = new UTApi();

  const file = new File([Buffer.from(PIXEL_PNG_BASE64, "base64")], fileName, {
    type: "image/png",
  });

  const result = await utapi.uploadFiles(file);

  if (result.error || !result.data) {
    console.error(
      `[seed-registrations] upload failed for ${fileName}:`,
      result.error,
    );

    return null;
  }

  return { fileKey: result.data.key, fileUrl: result.data.ufsUrl };
}

// No storage behind these. The key is deliberately recognisable so a stray
// row is obvious, and the URL ends in the file name so the uploader renders
// it the way it renders a real one.
function placeholderFile(fileName: string): StoredFile {
  return {
    fileKey: `seed-placeholder-${randomBytes(8).toString("hex")}`,
    fileUrl: `https://seed.gmc.local/documents/${fileName}`,
  };
}

seedRegistrations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[seed-registrations]", error);
    process.exit(1);
  });
