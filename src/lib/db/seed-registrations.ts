import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  documents,
  invitations,
  registrationRequests,
  staffUsers,
} from "@/lib/db/schema";
import {
  getRequiredRegistrationDocTypes,
  type VisaType,
} from "@/lib/domain/types";
import type { ReceptionFormInput } from "@/lib/services/workflow-service";

// Dummy registration submissions for local development, so Reception's
// "Submitted Registrations" queue has something to act on without having to
// walk an invitation link end to end. Never run this against production.
//
// Each submission needs an invitation to hang off (the FK is notNull and
// unique), so one consumed invitation is created per row — exactly what a
// real submission leaves behind.

const SEED_EMAIL_DOMAIN = "@seed.gmc.local";

// Typed against the real payload the public foreign form submits, so a seeded
// row can never drift into a shape Reception's prefill cannot read.
type SeedSubmission = {
  email: string;
  department: string;
  registrationType: "Foreign";
  formData: ReceptionFormInput;
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
  employmentStatus: string;
  companyName: string;
  liaisonPerson: string;
  accessPurpose: "Work" | "Visit" | "VisitMine";
  arrivalDate: string;
  departureDate: string;
  visaType: VisaType;
  accessLevel: string;
  airportPickup: boolean;
  // Left out when no accommodation was requested — the location and the flag
  // always move together, the way the form submits them.
  accommodationLocation?: string;
  itAccessRequired: boolean;
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
        employmentStatus: input.employmentStatus,
        telephoneOnSite: "+233 244000222",
        companyName: input.companyName,
        contactNameMonthly: "Monthly Reporting Contact",
        contactEmail: `reports${SEED_EMAIL_DOMAIN}`,
        companyEmergencyName: "Company Emergency Contact",
        companyEmergencyTel: "+233 244000333",
        gmcLiaisonPerson: input.liaisonPerson,
        gmcLiaisonDept: input.department,
        reasonForRequest: input.reasonForRequest,
        airportPickup: input.airportPickup,
        pickupDate: input.airportPickup ? input.arrivalDate : undefined,
        transportTo: true,
        transportFrom: false,
        accommodationRequired: Boolean(input.accommodationLocation),
        accommodationLocation: input.accommodationLocation,
        permanentAccessBadge: false,
        ghanaVisaRequired: true,
        generalSiteInduction: true,
        otherInductions: false,
        bringingEquipment: true,
        ppeRequired: true,
        itAccessRequired: input.itAccessRequired,
        visaType: input.visaType,
        accessLevel: input.accessLevel,
        accommodationConfirmed: false,
        itineraryAttached: false,
        inflightUpdated: false,
        remarks: "",
        // Reception marks the applicable documents once it picks the
        // submission up — the visitor never sets these.
        applicableDocuments: [],
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
    nationality: "Chinese",
    phone: "+86 13800138000",
    employmentStatus: "Contractor",
    companyName: "Ningxia Tianyuan Engineering Ltd",
    liaisonPerson: "Kwame Mensah",
    accessPurpose: "Work",
    arrivalDate: "2026-11-03",
    departureDate: "2027-02-28",
    visaType: "Work Visa",
    accessLevel: "Contractor/Service Personnel Access",
    airportPickup: true,
    accommodationLocation: "Tarkwa",
    itAccessRequired: false,
    reasonForRequest: "Commissioning of the new crushing circuit.",
  }),
  foreignSubmission({
    email: `zhang.min${SEED_EMAIL_DOMAIN}`,
    department: "Carbonate Plant",
    passportNo: "EJ7733410",
    fullName: "Zhang Min",
    dateOfBirth: "1991-09-25",
    gender: "Female",
    nationality: "Chinese",
    phone: "+86 13912345678",
    employmentStatus: "Visitor(Expatriate)",
    companyName: "Ningxia Tianyuan Engineering Ltd",
    liaisonPerson: "Abena Owusu",
    accessPurpose: "VisitMine",
    arrivalDate: "2026-10-28",
    departureDate: "2026-11-11",
    visaType: "Business Visa",
    accessLevel: "Visitor Access",
    airportPickup: true,
    accommodationLocation: "Takoradi",
    itAccessRequired: false,
    reasonForRequest: "Process audit of the carbonate plant.",
  }),
  foreignSubmission({
    email: `d.okonkwo${SEED_EMAIL_DOMAIN}`,
    department: "Mine Maintenance (EME)",
    passportNo: "A09881234",
    fullName: "Daniel Okonkwo",
    dateOfBirth: "1979-01-30",
    gender: "Male",
    nationality: "Nigerian",
    phone: "+234 8030001122",
    employmentStatus: "Contractor",
    companyName: "Sahel Heavy Equipment Services",
    liaisonPerson: "Yaw Boateng",
    accessPurpose: "Work",
    arrivalDate: "2026-11-17",
    departureDate: "2026-12-20",
    visaType: "Visa on Arrival",
    accessLevel: "Contractor/Service Personnel Access",
    airportPickup: true,
    accommodationLocation: "Tarkwa",
    itAccessRequired: false,
    reasonForRequest: "Overhaul of two haul trucks.",
  }),
  foreignSubmission({
    email: `r.kumar${SEED_EMAIL_DOMAIN}`,
    department: "Assay Lab",
    passportNo: "Z4482910",
    fullName: "Rajesh Kumar",
    dateOfBirth: "1983-07-08",
    gender: "Male",
    nationality: "Indian",
    phone: "+91 9811122233",
    employmentStatus: "Contractor",
    companyName: "Hindustan Analytical Instruments",
    liaisonPerson: "Esi Darko",
    accessPurpose: "Work",
    arrivalDate: "2026-11-09",
    departureDate: "2027-01-15",
    visaType: "Work Visa",
    accessLevel: "Operational Employee Access",
    airportPickup: true,
    accommodationLocation: "Nsuta",
    itAccessRequired: true,
    reasonForRequest: "Install and calibrate the new XRF analyser.",
  }),
  foreignSubmission({
    email: `t.molefe${SEED_EMAIL_DOMAIN}`,
    department: "Mining",
    passportNo: "M00841277",
    fullName: "Thabo Molefe",
    dateOfBirth: "1987-03-21",
    gender: "Male",
    nationality: "South African",
    phone: "+27 831234567",
    employmentStatus: "Visitor(Expatriate)",
    companyName: "Rand Mining Consultants",
    liaisonPerson: "Kwame Mensah",
    accessPurpose: "VisitMine",
    arrivalDate: "2026-10-26",
    departureDate: "2026-10-31",
    visaType: "Business Visa",
    accessLevel: "Visitor Access",
    airportPickup: false,
    accommodationLocation: "Tarkwa",
    itAccessRequired: false,
    reasonForRequest: "Pit geotechnical review with the mining team.",
  }),
  foreignSubmission({
    email: `e.clarke${SEED_EMAIL_DOMAIN}`,
    department: "Social Responsibility & External Relations",
    passportNo: "561203448",
    fullName: "Emma Clarke",
    dateOfBirth: "1990-11-14",
    gender: "Female",
    nationality: "British",
    phone: "+44 7912345678",
    employmentStatus: "Visitor(Expatriate)",
    companyName: "Lonrho Community Partners",
    liaisonPerson: "Nana Adjei",
    accessPurpose: "Visit",
    arrivalDate: "2026-10-21",
    departureDate: "2026-10-23",
    visaType: "Business Visa",
    accessLevel: "Visitor Access",
    airportPickup: true,
    accommodationLocation: "Accra",
    itAccessRequired: false,
    reasonForRequest: "Community development programme review.",
  }),
  foreignSubmission({
    email: `l.brandt${SEED_EMAIL_DOMAIN}`,
    department: "Mine Maintenance (EME)",
    passportNo: "C7HN24M91",
    fullName: "Lukas Brandt",
    dateOfBirth: "1981-05-02",
    gender: "Male",
    nationality: "German",
    phone: "+49 17012345678",
    employmentStatus: "Contractor",
    companyName: "Siemag Conveyor Systems GmbH",
    liaisonPerson: "Yaw Boateng",
    accessPurpose: "Work",
    arrivalDate: "2026-12-01",
    departureDate: "2027-03-05",
    visaType: "Work Visa",
    accessLevel: "Contractor/Service Personnel Access",
    airportPickup: true,
    accommodationLocation: "Tarkwa",
    itAccessRequired: true,
    reasonForRequest: "Conveyor drive replacement at the washing plant.",
  }),
  foreignSubmission({
    email: `s.tremblay${SEED_EMAIL_DOMAIN}`,
    department: "Information Technology",
    passportNo: "HK402288",
    fullName: "Sophie Tremblay",
    dateOfBirth: "1993-02-17",
    gender: "Female",
    nationality: "Canadian",
    phone: "+1 6472345678",
    employmentStatus: "Visitor(Expatriate)",
    companyName: "Northbridge Network Solutions",
    liaisonPerson: "Nana Adjei",
    accessPurpose: "Visit",
    arrivalDate: "2026-11-24",
    departureDate: "2026-11-27",
    visaType: "Business Visa",
    accessLevel: "Standard Employee Access",
    airportPickup: true,
    accommodationLocation: "Accra",
    itAccessRequired: true,
    reasonForRequest: "Scoping the site network upgrade.",
  }),
  foreignSubmission({
    email: `c.oliveira${SEED_EMAIL_DOMAIN}`,
    department: "Carbonate Plant",
    passportNo: "FX889034",
    fullName: "Carlos Oliveira",
    dateOfBirth: "1984-09-30",
    gender: "Male",
    nationality: "Brazilian",
    phone: "+55 21987654321",
    employmentStatus: "Contractor",
    companyName: "Rio Process Engineering Ltda",
    liaisonPerson: "Abena Owusu",
    accessPurpose: "Work",
    arrivalDate: "2026-11-30",
    departureDate: "2027-02-10",
    visaType: "Work Visa",
    accessLevel: "Operational Employee Access",
    airportPickup: true,
    accommodationLocation: "Takoradi",
    itAccessRequired: false,
    reasonForRequest: "Carbonate plant throughput optimisation.",
  }),
  foreignSubmission({
    email: `m.yilmaz${SEED_EMAIL_DOMAIN}`,
    department: "Human Capital",
    passportNo: "U18442907",
    fullName: "Mehmet Yilmaz",
    dateOfBirth: "1989-06-11",
    gender: "Male",
    nationality: "Turkish",
    phone: "+90 5321234567",
    employmentStatus: "Visitor(Expatriate)",
    companyName: "Anadolu Mining Services",
    liaisonPerson: "Esi Darko",
    accessPurpose: "VisitMine",
    arrivalDate: "2026-12-08",
    departureDate: "2026-12-14",
    visaType: "Business Visa",
    accessLevel: "Visitor Access",
    airportPickup: false,
    itAccessRequired: false,
    reasonForRequest:
      "Pre-contract site familiarisation for the drilling tender.",
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

    // A Visa-on-Arrival visitor has no visa document to upload yet, so the
    // seeded set follows the same rule the public form enforces.
    const submission = SUBMISSIONS.find(
      (candidate) => candidate.email === invitation.email,
    );

    const docTypes = getRequiredRegistrationDocTypes(
      registrationType,
      submission?.formData.receptionData.visaType,
    );

    for (const docType of docTypes) {
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
