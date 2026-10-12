import { and, arrayOverlaps, count, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  notifications,
  registrationRequests,
  staffUsers,
} from "@/lib/db/schema";
import {
  DEFAULT_PAGE_SIZE,
  type Page,
  type PageRequest,
  pageOffset,
} from "@/lib/domain/pagination";
import { RegistrationError } from "@/lib/domain/registration-error";
import {
  type AccessPurpose,
  type ApplicableDocType,
  DOCUMENT_LABELS,
  type RegistrationType,
  type VisaType,
} from "@/lib/domain/types";
import {
  attachInvitationDocumentsToEngagement,
  getMissingRegistrationDocTypes,
} from "@/lib/services/document-service";
import {
  consumeInvitation,
  validateInvitationToken,
} from "@/lib/services/invitation-service";
import type { ReceptionFormInput } from "@/lib/services/workflow-service";

export type RegistrationRequest = typeof registrationRequests.$inferSelect;

type SubmittedFormData = ReceptionFormInput | LocalRegistrationFormInput;

type StaffUser = typeof staffUsers.$inferSelect;

export type LocalRegistrationFormInput = {
  person: {
    passportNo: string;
    fullName: string;
    dateOfBirth: string;
    gender: string;
    email: string | null;
    phone: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
  };
  accessPurpose: AccessPurpose;
  arrivalDate: string;
  departureDate: string;
  registrationData: {
    employmentStatus: string;
    telephoneOnSite: string;
    companyName: string;
    contactNameMonthly: string;
    contactEmail?: string;
    companyEmergencyName: string;
    companyEmergencyTel: string;
    gmcLiaisonPerson: string;
    reasonForRequest: string;
    airportPickup: boolean;
    transportTo: boolean;
    transportFrom: boolean;
    accommodationRequired: boolean;
    permanentAccessBadge: boolean;
    generalSiteInduction: boolean;
    otherInductions: boolean;
    bringingEquipment: boolean;
    ppeRequired: boolean;
    itAccessRequired: boolean;
    accessLevel: string;
    accommodationConfirmed: boolean;
    itineraryAttached: boolean;
    inflightUpdated: boolean;
    remarks: string;
  };
};

export async function createRegistrationRequest(
  token: string,
  formData: ReceptionFormInput | LocalRegistrationFormInput,
): Promise<{ request: RegistrationRequest; departmentHeads: StaffUser[] }> {
  const invitation = await validateInvitationToken(token);

  if (!invitation) {
    throw new RegistrationError(
      "invalid_invitation",
      "This invitation link is invalid, already used, or has been revoked",
    );
  }

  // Checked before consuming the token, so a submission blocked on a missing
  // document leaves the link still usable. The visa type comes from the
  // payload because it decides whether a visa document is compulsory at all.
  const submittedVisaType =
    "receptionData" in formData ? formData.receptionData.visaType : undefined;
  const missing = await getMissingRegistrationDocTypes(
    invitation.id,
    invitation.registrationType,
    submittedVisaType,
  );

  if (missing.length > 0) {
    throw new RegistrationError(
      "missing_documents",
      `Upload these documents before submitting: ${missing
        .map((docType) => DOCUMENT_LABELS[docType])
        .join(", ")}`,
      missing,
    );
  }

  // The invitation is the authority on who invited the visitor and for which
  // department. Both fields render read-only on the public form, so a payload
  // that disagrees could only have been crafted — overwrite, never trust.
  const submittedData: ReceptionFormInput | LocalRegistrationFormInput =
    "receptionData" in formData
      ? {
          ...formData,
          receptionData: {
            ...formData.receptionData,
            gmcLiaisonPerson: invitation.issuerName,
            gmcLiaisonDept: invitation.department,
          },
        }
      : {
          ...formData,
          registrationData: {
            ...formData.registrationData,
            gmcLiaisonPerson: invitation.issuerName,
          },
        };

  const { request, department } = await db.transaction(async (tx) => {
    const consumed = await consumeInvitation(token, tx);
    if (!consumed) {
      throw new RegistrationError(
        "invalid_invitation",
        "This invitation link is invalid, already used, or has been revoked",
      );
    }

    const [request] = await tx
      .insert(registrationRequests)
      .values({
        invitationId: consumed.id,
        department: consumed.department,
        registrationType: consumed.registrationType,
        formData: submittedData,
        status: "Approved",
        approvedBy: consumed.issuedBy,
        approvedAt: new Date(),
      })
      .returning();

    return { request, department: consumed.department };
  });

  const departmentHeads = await db
    .select()
    .from(staffUsers)
    .where(arrayOverlaps(staffUsers.workflowRoles, ["DepartmentHead"]));
  const matchingHeads = departmentHeads.filter(
    (head) => head.department === department,
  );

  if (matchingHeads.length > 0) {
    await db.insert(notifications).values(
      matchingHeads.map((head) => ({
        recipientStaffUserId: head.id,
        registrationRequestId: request.id,
        message: `A new pre-registration submission has arrived for ${department}.`,
      })),
    );
  }

  return { request, departmentHeads: matchingHeads };
}

export type RegistrationRequestSummary = {
  id: string;
  fullName: string;
  identityNo: string;
  registrationType: RegistrationType;
  department: string;
  accessPurpose: AccessPurpose;
  submittedAt: Date;
  engagementId: string | null;
};

// The visitor's own submission, as Reception sees it in its queue. `formData`
// is jsonb, so the two shapes (Foreign writes `receptionData`, Local writes
// `registrationData`) are narrowed here rather than in the page.
function summariseRequest(
  request: RegistrationRequest,
): RegistrationRequestSummary {
  // SAFETY: `form_data` is jsonb with no DB-level shape, and
  // `registration_type` is a free text column. Both are written only by
  // `createRegistrationRequest` from the typed payload above, so the cast
  // describes what this code wrote — and every field read off it is
  // defaulted below in case an older row predates it.
  const formData = request.formData as Partial<SubmittedFormData>;
  const registrationType = request.registrationType as RegistrationType;
  const accessPurpose = (formData.accessPurpose ?? "Work") as AccessPurpose;

  return {
    id: request.id,
    fullName: formData.person?.fullName ?? "Unknown",
    identityNo: formData.person?.passportNo ?? "—",
    registrationType,
    department: request.department,
    accessPurpose,
    submittedAt: request.createdAt,
    engagementId: request.engagementId,
  };
}

// Submissions can't be filtered in SQL on name or ID the way engagements can
// — both live inside the `form_data` jsonb, not in columns. Postgres can index
// into jsonb, but the keys differ by registration type (`receptionData` vs
// `registrationData`), so the search runs over the summarised rows instead.
// Volume here is bounded by invitations issued, not by every visitor ever.
export async function listRegistrationRequests(
  request: PageRequest & { registrationType?: RegistrationType } = {},
): Promise<Page<RegistrationRequestSummary>> {
  const page = request.page ?? 1;
  const pageSize = request.pageSize ?? DEFAULT_PAGE_SIZE;

  const rows = await db
    .select()
    .from(registrationRequests)
    .where(
      request.registrationType
        ? eq(registrationRequests.registrationType, request.registrationType)
        : undefined,
    )
    .orderBy(desc(registrationRequests.createdAt));

  const summaries = rows.map(summariseRequest);
  const search = request.search?.toLowerCase();

  const matched = search
    ? summaries.filter(
        (summary) =>
          summary.fullName.toLowerCase().includes(search) ||
          summary.identityNo.toLowerCase().includes(search),
      )
    : summaries;

  return {
    rows: matched.slice(pageOffset(page, pageSize), page * pageSize),
    total: matched.length,
    page,
    pageSize,
  };
}

// Counts for the All / Local / Foreign filter, which must reflect every
// submission rather than the page being shown.
export async function countRegistrationRequestsByType(): Promise<{
  all: number;
  Local: number;
  Foreign: number;
}> {
  const rows = await db
    .select({
      registrationType: registrationRequests.registrationType,
      value: count(),
    })
    .from(registrationRequests)
    .groupBy(registrationRequests.registrationType);

  const byType = { all: 0, Local: 0, Foreign: 0 };

  for (const row of rows) {
    byType.all += row.value;

    if (
      row.registrationType === "Local" ||
      row.registrationType === "Foreign"
    ) {
      byType[row.registrationType] += row.value;
    }
  }

  return byType;
}

export async function countOutstandingRegistrationRequests(): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(registrationRequests)
    .where(isNull(registrationRequests.engagementId));

  return row?.value ?? 0;
}

export async function getRegistrationRequest(
  requestId: string,
): Promise<RegistrationRequest | undefined> {
  const [request] = await db
    .select()
    .from(registrationRequests)
    .where(eq(registrationRequests.id, requestId));

  return request;
}

// Called once Reception has created the Engagement. Scoped to rows that are
// still unlinked so a double submit can't repoint an already-converted
// request at a second Engagement.
export async function linkRequestToEngagement(
  requestId: string,
  engagementId: string,
): Promise<void> {
  const [linked] = await db
    .update(registrationRequests)
    .set({ engagementId, status: "Converted" })
    .where(
      and(
        eq(registrationRequests.id, requestId),
        isNull(registrationRequests.engagementId),
      ),
    )
    .returning();

  // Nothing came back means the request was already converted, so its
  // documents belong to that first Engagement — leave them alone.
  if (!linked) {
    return;
  }

  // The visitor's own uploads move with the submission. Without this they
  // stay attached to the invitation and Reception's uploads section looks
  // empty even though the visitor supplied everything.
  await attachInvitationDocumentsToEngagement(
    linked.invitationId,
    engagementId,
  );
}

// What Reception supplies on top of a submission. Everything here is either a
// field the public forms never ask for (the Administration four, applicable
// documents) or one only the Local form omits (nationality, visa answers).
export type RegistrationCompletion = {
  nationality?: string;
  ghanaVisaRequired?: boolean;
  visaType?: VisaType;
  applicableDocuments: ApplicableDocType[];
  accommodationConfirmed: boolean;
  itineraryAttached: boolean;
  inflightUpdated: boolean;
  remarks: string;
};

// Builds the Engagement payload from the stored submission plus Reception's
// additions. Server-side on purpose: the visitor's own answers come from the
// row, never from the browser, so nothing between the two can be edited by a
// crafted request.
export function buildEngagementInput(
  request: RegistrationRequest,
  completion: RegistrationCompletion,
): ReceptionFormInput {
  // SAFETY: `form_data` is jsonb written only by `createRegistrationRequest`
  // from one of these two typed payloads; every field read below is either
  // required by both shapes or defaulted.
  const submitted = request.formData as SubmittedFormData;
  const details =
    "receptionData" in submitted
      ? submitted.receptionData
      : submitted.registrationData;

  const foreign = "receptionData" in submitted ? submitted.receptionData : null;

  return {
    person: {
      ...submitted.person,
      // A Local submission has no nationality field, so Reception supplies it.
      nationality:
        "nationality" in submitted.person
          ? submitted.person.nationality
          : (completion.nationality ?? ""),
    },
    accessPurpose: submitted.accessPurpose,
    arrivalDate: submitted.arrivalDate,
    departureDate: submitted.departureDate,
    receptionData: {
      employmentStatus: details.employmentStatus,
      telephoneOnSite: details.telephoneOnSite,
      companyName: details.companyName,
      contactNameMonthly: details.contactNameMonthly,
      contactEmail: details.contactEmail,
      companyEmergencyName: details.companyEmergencyName,
      companyEmergencyTel: details.companyEmergencyTel,
      gmcLiaisonPerson: details.gmcLiaisonPerson,
      // Local submissions don't carry a department — the invitation does.
      gmcLiaisonDept: foreign?.gmcLiaisonDept ?? request.department,
      reasonForRequest: details.reasonForRequest,
      airportPickup: details.airportPickup,
      pickupDate: foreign?.pickupDate,
      transportTo: details.transportTo,
      transportFrom: details.transportFrom,
      accommodationRequired: details.accommodationRequired,
      accommodationLocation: foreign?.accommodationLocation,
      permanentAccessBadge: details.permanentAccessBadge,
      ghanaVisaRequired:
        foreign?.ghanaVisaRequired ?? completion.ghanaVisaRequired ?? false,
      generalSiteInduction: details.generalSiteInduction,
      otherInductions: details.otherInductions,
      bringingEquipment: details.bringingEquipment,
      ppeRequired: details.ppeRequired,
      itAccessRequired: details.itAccessRequired,
      visaType: foreign?.visaType ?? completion.visaType ?? "Tourist Visa",
      accessLevel: details.accessLevel,
      accommodationConfirmed: completion.accommodationConfirmed,
      itineraryAttached: completion.itineraryAttached,
      inflightUpdated: completion.inflightUpdated,
      remarks: completion.remarks,
      applicableDocuments: completion.applicableDocuments,
    },
  };
}
