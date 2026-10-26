export type SystemRole = "User" | "Guest" | "Admin" | "SystemAdmin";

export type WorkflowRole =
  | "Receptionist"
  | StakeholderRole
  | "HospitalStaff"
  | "TrainingStaff"
  | "SecurityStaff"
  | "DepartmentHead";

export const GMC_LIAISON_DEPARTMENTS = [
  "Mining",
  "Mine Maintenance (EME)",
  "Carbonate Plant",
  "Assay Lab",
  "Information Technology",
  "Human Capital",
  "Social Responsibility & External Relations",
] as const;

export type GmcLiaisonDepartment = (typeof GMC_LIAISON_DEPARTMENTS)[number];

export type RegistrationType = "Local" | "Foreign";

// `error`/`warning` stay English sentences — every existing staff call site
// renders them directly. The public registration form is the only client
// that translates, so it reads `errorCode` when present and falls back to the
// sentence. `missingDocTypes` carries the parameters of the one code that
// needs them.
export type ActionErrorCode =
  | "invalid_invitation"
  | "missing_documents"
  | "submit_failed";

export type ActionResult =
  | { success: true; warning?: string; warningCode?: string }
  | {
      success: false;
      error: string;
      errorCode?: ActionErrorCode;
      missingDocTypes?: DocType[];
    };

export type AccessPurpose = "Work" | "Visit" | "VisitMine";

export const ACCESS_PURPOSE_LABELS: Record<AccessPurpose, string> = {
  Work: "Require mine site access",
  Visit: "Familiarization Visit",
  VisitMine: "Require Mine Tour",
};

export type WorkflowState =
  | "Draft"
  | "AtReception"
  | "AtHospital"
  | "AtTraining"
  | "AtSecurity"
  | "Completed"
  | "Cancelled";

// What a workflow state is called on screen. The stored values keep their
// `At…` prefix — they are the state machine's own vocabulary — but a badge
// reading "AtHospital" just names the layer the record is sitting in, so the
// label drops the prefix. Single source, like ACCESS_PURPOSE_LABELS.
export const WORKFLOW_STATE_LABELS: Record<WorkflowState, string> = {
  Draft: "Draft",
  AtReception: "Reception",
  AtHospital: "Hospital",
  AtTraining: "Training",
  AtSecurity: "Security",
  Completed: "Completed",
  Cancelled: "Cancelled",
};

export type AccessState =
  | "Pending"
  | "Active"
  | "Expired"
  | "TerminationRequested"
  | "Terminated";

// What an access state is called on screen. "Termination" is the stored,
// internal word; the people using the screens say revoke.
export const ACCESS_STATE_LABELS: Record<AccessState, string> = {
  Pending: "Pending",
  Active: "Active",
  Expired: "Expired",
  TerminationRequested: "Revocation Requested",
  Terminated: "Revoked",
};

// Today as YYYY-MM-DD in UTC, the same shape as the date columns. Ghana is on
// UTC, so this is also the local date.
export function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

// What a record's access really is right now. `access_state` is only written
// when something happens, and nothing happens when a card simply runs out, so
// an Active record whose card has lapsed is Expired whatever the column says.
// A card is valid through its expiry date, so it lapses the day after.
export function getEffectiveAccessState(
  accessState: AccessState,
  cardExpiry: string | undefined,
): AccessState {
  return accessState === "Active" && cardExpiry && cardExpiry < isoToday()
    ? "Expired"
    : accessState;
}

// A runtime tuple, not just a union: the UploadThing file router validates
// the incoming docType with `z.enum(DOC_TYPES)`, which needs real values.
// `DocType` is derived from it, so the two can never drift.
export const DOC_TYPES = [
  "passport_biodata",
  "valid_visa",
  "mincom_letter",
  "work_residence_permit",
  "ghana_card",
  "assignment_letter",
  "insurance_proof",
  "hospital_fitness_form",
  "induction_declaration_form",
  "induction_registration_form",
  "biometric_image",
  "passport_photo",
] as const;

export type DocType = (typeof DOC_TYPES)[number];

// Documents a layer owns and produces itself — never something Reception
// marks "applicable" for a visitor to supply.
export type LayerOwnedDocType =
  | "hospital_fitness_form"
  | "induction_declaration_form"
  | "induction_registration_form"
  | "biometric_image"
  | "passport_photo";

// What Reception can require of a visitor.
export type ApplicableDocType = Exclude<DocType, LayerOwnedDocType>;

export const DOCUMENT_LABELS: Record<DocType, string> = {
  passport_biodata: "Passport biodata page",
  valid_visa: "Valid visa",
  mincom_letter: "MINCOM letter of approval",
  work_residence_permit: "Work or residence permit",
  ghana_card: "Ghana Card",
  assignment_letter: "Letter of assignment / contract",
  insurance_proof: "Proof of medical/travel insurance",
  hospital_fitness_form: "Fitness form",
  induction_declaration_form: "Induction declaration form",
  induction_registration_form: "Induction registration form",
  biometric_image: "Biometric capture",
  passport_photo: "Passport photograph",
};

// Which documents a visitor must upload during registration, by
// registration type — a local has no passport/visa/permit to give, so asking
// for them would block them outright. Lives in `domain/` (not
// `document-service.ts`) so the public forms can import it without pulling
// Drizzle/Azure into the client bundle. Enforced server-side by
// `getMissingRegistrationDocTypes`, not just in the form UI.
export const REGISTRATION_DOCUMENT_TYPES: Record<RegistrationType, DocType[]> =
  {
    Foreign: ["passport_biodata", "valid_visa"],
    Local: ["ghana_card"],
  };

// Offered during registration but never blocking — not every visitor
// needs a MINCOM letter or a work permit (a short familiarization visit
// doesn't), so these upload if the visitor has them and Reception chases the
// rest later.
export const REGISTRATION_OPTIONAL_DOCUMENT_TYPES: Record<
  RegistrationType,
  DocType[]
> = {
  Foreign: [
    "work_residence_permit",
    "mincom_letter",
    "assignment_letter",
    "insurance_proof",
  ],
  Local: ["assignment_letter", "insurance_proof"],
};

// A visitor collecting their visa at the airport has no visa document to
// upload yet — Reception captures it once they have arrived. Every other visa
// type means the visa already exists, so it stays compulsory.
export function getRequiredRegistrationDocTypes(
  registrationType: RegistrationType,
  visaType?: VisaType,
): DocType[] {
  const required = REGISTRATION_DOCUMENT_TYPES[registrationType];

  if (registrationType === "Foreign" && visaType === "Visa on Arrival") {
    return required.filter((docType) => docType !== "valid_visa");
  }

  return required;
}

export function getRegistrationDocTypes(
  registrationType: RegistrationType,
): DocType[] {
  return [
    ...REGISTRATION_DOCUMENT_TYPES[registrationType],
    ...REGISTRATION_OPTIONAL_DOCUMENT_TYPES[registrationType],
  ];
}

// The stakeholders who sign off a Reception record. Any one of them is
// enough, and any one of them can reject it back to Reception. Chief
// Sustainability Officer, Human Capital Manager, General Mine Manager,
// Engineering Manager. EM replaced DMD (2026-10-26); approvals signed before
// then still read "DMD" in `stakeholder_approvals.approver_role`.
export const STAKEHOLDER_ROLES = ["CSO", "HCM", "GMM", "EM"] as const;

export type StakeholderRole = (typeof STAKEHOLDER_ROLES)[number];

export type ApproverRole = StakeholderRole | "Delegated";

// Runtime tuple like DOC_TYPES: the reception form and Reception's
// completion form both render it, and `VisaType` derives from it so a new
// visa type is added in exactly one place.
export const VISA_TYPES = [
  "Tourist Visa",
  "Business Visa",
  "Work Visa",
  "Transit Visa",
  "Diplomatic Visa",
  "Visa on Arrival",
] as const;

export type VisaType = (typeof VISA_TYPES)[number];

// What Security issues, not an identity document the visitor already holds. The
// list was Passport / Ghana Card / Driver's Licence / Voter ID, which
// described the wrong thing entirely — Security hands out a site access card.
// `access_provisionings.id_type` keeps its column name; only the values it
// stores changed.
export const CARD_TYPES = ["Visitor Card", "RFID Card"] as const;

export type CardType = (typeof CARD_TYPES)[number];

// Reception requests, Security revokes: there is no approval step in between
// (changed 2026-10-21), so a request is either waiting or done.
export type TerminationStatus = "Pending" | "Revoked";

export type HospitalClearanceStatus = "Fit" | "FitWithConditions" | "Unfit";

// What a clearance outcome is called on screen — the stored value keeps its
// camel case, only the label reads like English. Single source, like
// WORKFLOW_STATE_LABELS.
export const HOSPITAL_CLEARANCE_LABELS: Record<
  HospitalClearanceStatus,
  string
> = {
  Fit: "Fit",
  FitWithConditions: "Fit with Conditions",
  Unfit: "Unfit",
};

export type ReceptionData = {
  employmentStatus: string;
  telephoneOnSite: string;
  companyName: string;
  contactNameMonthly: string;
  contactEmail?: string;
  companyEmergencyName: string;
  companyEmergencyTel: string;
  gmcLiaisonPerson: string;
  gmcLiaisonDept: string;
  reasonForRequest: string;
  airportPickup: boolean;
  // Only set when airportPickup is true — existing rows predate this field
  pickupDate?: string;
  transportTo: boolean;
  transportFrom: boolean;
  accommodationRequired: boolean;
  // Only set when accommodationRequired is true — a GHANA_LOCATIONS value
  accommodationLocation?: string;
  permanentAccessBadge: boolean;
  ghanaVisaRequired: boolean;
  generalSiteInduction: boolean;
  otherInductions: boolean;
  bringingEquipment: boolean;
  ppeRequired: boolean;
  itAccessRequired: boolean;
  visaType: VisaType;
  accessLevel: string;
  accommodationConfirmed: boolean;
  itineraryAttached: boolean;
  inflightUpdated: boolean;
  remarks: string;
  applicableDocuments: ApplicableDocType[];
};
