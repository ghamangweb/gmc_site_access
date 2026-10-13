import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const staffUsers = pgTable("staff_users", {
  id: uuid().defaultRandom().primaryKey(),
  entraObjectId: text().notNull().unique(),
  email: text().notNull(),
  displayName: text().notNull(),
  systemRole: text().notNull(),
  workflowRoles: text().array().notNull().default([]),
  department: text(),
  pinHash: text(),
  pinFailedAttempts: integer().notNull().default(0),
  pinLockedUntil: timestamp({ withTimezone: true }),
  provisionedAt: timestamp({ withTimezone: true }),
  // Soft delete. Twelve tables reference this row — who approved, who issued,
  // who performed each transition — so a real DELETE would either fail on a
  // foreign key or destroy the audit trail the system is required to keep.
  // A deactivated user cannot sign in and is excluded from every recipient
  // and approver lookup, while everything they did stays attributable.
  deactivatedAt: timestamp({ withTimezone: true }),
  deactivatedBy: uuid(),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});

export const persons = pgTable("persons", {
  id: uuid().defaultRandom().primaryKey(),
  passportNo: text().notNull().unique(),
  fullName: text().notNull(),
  dateOfBirth: date().notNull(),
  gender: text().notNull(),
  nationality: text().notNull(),
  email: text(),
  phone: text().notNull(),
  emergencyContactName: text().notNull(),
  emergencyContactPhone: text().notNull(),
});

export const engagements = pgTable(
  "engagements",
  {
    id: uuid().defaultRandom().primaryKey(),
    personId: uuid()
      .notNull()
      .references(() => persons.id),
    accessPurpose: text().notNull(),
    arrivalDate: date().notNull(),
    departureDate: date().notNull(),
    workflowState: text().notNull().default("AtReception"),
    accessState: text().notNull().default("Pending"),
    isVisaFlagged: boolean().notNull().default(false),
    receptionData: jsonb().notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    // Stamped when Reception sends the engagement for sign-off. Before this
    // existed the request left no trace on the record at all — only
    // notifications — so a stakeholder queue had no way to tell "waiting for
    // me" from "Reception is still preparing it".
    approvalRequestedAt: timestamp({ withTimezone: true }),
    delegatedApproverId: uuid().references(() => staffUsers.id),
    delegationGrantedBy: uuid().references(() => staffUsers.id),
    delegationGrantedAt: timestamp({ withTimezone: true }),
    delegationReason: text(),
  },
  (table) => [
    // Only one non-terminal (active) engagement per person at a time —
    // mirrors the app-level guard in `getActiveEngagementForPassport`, but
    // enforced by Postgres so two concurrent Reception submissions for the
    // same passport can't both slip past that check and create duplicates.
    uniqueIndex("engagements_active_person_id_idx")
      .on(table.personId)
      .where(sql`${table.workflowState} not in ('Completed', 'Cancelled')`),
  ],
);

export const workflowCycles = pgTable("workflow_cycles", {
  id: uuid().defaultRandom().primaryKey(),
  engagementId: uuid()
    .notNull()
    .references(() => engagements.id),
  cycleNumber: integer().notNull(),
  archivedAt: timestamp({ withTimezone: true }),
});

export const documents = pgTable(
  "documents",
  {
    id: uuid().defaultRandom().primaryKey(),
    // Exactly one parent is set (see the check below). `engagementId` is a
    // staff upload against a real Engagement; `invitationId` is a visitor
    // upload made during registration, before any Engagement exists.
    // Reception's hand-off re-points the row rather than copying the blob.
    engagementId: uuid().references(() => engagements.id),
    invitationId: uuid().references(() => invitations.id),
    workflowCycleId: uuid().references(() => workflowCycles.id),
    docType: text().notNull(),
    // UploadThing file key — what deletes and signed-URL generation address.
    // The URL alone is not enough: it is derived from the key, not vice versa.
    fileKey: text().notNull(),
    fileUrl: text().notNull(),
    // Captured at upload. Needed to decide whether a preview renders as an
    // image or a PDF frame, and to give a download a real filename — the
    // UploadThing key carries neither.
    fileName: text(),
    contentType: text(),
    // Null when the visitor uploaded it themselves (no staff user involved)
    uploadedBy: uuid().references(() => staffUsers.id),
    uploadedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      "documents_single_parent_check",
      sql`(${table.engagementId} is not null)::int + (${table.invitationId} is not null)::int = 1`,
    ),
  ],
);

export const stakeholderApprovals = pgTable("stakeholder_approvals", {
  id: uuid().defaultRandom().primaryKey(),
  engagementId: uuid()
    .notNull()
    .unique()
    .references(() => engagements.id),
  approverRole: text().notNull(),
  approverStaffUserId: uuid()
    .notNull()
    .references(() => staffUsers.id),
  approverName: text().notNull(),
  signature: text().notNull(),
  approvedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  isDelegated: boolean().notNull().default(false),
  delegatedBy: uuid().references(() => staffUsers.id),
  delegatedAt: timestamp({ withTimezone: true }),
  delegationReason: text(),
});

// Mirrors `hospital_clearances`: one row per induction sign-off, hung off the
// workflow cycle rather than the engagement, so a record that cycles back to
// Hospital (Slice 9's 3-month rule) keeps its earlier induction history
// instead of overwriting it.
export const inductionRecords = pgTable("induction_records", {
  id: uuid().defaultRandom().primaryKey(),
  workflowCycleId: uuid()
    .notNull()
    .references(() => workflowCycles.id),
  generalSiteInduction: boolean().notNull().default(false),
  otherInductions: boolean().notNull().default(false),
  trainerComments: text().notNull(),
  completedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});

// What IT issued. Cycle-scoped for consistency with `hospital_clearances` and
// `induction_records`, so a record that ever re-runs a cycle keeps its history
// rather than overwriting it.
export const accessProvisionings = pgTable("access_provisionings", {
  id: uuid().defaultRandom().primaryKey(),
  workflowCycleId: uuid()
    .notNull()
    .references(() => workflowCycles.id),
  idType: text().notNull(),
  biometricCaptured: boolean().notNull().default(false),
  accessCardNumber: text().notNull(),
  // Business rule: never later than the departure date. The "or earliest visa
  // /permit expiry" half of that rule cannot be enforced yet — those dates are
  // not stored anywhere until Slice 8 adds them.
  accessCardExpiry: date().notNull(),
  activatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});

export const workflowTransitions = pgTable("workflow_transitions", {
  id: uuid().defaultRandom().primaryKey(),
  engagementId: uuid()
    .notNull()
    .references(() => engagements.id),
  workflowCycleId: uuid()
    .notNull()
    .references(() => workflowCycles.id),
  fromState: text().notNull(),
  toState: text().notNull(),
  performedBy: uuid()
    .notNull()
    .references(() => staffUsers.id),
  performedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  comments: text(),
});

export const hospitalClearances = pgTable(
  "hospital_clearances",
  {
    id: uuid().defaultRandom().primaryKey(),
    workflowCycleId: uuid()
      .notNull()
      .references(() => workflowCycles.id),
    clearanceStatus: text().notNull(),
    doctorComments: text().notNull(),
    clearanceDate: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      "hospital_clearances_clearance_status_check",
      sql`${table.clearanceStatus} in ('Fit', 'FitWithConditions', 'Unfit')`,
    ),
  ],
);

export const terminationRequests = pgTable("termination_requests", {
  id: uuid().defaultRandom().primaryKey(),
  engagementId: uuid()
    .notNull()
    .references(() => engagements.id),
  requestedBy: uuid()
    .notNull()
    .references(() => staffUsers.id),
  reason: text().notNull(),
  status: text().notNull().default("Pending"),
  decidedBy: uuid().references(() => staffUsers.id),
  decidedAt: timestamp({ withTimezone: true }),
});

export const invitations = pgTable("invitations", {
  id: uuid().defaultRandom().primaryKey(),
  department: text().notNull(),
  // "Local" | "Foreign" — determines which registration form renders at
  // /register for this token (see RegistrationType in lib/domain/types.ts)
  registrationType: text().notNull(),
  email: text().notNull(),
  tokenHash: text().notNull().unique(),
  issuedBy: uuid()
    .notNull()
    .references(() => staffUsers.id),
  issuedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  revokedAt: timestamp({ withTimezone: true }),
  consumedAt: timestamp({ withTimezone: true }),
});

export const registrationRequests = pgTable("registration_requests", {
  id: uuid().defaultRandom().primaryKey(),
  invitationId: uuid()
    .notNull()
    .unique()
    .references(() => invitations.id),
  department: text().notNull(),
  registrationType: text().notNull(),
  formData: jsonb().notNull(),
  // Set when Reception turns this submission into an Engagement. Null means
  // still outstanding — this is what keeps a submission from being converted
  // twice, and what the Reception queue reads to show Converted vs a button.
  engagementId: uuid().references(() => engagements.id),
  status: text().notNull().default("Approved"),
  approvedBy: uuid()
    .notNull()
    .references(() => staffUsers.id),
  approvedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: uuid().defaultRandom().primaryKey(),
  recipientStaffUserId: uuid()
    .notNull()
    .references(() => staffUsers.id),
  requesterStaffUserId: uuid().references(() => staffUsers.id),
  requestedRole: text(),
  requestedDepartment: text(),
  engagementId: uuid().references(() => engagements.id),
  registrationRequestId: uuid().references(() => registrationRequests.id),
  message: text().notNull(),
  readAt: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});
