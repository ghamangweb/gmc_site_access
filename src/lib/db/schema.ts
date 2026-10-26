import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { encryptedJson, encryptedText } from "@/lib/db/encrypted-columns";

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

// Everything identifying is encrypted (see lib/db/encrypted-columns.ts), so
// the database holds ciphertext. What has to be findable lives in two blind
// columns beside it: `passportNoHash` is the unique lookup key, and
// `searchTokens` are hashed name/passport prefixes for the queue search. Both
// are written by person-registry-service, the only writer of this table.
export const persons = pgTable("persons", {
  id: uuid().defaultRandom().primaryKey(),
  passportNo: encryptedText().notNull(),
  passportNoHash: text().notNull().unique(),
  searchTokens: text().array().notNull().default([]),
  fullName: encryptedText().notNull(),
  dateOfBirth: encryptedText().notNull(),
  gender: encryptedText().notNull(),
  nationality: encryptedText().notNull(),
  email: encryptedText(),
  phone: encryptedText().notNull(),
  emergencyContactName: encryptedText().notNull(),
  emergencyContactPhone: encryptedText().notNull(),
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
    receptionData: encryptedJson().notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    // Stamped when Reception sends the engagement for sign-off. Before this
    // existed the request left no trace on the record at all — only
    // notifications — so a stakeholder queue had no way to tell "waiting for
    // me" from "Reception is still preparing it".
    approvalRequestedAt: timestamp({ withTimezone: true }),
    // Stamped when a stakeholder rejects the request, cleared when Reception
    // asks again. A rejection also clears `approvalRequestedAt`, so the record
    // leaves the stakeholder queue instead of waiting there for a sign-off
    // that will never come. The details live in `stakeholder_rejections`.
    approvalRejectedAt: timestamp({ withTimezone: true }),
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
    // Pages in the file, counted once at upload so a preview can show a pile
    // of leaves only when there really are several. Null means unknown
    // (older rows, or a PDF that could not be parsed) and previews treat it
    // as a single page.
    pageCount: integer(),
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

// One row per rejection, kept as history: a record can be rejected, fixed by
// Reception, requested again and rejected again. Unlike an approval there is
// no unique constraint on the engagement for that reason.
export const stakeholderRejections = pgTable("stakeholder_rejections", {
  id: uuid().defaultRandom().primaryKey(),
  engagementId: uuid()
    .notNull()
    .references(() => engagements.id),
  approverRole: text().notNull(),
  approverStaffUserId: uuid()
    .notNull()
    .references(() => staffUsers.id),
  approverName: text().notNull(),
  reason: encryptedText().notNull(),
  isDelegated: boolean().notNull().default(false),
  rejectedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
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
  trainerComments: encryptedText().notNull(),
  completedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});

// What Security issued. Cycle-scoped for consistency with `hospital_clearances` and
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
  comments: encryptedText(),
});

export const hospitalClearances = pgTable("hospital_clearances", {
  id: uuid().defaultRandom().primaryKey(),
  workflowCycleId: uuid()
    .notNull()
    .references(() => workflowCycles.id),
  // Health information, so encrypted. That rules out the CHECK constraint
  // that used to restrict it to Fit / FitWithConditions / Unfit: the
  // HospitalClearanceStatus type is the only guard now.
  clearanceStatus: encryptedText().notNull(),
  doctorComments: encryptedText().notNull(),
  clearanceDate: timestamp({ withTimezone: true }).defaultNow().notNull(),
});

export const terminationRequests = pgTable("termination_requests", {
  id: uuid().defaultRandom().primaryKey(),
  engagementId: uuid()
    .notNull()
    .references(() => engagements.id),
  requestedBy: uuid()
    .notNull()
    .references(() => staffUsers.id),
  reason: encryptedText().notNull(),
  requestedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  // "Pending" until Security revokes access, then "Revoked".
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
  email: encryptedText().notNull(),
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
  formData: encryptedJson().notNull(),
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
  message: encryptedText().notNull(),
  readAt: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});
