import { z } from "zod";

import type { ReceptionFormValues } from "@/components/workflow/reception-form";

// `registration_requests.form_data` is jsonb with no shape guaranteed by the
// database, so it is parsed here rather than trusted. Every field is optional
// and `.catch(undefined)` keeps one bad value from failing the whole parse:
// a Local submission has no nationality or visa answers, and an older row may
// predate a field entirely.
const optionalText = z.string().min(1).optional().catch(undefined);

const optionalFlag = z.boolean().optional().catch(undefined);

const personSchema = z
  .object({
    passportNo: optionalText,
    fullName: optionalText,
    dateOfBirth: optionalText,
    gender: optionalText,
    nationality: optionalText,
    email: optionalText,
    phone: optionalText,
    emergencyContactName: optionalText,
    emergencyContactPhone: optionalText,
  })
  .optional()
  .catch(undefined);

const detailsSchema = z
  .object({
    employmentStatus: optionalText,
    telephoneOnSite: optionalText,
    companyName: optionalText,
    contactNameMonthly: optionalText,
    contactEmail: optionalText,
    companyEmergencyName: optionalText,
    companyEmergencyTel: optionalText,
    gmcLiaisonPerson: optionalText,
    gmcLiaisonDept: optionalText,
    reasonForRequest: optionalText,
    pickupDate: optionalText,
    accommodationLocation: optionalText,
    accessLevel: optionalText,
    remarks: optionalText,
    visaType: z
      .enum([
        "Tourist Visa",
        "Business Visa",
        "Work Visa",
        "Transit Visa",
        "Diplomatic Visa",
        "Visa on Arrival",
      ])
      .optional()
      .catch(undefined),
    airportPickup: optionalFlag,
    transportTo: optionalFlag,
    transportFrom: optionalFlag,
    accommodationRequired: optionalFlag,
    permanentAccessBadge: optionalFlag,
    ghanaVisaRequired: optionalFlag,
    generalSiteInduction: optionalFlag,
    otherInductions: optionalFlag,
    bringingEquipment: optionalFlag,
    ppeRequired: optionalFlag,
    itAccessRequired: optionalFlag,
  })
  .optional()
  .catch(undefined);

// Foreign submissions nest their answers under `receptionData`, Local ones
// under `registrationData`; neither ever carries both.
const submittedPayloadSchema = z.object({
  person: personSchema,
  accessPurpose: z
    .enum(["Work", "Visit", "VisitMine"])
    .optional()
    .catch(undefined),
  arrivalDate: optionalText,
  departureDate: optionalText,
  receptionData: detailsSchema,
  registrationData: detailsSchema,
});

// Assigning only defined values matters: react-hook-form merges this over its
// own defaults, and an explicit `undefined` would wipe the default rather than
// leave it in place.
function assign<TKey extends keyof ReceptionFormValues>(
  target: Partial<ReceptionFormValues>,
  key: TKey,
  value: ReceptionFormValues[TKey] | undefined,
): void {
  if (value !== undefined) {
    target[key] = value;
  }
}

// Maps a visitor's submission onto the Reception form, so the Receptionist
// reviews and corrects rather than retypes.
// `formData` stays `unknown`: this is the parsing boundary for the jsonb
// column, and the schema below is what establishes its shape.
export function registrationRequestToFormValues(
  formData: unknown,
): Partial<ReceptionFormValues> {
  const parsed = submittedPayloadSchema.safeParse(formData);

  if (!parsed.success) {
    return {};
  }

  const { person = {}, receptionData, registrationData } = parsed.data;
  const details = receptionData ?? registrationData ?? {};
  const values: Partial<ReceptionFormValues> = {};

  assign(values, "passportNo", person.passportNo);
  assign(values, "fullName", person.fullName);
  assign(values, "dateOfBirth", person.dateOfBirth);
  assign(values, "gender", person.gender);
  assign(values, "nationality", person.nationality);
  assign(values, "email", person.email);
  assign(values, "phone", person.phone);
  assign(values, "emergencyContactName", person.emergencyContactName);
  assign(values, "emergencyContactPhone", person.emergencyContactPhone);
  assign(values, "accessPurpose", parsed.data.accessPurpose);
  assign(values, "arrivalDate", parsed.data.arrivalDate);
  assign(values, "departureDate", parsed.data.departureDate);
  assign(values, "employmentStatus", details.employmentStatus);
  assign(values, "telephoneOnSite", details.telephoneOnSite);
  assign(values, "companyName", details.companyName);
  assign(values, "contactNameMonthly", details.contactNameMonthly);
  assign(values, "contactEmail", details.contactEmail);
  assign(values, "companyEmergencyName", details.companyEmergencyName);
  assign(values, "companyEmergencyTel", details.companyEmergencyTel);
  assign(values, "gmcLiaisonPerson", details.gmcLiaisonPerson);
  assign(values, "gmcLiaisonDept", details.gmcLiaisonDept);
  assign(values, "reasonForRequest", details.reasonForRequest);
  assign(values, "pickupDate", details.pickupDate);
  assign(values, "accommodationLocation", details.accommodationLocation);
  assign(values, "accessLevel", details.accessLevel);
  assign(values, "remarks", details.remarks);
  assign(values, "visaType", details.visaType);
  assign(values, "airportPickup", details.airportPickup);
  assign(values, "transportTo", details.transportTo);
  assign(values, "transportFrom", details.transportFrom);
  assign(values, "accommodationRequired", details.accommodationRequired);
  assign(values, "permanentAccessBadge", details.permanentAccessBadge);
  assign(values, "ghanaVisaRequired", details.ghanaVisaRequired);
  assign(values, "generalSiteInduction", details.generalSiteInduction);
  assign(values, "otherInductions", details.otherInductions);
  assign(values, "bringingEquipment", details.bringingEquipment);
  assign(values, "ppeRequired", details.ppeRequired);
  assign(values, "itAccessRequired", details.itAccessRequired);

  return values;
}
