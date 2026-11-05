import {
  and,
  arrayContains,
  arrayOverlaps,
  asc,
  count,
  desc,
  eq,
  exists,
  gt,
  inArray,
  isNotNull,
  isNull,
  lt,
  notInArray,
  or,
  type SQL,
  type SQLWrapper,
  sql,
} from "drizzle-orm";
import type { SessionUser } from "@/lib/auth/session";
import { blindIndex, searchQueryTokens } from "@/lib/crypto";
import { csvRow } from "@/lib/csv";
import { type DbClient, db } from "@/lib/db/client";
import {
  accessCardExpiryUpdates,
  accessProvisionings,
  documents,
  engagements,
  hospitalClearances,
  inductionRecords,
  invitations,
  notifications,
  persons,
  registrationRequests,
  staffUsers,
  stakeholderApprovals,
  stakeholderRejections,
  stayExtensions,
  terminationRequests,
  workflowCycles,
  workflowExemptions,
  workflowTransitions,
} from "@/lib/db/schema";
import {
  APPROVALS_REPORT_HEADERS,
  approvalsReportRows,
} from "@/lib/domain/approvals-report";
import {
  type CardExpiryUpdateInput,
  hasPendingStayExtension,
  isCardExpiryUpdatable,
  validateCardExpiryUpdate,
} from "@/lib/domain/card-expiry";
import {
  HOSPITAL_REPORT_HEADERS,
  hospitalReportRows,
} from "@/lib/domain/hospital-report";
import { notice } from "@/lib/domain/notification-messages";
import {
  DEFAULT_PAGE_SIZE,
  type Page,
  type PageRequest,
  pageOffset,
} from "@/lib/domain/pagination";
import type { EngagementFilters, ReviewDue } from "@/lib/domain/queue-filters";
import {
  RECEPTION_REPORT_HEADERS,
  receptionReportRows,
} from "@/lib/domain/reception-report";
import {
  SECURITY_REPORT_HEADERS,
  securityReportRows,
} from "@/lib/domain/security-report";
import {
  isStayExtendable,
  type StayExtensionInput,
  stayExtensionRole,
  validateStayExtension,
} from "@/lib/domain/stay-extensions";
import {
  TRAINING_REPORT_HEADERS,
  trainingReportRows,
} from "@/lib/domain/training-report";
import {
  type AccessPurpose,
  type AccessState,
  type ApproverRole,
  DOCUMENT_LABELS,
  type DocType,
  getEffectiveAccessState,
  HOSPITAL_CLEARANCE_LABELS,
  type HospitalClearanceStatus,
  isoToday,
  type ReceptionData,
  STAKEHOLDER_ROLES,
  WORKFLOW_EXEMPTION_STAGE_LABELS,
  type WorkflowExemptionInput,
  type WorkflowExemptionStage,
  type WorkflowRole,
  type WorkflowState,
} from "@/lib/domain/types";
import {
  approvalDestination,
  EXEMPTION_APPROVER_ROLES,
  hospitalDestination,
  validateWorkflowExemption,
  type WorkflowExemptionApprovalInput,
  type WorkflowExemptionMessage,
  workflowExemptionNotification,
} from "@/lib/domain/workflow-exemptions";
import type { StaffUser } from "@/lib/services/auth-service";
import {
  getDocumentsForEngagement,
  getMissingRequiredDocTypes,
} from "@/lib/services/document-service";
import {
  createPerson,
  findPersonByPassport,
  type PersonInput,
  updatePerson,
} from "@/lib/services/person-registry-service";

export type Engagement = typeof engagements.$inferSelect;
export type StakeholderApproval = typeof stakeholderApprovals.$inferSelect;
export type StakeholderRejection = typeof stakeholderRejections.$inferSelect;
export type WorkflowCycle = typeof workflowCycles.$inferSelect;
export type HospitalClearance = typeof hospitalClearances.$inferSelect;

export type WorkflowExemption = typeof workflowExemptions.$inferSelect;

export type WorkflowExemptionDetails = WorkflowExemption & {
  cycleNumber: number;
  archivedAt: Date | null;
  approverName: string;
  approverRole: string;
  approvedAt: Date;
};

export type ReceptionFormInput = {
  person: PersonInput;
  accessPurpose: AccessPurpose;
  arrivalDate: string;
  departureDate: string;
  receptionData: ReceptionData;
};

export async function getStaffByWorkflowRoles(
  roles: WorkflowRole[],
  client: DbClient = db,
): Promise<StaffUser[]> {
  return client
    .select()
    .from(staffUsers)
    .where(
      and(
        arrayOverlaps(staffUsers.workflowRoles, roles),
        isNull(staffUsers.deactivatedAt),
      ),
    );
}

async function getStakeholdersAndSystemAdmins(): Promise<StaffUser[]> {
  const stakeholders = await getStaffByWorkflowRoles([...STAKEHOLDER_ROLES]);
  const admins = await db
    .select()
    .from(staffUsers)
    .where(
      and(
        eq(staffUsers.systemRole, "SystemAdmin"),
        isNull(staffUsers.deactivatedAt),
      ),
    );

  const byId = new Map<string, StaffUser>();
  for (const user of [...stakeholders, ...admins]) {
    byId.set(user.id, user);
  }
  return [...byId.values()];
}

async function notifyStaff(
  recipients: StaffUser[],
  engagementId: string,
  message: string,
): Promise<void> {
  if (recipients.length === 0) {
    return;
  }
  await db.insert(notifications).values(
    recipients.map((recipient) => ({
      recipientStaffUserId: recipient.id,
      engagementId,
      message,
    })),
  );
}

export async function getEngagementById(
  engagementId: string,
  client: DbClient = db,
): Promise<Engagement | undefined> {
  const [engagement] = await client
    .select()
    .from(engagements)
    .where(eq(engagements.id, engagementId));
  return engagement;
}

// The visitor's name for a notification — notifications don't link to the
// record, so the name is what tells the reader which one it is.
async function personNameFor(
  engagementId: string,
  client: DbClient = db,
): Promise<string> {
  const [row] = await client
    .select({ fullName: persons.fullName })
    .from(engagements)
    .innerJoin(persons, eq(engagements.personId, persons.id))
    .where(eq(engagements.id, engagementId));

  return row?.fullName ?? "A visitor";
}

export async function getActiveWorkflowCycle(
  engagementId: string,
  client: DbClient = db,
): Promise<WorkflowCycle | undefined> {
  const [cycle] = await client
    .select()
    .from(workflowCycles)
    .where(
      and(
        eq(workflowCycles.engagementId, engagementId),
        isNull(workflowCycles.archivedAt),
      ),
    )
    .orderBy(desc(workflowCycles.cycleNumber))
    .limit(1);
  return cycle;
}

export async function getActiveWorkflowExemptions(
  engagementId: string,
  client: DbClient = db,
): Promise<WorkflowExemption[]> {
  const cycle = await getActiveWorkflowCycle(engagementId, client);

  if (!cycle) return [];

  return client
    .select()
    .from(workflowExemptions)
    .where(eq(workflowExemptions.workflowCycleId, cycle.id));
}

async function listWorkflowExemptionDetails(
  where: SQL,
  client: DbClient,
): Promise<WorkflowExemptionDetails[]> {
  return client
    .select({
      id: workflowExemptions.id,
      engagementId: workflowExemptions.engagementId,
      workflowCycleId: workflowExemptions.workflowCycleId,
      stakeholderApprovalId: workflowExemptions.stakeholderApprovalId,
      stage: workflowExemptions.stage,
      reason: workflowExemptions.reason,
      cycleNumber: workflowCycles.cycleNumber,
      archivedAt: workflowCycles.archivedAt,
      approverName: stakeholderApprovals.approverName,
      approverRole: stakeholderApprovals.approverRole,
      approvedAt: stakeholderApprovals.approvedAt,
    })
    .from(workflowExemptions)
    .innerJoin(
      workflowCycles,
      eq(workflowExemptions.workflowCycleId, workflowCycles.id),
    )
    .innerJoin(
      stakeholderApprovals,
      eq(workflowExemptions.stakeholderApprovalId, stakeholderApprovals.id),
    )
    .where(where)
    .orderBy(desc(workflowCycles.cycleNumber), workflowExemptions.stage);
}

export async function getWorkflowExemptionDetails(
  engagementId: string,
  client: DbClient = db,
): Promise<WorkflowExemptionDetails[]> {
  return listWorkflowExemptionDetails(
    eq(workflowExemptions.engagementId, engagementId),
    client,
  );
}

export type EngagementRow = {
  engagement: Engagement;
  person: typeof persons.$inferSelect;
};

// Name or passport, case-insensitive — the two things a Receptionist has in
// front of them when someone is standing at the desk. Both are encrypted, so
// the match is against hashed word prefixes (`persons.searchTokens`): each
// word typed must start a word of the name or the passport number, two
// characters or more. "men" finds "Mensah"; "ensah" does not. Matching still
// happens in Postgres, because these queues are expected to run to thousands
// of rows and fetching all of them to filter in JS would not survive that.
function personSearchFilter(search: string | undefined): SQL | undefined {
  const tokens = search ? searchQueryTokens(search) : [];

  if (tokens.length === 0) {
    return undefined;
  }

  return arrayContains(persons.searchTokens, tokens);
}

// The expiry of the card a record holds now: the latest provisioning in its
// active cycle, the same pick as `getAccessProvisioning`, as a subquery.
function currentCardExpiry(): SQL<string | null> {
  return sql<string | null>`(
    select ap.access_card_expiry from ${accessProvisionings} as ap
    inner join ${workflowCycles} as wc on ap.workflow_cycle_id = wc.id
    where wc.engagement_id = ${engagements.id} and wc.archived_at is null
    order by wc.cycle_number desc, ap.activated_at desc
    limit 1
  )`;
}

// Access as the screens show it (`getEffectiveAccessState`): a stored Active
// whose card has lapsed reads Expired, so the filter has to agree.
function effectiveAccessStateFilter(
  state: AccessState,
  cardExpiry: SQLWrapper,
): SQL | undefined {
  const today = isoToday();

  if (state === "Expired") {
    return or(
      eq(engagements.accessState, "Expired"),
      and(eq(engagements.accessState, "Active"), sql`${cardExpiry} < ${today}`),
    );
  }

  if (state === "Active") {
    return and(
      eq(engagements.accessState, "Active"),
      sql`(${cardExpiry} is null or ${cardExpiry} >= ${today})`,
    );
  }

  return eq(engagements.accessState, state);
}

// The dropdown filters queues share (queue-filters.ts). `cardExpiry` is the
// card the row's access state is judged against: the record's current card by
// default, or the row's own card on a per-provisioning list.
function engagementFilterConditions(
  filters: EngagementFilters,
  cardExpiry: SQLWrapper = currentCardExpiry(),
): SQL[] {
  return [
    filters.workflowState
      ? eq(engagements.workflowState, filters.workflowState)
      : undefined,
    filters.accessPurpose
      ? eq(engagements.accessPurpose, filters.accessPurpose)
      : undefined,
    filters.accessState
      ? effectiveAccessStateFilter(filters.accessState, cardExpiry)
      : undefined,
  ].filter((filter): filter is SQL => filter !== undefined);
}

export async function listEngagementsWithPerson(
  request: PageRequest & EngagementFilters = {},
): Promise<Page<EngagementRow>> {
  const page = request.page ?? 1;
  const pageSize = request.pageSize ?? DEFAULT_PAGE_SIZE;

  const filters = [
    personSearchFilter(request.search),
    ...engagementFilterConditions(request),
  ].filter((filter): filter is SQL => filter !== undefined);

  const where = filters.length > 0 ? and(...filters) : undefined;

  const [rows, [totals]] = await Promise.all([
    db
      .select({ engagement: engagements, person: persons })
      .from(engagements)
      .innerJoin(persons, eq(engagements.personId, persons.id))
      .where(where)
      .orderBy(desc(engagements.createdAt))
      .limit(pageSize)
      .offset(pageOffset(page, pageSize)),
    db
      .select({ value: count() })
      .from(engagements)
      .innerJoin(persons, eq(engagements.personId, persons.id))
      .where(where),
  ]);

  return { rows, total: totals?.value ?? 0, page, pageSize };
}

// The delegation screen needs every engagement for a picker, not a page of
// them. Kept separate so the paged queue above can't be accidentally used
// where a complete list is meant.
export async function listAllEngagementsWithPerson(): Promise<EngagementRow[]> {
  return db
    .select({ engagement: engagements, person: persons })
    .from(engagements)
    .innerJoin(persons, eq(engagements.personId, persons.id))
    .orderBy(engagements.createdAt);
}

// The Site Access Records overview (HSE and plain Guests): every engagement
// with where it is and what each layer decided — outcomes only, never the
// doctor's or trainer's comments. The per-row lookups are bounded by the
// page size and reuse the same "latest in the active cycle" getters the
// layer screens use, so the table can't disagree with them.
export type RecordOverviewRow = EngagementRow & {
  clearanceStatus: HospitalClearanceStatus | undefined;
  inductionCompleted: boolean;
  exemptedStages: WorkflowExemptionStage[];
  accessCardExpiry: string | undefined;
};

export async function listRecordsOverview(
  request: PageRequest & EngagementFilters = {},
): Promise<Page<RecordOverviewRow>> {
  const engagementsPage = await listEngagementsWithPerson(request);

  const rows = await Promise.all(
    engagementsPage.rows.map(async (row) => {
      const [clearance, induction, exemptions, provisioning] =
        await Promise.all([
          getLatestHospitalClearance(row.engagement.id),
          getLatestInductionRecord(row.engagement.id),
          getActiveWorkflowExemptions(row.engagement.id),
          getAccessProvisioning(row.engagement.id),
        ]);

      return {
        ...row,
        // SAFETY: clearance_status is written only from the
        // HospitalClearanceStatus union by `recordHospitalClearance`.
        clearanceStatus: clearance?.clearanceStatus as
          | HospitalClearanceStatus
          | undefined,
        inductionCompleted: induction !== undefined,
        // SAFETY: stage is written only from WORKFLOW_EXEMPTION_STAGES by
        // `applyStakeholderExemption`.
        exemptedStages: exemptions.map(
          (exemption) => exemption.stage as WorkflowExemptionStage,
        ),
        accessCardExpiry: provisioning?.accessCardExpiry,
      };
    }),
  );

  return { ...engagementsPage, rows };
}

export async function listEngagementsForLayer(
  workflowState: WorkflowState,
  accessPurposes?: AccessPurpose[],
  request: PageRequest & Pick<EngagementFilters, "accessPurpose"> = {},
): Promise<Page<EngagementRow>> {
  const page = request.page ?? 1;
  const pageSize = request.pageSize ?? DEFAULT_PAGE_SIZE;

  const conditions = [eq(engagements.workflowState, workflowState)];

  if (accessPurposes && accessPurposes.length > 0) {
    conditions.push(inArray(engagements.accessPurpose, accessPurposes));
  }

  conditions.push(
    ...engagementFilterConditions({ accessPurpose: request.accessPurpose }),
  );

  const search = personSearchFilter(request.search);

  if (search) {
    conditions.push(search);
  }

  const where = and(...conditions);

  const [rows, [totals]] = await Promise.all([
    db
      .select({ engagement: engagements, person: persons })
      .from(engagements)
      .innerJoin(persons, eq(engagements.personId, persons.id))
      .where(where)
      // Oldest first: a layer queue is worked front to back, unlike the
      // Reception list where the newest record is the interesting one.
      .orderBy(engagements.createdAt)
      .limit(pageSize)
      .offset(pageOffset(page, pageSize)),
    db
      .select({ value: count() })
      .from(engagements)
      .innerJoin(persons, eq(engagements.personId, persons.id))
      .where(where),
  ]);

  return { rows, total: totals?.value ?? 0, page, pageSize };
}

// The pill on a layer's "awaiting" tab has to show outstanding work even
// while the other tab is the one being rendered, so the count is its own
// query rather than a by-product of listing the rows.
export async function countEngagementsForLayer(
  workflowState: WorkflowState,
  accessPurposes?: AccessPurpose[],
): Promise<number> {
  const conditions = [eq(engagements.workflowState, workflowState)];

  if (accessPurposes && accessPurposes.length > 0) {
    conditions.push(inArray(engagements.accessPurpose, accessPurposes));
  }

  const [row] = await db
    .select({ value: count() })
    .from(engagements)
    .where(and(...conditions));

  return row?.value ?? 0;
}

export async function getEngagementDetail(engagementId: string): Promise<
  | {
      engagement: Engagement;
      person: typeof persons.$inferSelect;
      approvals: StakeholderApproval[];
      exemptions: WorkflowExemptionDetails[];
      /** The most recent rejection, if any. Whether it still stands is
       * `engagement.approvalRejectedAt`, which a fresh request clears. */
      latestRejection: StakeholderRejection | undefined;
    }
  | undefined
> {
  const [row] = await db
    .select({ engagement: engagements, person: persons })
    .from(engagements)
    .innerJoin(persons, eq(engagements.personId, persons.id))
    .where(eq(engagements.id, engagementId));

  if (!row) {
    return undefined;
  }

  const [approvals, [latestRejection], exemptions] = await Promise.all([
    db
      .select()
      .from(stakeholderApprovals)
      .where(eq(stakeholderApprovals.engagementId, engagementId)),
    db
      .select()
      .from(stakeholderRejections)
      .where(eq(stakeholderRejections.engagementId, engagementId))
      .orderBy(desc(stakeholderRejections.rejectedAt))
      .limit(1),
    getWorkflowExemptionDetails(engagementId),
  ]);

  return { ...row, approvals, latestRejection, exemptions };
}

const TERMINAL_WORKFLOW_STATES: WorkflowState[] = ["Completed", "Cancelled"];

export async function getActiveEngagementForPassport(
  passportNo: string,
): Promise<{ engagementId: string; workflowState: WorkflowState } | undefined> {
  const person = await findPersonByPassport(passportNo);
  if (!person) {
    return undefined;
  }

  const [active] = await db
    .select()
    .from(engagements)
    .where(
      and(
        eq(engagements.personId, person.id),
        notInArray(engagements.workflowState, TERMINAL_WORKFLOW_STATES),
      ),
    );

  return active
    ? {
        engagementId: active.id,
        workflowState: active.workflowState as WorkflowState,
      }
    : undefined;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "23505"
  );
}

const ACTIVE_ENGAGEMENT_ERROR = (workflowState: string) =>
  `This passport already has an active engagement (currently ${workflowState}). Open that record instead of creating a new one.`;

export async function createEngagement(
  input: ReceptionFormInput,
  createdBy: string,
): Promise<Engagement> {
  const preCheck = await getActiveEngagementForPassport(
    input.person.passportNo,
  );
  if (preCheck) {
    throw new Error(ACTIVE_ENGAGEMENT_ERROR(preCheck.workflowState));
  }

  return db.transaction(async (tx) => {
    let person = await findPersonByPassport(input.person.passportNo, tx);

    if (person) {
      const [activeRow] = await tx
        .select()
        .from(engagements)
        .where(
          and(
            eq(engagements.personId, person.id),
            notInArray(engagements.workflowState, TERMINAL_WORKFLOW_STATES),
          ),
        );
      if (activeRow) {
        throw new Error(
          ACTIVE_ENGAGEMENT_ERROR(activeRow.workflowState as WorkflowState),
        );
      }
      person = (await updatePerson(person.id, input.person, tx)) ?? person;
    } else {
      person = await createPerson(input.person, tx);
    }

    let engagement: Engagement;
    try {
      [engagement] = await tx
        .insert(engagements)
        .values({
          personId: person.id,
          accessPurpose: input.accessPurpose,
          arrivalDate: input.arrivalDate,
          departureDate: input.departureDate,
          receptionData: input.receptionData,
        })
        .returning();
    } catch (error) {
      // 23505 = Postgres unique_violation — a concurrent submission for the
      // same passport won the race between the check above and this insert;
      // engagements_active_person_id_idx (the partial unique index) is the
      // real guard, the checks above are just a friendlier fast path.
      if (isUniqueViolation(error)) {
        throw new Error(ACTIVE_ENGAGEMENT_ERROR("active"));
      }
      throw error;
    }

    const [cycle] = await tx
      .insert(workflowCycles)
      .values({ engagementId: engagement.id, cycleNumber: 1 })
      .returning();

    await tx.insert(workflowTransitions).values({
      engagementId: engagement.id,
      workflowCycleId: cycle.id,
      fromState: "Draft",
      toState: "AtReception",
      performedBy: createdBy,
    });

    return engagement;
  });
}

export async function updateReceptionData(
  engagementId: string,
  input: ReceptionFormInput,
): Promise<Engagement> {
  const engagement = await getEngagementById(engagementId);
  if (!engagement) {
    throw new Error("Engagement not found");
  }
  if (engagement.workflowState !== "AtReception") {
    throw new Error("Reception layer is read-only after approval");
  }

  await updatePerson(engagement.personId, input.person);

  const [updated] = await db
    .update(engagements)
    .set({
      accessPurpose: input.accessPurpose,
      arrivalDate: input.arrivalDate,
      departureDate: input.departureDate,
      receptionData: input.receptionData,
    })
    .where(eq(engagements.id, engagementId))
    .returning();

  return updated;
}

export async function cancelEngagement(
  engagementId: string,
  performedBy: string,
): Promise<Engagement> {
  const engagement = await getEngagementById(engagementId);
  if (!engagement) {
    throw new Error("Engagement not found");
  }
  if (engagement.workflowState !== "AtReception") {
    throw new Error("Only an engagement still at Reception can be cancelled");
  }

  const [existing] = await db
    .select()
    .from(stakeholderApprovals)
    .where(eq(stakeholderApprovals.engagementId, engagementId));
  if (existing) {
    throw new Error("An approved engagement can no longer be cancelled");
  }

  const cycle = await getActiveWorkflowCycle(engagementId);
  if (!cycle) {
    throw new Error("No active workflow cycle for this engagement");
  }

  const [updated] = await db
    .update(engagements)
    .set({ workflowState: "Cancelled" })
    .where(eq(engagements.id, engagementId))
    .returning();

  await db.insert(workflowTransitions).values({
    engagementId,
    workflowCycleId: cycle.id,
    fromState: "AtReception",
    toState: "Cancelled",
    performedBy,
  });

  return updated;
}

export async function submitForStakeholderApproval(
  engagementId: string,
): Promise<{ recipients: StaffUser[] }> {
  const engagement = await getEngagementById(engagementId);
  if (!engagement) {
    throw new Error("Engagement not found");
  }
  if (engagement.workflowState !== "AtReception") {
    throw new Error("Engagement is not awaiting Reception approval");
  }

  const missing = await getMissingRequiredDocTypes(engagementId);
  if (missing.length > 0) {
    throw new Error(
      `Upload all applicable documents before requesting approval: ${missing.join(", ")}`,
    );
  }

  // Stamped before the notifications go out, so the stakeholder queue and the
  // emails can never disagree about what was sent.
  await db
    .update(engagements)
    // Asking again after a rejection clears it: the record is back in the
    // stakeholder queue and no longer reads as rejected.
    .set({ approvalRequestedAt: new Date(), approvalRejectedAt: null })
    .where(eq(engagements.id, engagementId));

  const recipients = await getStaffByWorkflowRoles([...STAKEHOLDER_ROLES]);
  await notifyStaff(
    recipients,
    engagementId,
    notice.approvalRequested(await personNameFor(engagementId)),
  );

  return { recipients };
}

// Engagements Reception has sent for sign-off and nobody has signed yet. A
// delegated approver sees only the engagement they were granted; CSO, HCM, GMM
// and EM see every outstanding one, since any single approval is enough. A
// rejected request has `approvalRequestedAt` cleared, so it drops out here.
export async function listEngagementsAwaitingApproval(
  delegatedApproverId?: string,
  request: PageRequest & Pick<EngagementFilters, "accessPurpose"> = {},
): Promise<Page<EngagementRow>> {
  const page = request.page ?? 1;
  const pageSize = request.pageSize ?? DEFAULT_PAGE_SIZE;

  const approved = db
    .select({ engagementId: stakeholderApprovals.engagementId })
    .from(stakeholderApprovals);

  const conditions = [
    eq(engagements.workflowState, "AtReception"),
    isNotNull(engagements.approvalRequestedAt),
    notInArray(engagements.id, approved),
    ...engagementFilterConditions({ accessPurpose: request.accessPurpose }),
  ];

  if (delegatedApproverId) {
    conditions.push(eq(engagements.delegatedApproverId, delegatedApproverId));
  }

  const search = personSearchFilter(request.search);

  if (search) {
    conditions.push(search);
  }

  const where = and(...conditions);

  const [rows, [totals]] = await Promise.all([
    db
      .select({ engagement: engagements, person: persons })
      .from(engagements)
      .innerJoin(persons, eq(engagements.personId, persons.id))
      .where(where)
      // Longest-waiting first: the queue is a to-do list.
      .orderBy(engagements.approvalRequestedAt)
      .limit(pageSize)
      .offset(pageOffset(page, pageSize)),
    db
      .select({ value: count() })
      .from(engagements)
      .innerJoin(persons, eq(engagements.personId, persons.id))
      .where(where),
  ]);

  return { rows, total: totals?.value ?? 0, page, pageSize };
}

// The other half of a stakeholder's dashboard: what has already been signed
// off. Any one approval is enough, so this is deliberately everyone's, not
// just the viewer's — a stakeholder needs to see that a colleague handled it.
// Records a stakeholder has rejected and Reception has not yet dealt with:
// still at Reception, rejection standing. Asking again or cancelling takes a
// record off this list. Each row carries the rejection that put it here.
export type RejectedEngagementRow = EngagementRow & {
  rejection: StakeholderRejection | undefined;
};

function rejectedConditions(search?: string): SQL[] {
  const conditions = [
    eq(engagements.workflowState, "AtReception"),
    isNotNull(engagements.approvalRejectedAt),
  ];
  const searchFilter = personSearchFilter(search);
  if (searchFilter) {
    conditions.push(searchFilter);
  }
  return conditions;
}

export async function listRejectedEngagements(
  request: PageRequest = {},
): Promise<Page<RejectedEngagementRow>> {
  const page = request.page ?? 1;
  const pageSize = request.pageSize ?? DEFAULT_PAGE_SIZE;
  const where = and(...rejectedConditions(request.search));

  const [rows, [totals]] = await Promise.all([
    db
      .select({ engagement: engagements, person: persons })
      .from(engagements)
      .innerJoin(persons, eq(engagements.personId, persons.id))
      .where(where)
      .orderBy(desc(engagements.approvalRejectedAt))
      .limit(pageSize)
      .offset(pageOffset(page, pageSize)),
    db
      .select({ value: count() })
      .from(engagements)
      .innerJoin(persons, eq(engagements.personId, persons.id))
      .where(where),
  ]);

  // The latest rejection per record on this page, in one query.
  const rejections =
    rows.length > 0
      ? await db
          .select()
          .from(stakeholderRejections)
          .where(
            inArray(
              stakeholderRejections.engagementId,
              rows.map((row) => row.engagement.id),
            ),
          )
          .orderBy(desc(stakeholderRejections.rejectedAt))
      : [];

  const latestByEngagement = new Map<string, StakeholderRejection>();
  for (const rejection of rejections) {
    if (!latestByEngagement.has(rejection.engagementId)) {
      latestByEngagement.set(rejection.engagementId, rejection);
    }
  }

  return {
    rows: rows.map((row) => ({
      ...row,
      rejection: latestByEngagement.get(row.engagement.id),
    })),
    total: totals?.value ?? 0,
    page,
    pageSize,
  };
}

// For the tab pill: every standing rejection, regardless of the search box.
export async function countRejectedEngagements(): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(engagements)
    .where(and(...rejectedConditions()));

  return row?.value ?? 0;
}

// Outstanding sign-offs, for the tab pill — the same filter as
// `listEngagementsAwaitingApproval` but without the search, so the pill
// counts the work rather than what is on screen.
export async function countEngagementsAwaitingApproval(
  delegatedApproverId?: string,
): Promise<number> {
  const approved = db
    .select({ engagementId: stakeholderApprovals.engagementId })
    .from(stakeholderApprovals);

  const conditions = [
    eq(engagements.workflowState, "AtReception"),
    isNotNull(engagements.approvalRequestedAt),
    notInArray(engagements.id, approved),
  ];

  if (delegatedApproverId) {
    conditions.push(eq(engagements.delegatedApproverId, delegatedApproverId));
  }

  const [row] = await db
    .select({ value: count() })
    .from(engagements)
    .where(and(...conditions));

  return row?.value ?? 0;
}

export type ApprovalRow = {
  approval: StakeholderApproval;
  engagement: Engagement;
  person: typeof persons.$inferSelect;
};

export async function listRecentStakeholderApprovals(
  request: PageRequest &
    Pick<EngagementFilters, "workflowState" | "accessPurpose"> = {},
  /** Set for a delegated approver: their grant was per engagement, so they
   * see what they signed rather than every stakeholder's sign-offs. */
  approverStaffUserId?: string,
): Promise<Page<ApprovalRow>> {
  const page = request.page ?? 1;
  const pageSize = request.pageSize ?? DEFAULT_PAGE_SIZE;

  const filters = [
    personSearchFilter(request.search),
    ...engagementFilterConditions({
      workflowState: request.workflowState,
      accessPurpose: request.accessPurpose,
    }),
    approverStaffUserId
      ? eq(stakeholderApprovals.approverStaffUserId, approverStaffUserId)
      : undefined,
  ].filter((filter): filter is SQL => filter !== undefined);

  const where = filters.length > 0 ? and(...filters) : undefined;

  const [rows, [totals]] = await Promise.all([
    db
      .select({
        approval: stakeholderApprovals,
        engagement: engagements,
        person: persons,
      })
      .from(stakeholderApprovals)
      .innerJoin(
        engagements,
        eq(stakeholderApprovals.engagementId, engagements.id),
      )
      .innerJoin(persons, eq(engagements.personId, persons.id))
      .where(where)
      .orderBy(desc(stakeholderApprovals.approvedAt))
      .limit(pageSize)
      .offset(pageOffset(page, pageSize)),
    db
      .select({ value: count() })
      .from(stakeholderApprovals)
      .innerJoin(
        engagements,
        eq(stakeholderApprovals.engagementId, engagements.id),
      )
      .innerJoin(persons, eq(engagements.personId, persons.id))
      .where(where),
  ]);

  return { rows, total: totals?.value ?? 0, page, pageSize };
}

// The other half of Hospital's dashboard: what has already been recorded.
// Rows are per clearance rather than per engagement — a record that times out
// at Training comes back for a second medical, and both decisions are history
// the Hospital needs to see.
export type HospitalClearanceRow = {
  clearance: HospitalClearance;
  engagement: Engagement;
  person: typeof persons.$inferSelect;
  /** Display name of the staff user who recorded it; null for rows stored
   * before `recorded_by` existed that couldn't be backfilled. */
  recordedByName: string | null;
  /** No later clearance exists for this engagement, in any cycle. Only the
   * latest Fit with Conditions clearance can be reviewed. */
  isLatest: boolean;
};

export async function listRecentHospitalClearances(
  request: PageRequest & {
    clearanceStatus?: HospitalClearanceStatus;
    /** Staff user id of whoever recorded the clearance. */
    recordedBy?: string;
  } = {},
): Promise<Page<HospitalClearanceRow>> {
  const page = request.page ?? 1;
  const pageSize = request.pageSize ?? DEFAULT_PAGE_SIZE;
  const filters = [
    personSearchFilter(request.search),
    // The status itself is encrypted; its blind index is not.
    request.clearanceStatus
      ? eq(
          hospitalClearances.clearanceStatusIndex,
          blindIndex(request.clearanceStatus),
        )
      : undefined,
    request.recordedBy
      ? eq(hospitalClearances.recordedBy, request.recordedBy)
      : undefined,
  ].filter((filter): filter is SQL => filter !== undefined);
  const where = filters.length > 0 ? and(...filters) : undefined;

  // A clearance hangs off the workflow cycle, not the engagement, so the
  // engagement and person both come through that join.
  const [rows, [totals]] = await Promise.all([
    db
      .select({
        clearance: hospitalClearances,
        engagement: engagements,
        person: persons,
        recordedByName: staffUsers.displayName,
        // Inside the subquery the table is aliased, so the bare
        // "hospital_clearances" reference resolves to the outer row.
        isLatest: sql<boolean>`not exists (
          select 1 from ${hospitalClearances} as later
          inner join ${workflowCycles} as later_cycle
            on later.workflow_cycle_id = later_cycle.id
          where later_cycle.engagement_id = ${engagements.id}
            and later.clearance_date > ${hospitalClearances.clearanceDate}
        )`,
      })
      .from(hospitalClearances)
      .innerJoin(
        workflowCycles,
        eq(hospitalClearances.workflowCycleId, workflowCycles.id),
      )
      .innerJoin(engagements, eq(workflowCycles.engagementId, engagements.id))
      .innerJoin(persons, eq(engagements.personId, persons.id))
      // Left join: older rows have no recorder and must still be listed.
      .leftJoin(staffUsers, eq(hospitalClearances.recordedBy, staffUsers.id))
      .where(where)
      .orderBy(desc(hospitalClearances.clearanceDate))
      .limit(pageSize)
      .offset(pageOffset(page, pageSize)),
    db
      .select({ value: count() })
      .from(hospitalClearances)
      .innerJoin(
        workflowCycles,
        eq(hospitalClearances.workflowCycleId, workflowCycles.id),
      )
      .innerJoin(engagements, eq(workflowCycles.engagementId, engagements.id))
      .innerJoin(persons, eq(engagements.personId, persons.id))
      .where(where),
  ]);

  return { rows, total: totals?.value ?? 0, page, pageSize };
}

// Fit with Conditions clearances still owed a review: the engagement's latest
// clearance, with a review date, while the record is past Hospital and not
// cancelled or revoked. Only Fit with Conditions stores a review date, so the
// date stands in for the (encrypted) status. Shared by the Awaiting Review
// tab and the reminder job, so both see the same set.
function awaitingHospitalReviewConditions() {
  return and(
    isNotNull(hospitalClearances.nextReviewDate),
    notInArray(engagements.workflowState, ["AtHospital", "Cancelled"]),
    sql`${engagements.accessState} <> 'Terminated'`,
    // Same "no later clearance" test as the recorded tab's `isLatest`.
    sql`not exists (
      select 1 from ${hospitalClearances} as later
      inner join ${workflowCycles} as later_cycle
        on later.workflow_cycle_id = later_cycle.id
      where later_cycle.engagement_id = ${engagements.id}
        and later.clearance_date > ${hospitalClearances.clearanceDate}
    )`,
  );
}

// Options for the Recorded tab's Cleared By filter: everyone who has recorded
// a clearance, deactivated staff included — their decisions are still listed.
export async function listHospitalClearanceRecorders(): Promise<
  { id: string; displayName: string }[]
> {
  return db
    .selectDistinct({ id: staffUsers.id, displayName: staffUsers.displayName })
    .from(staffUsers)
    .innerJoin(
      hospitalClearances,
      eq(hospitalClearances.recordedBy, staffUsers.id),
    )
    .orderBy(staffUsers.displayName);
}

// Hospital's Awaiting Review tab, soonest review first.
export async function listAwaitingHospitalReviews(
  request: PageRequest & { reviewDue?: ReviewDue } = {},
): Promise<Page<HospitalClearanceRow>> {
  const page = request.page ?? 1;
  const pageSize = request.pageSize ?? DEFAULT_PAGE_SIZE;
  const today = isoToday();
  const where = and(
    awaitingHospitalReviewConditions(),
    personSearchFilter(request.search),
    request.reviewDue === "overdue"
      ? lt(hospitalClearances.nextReviewDate, today)
      : request.reviewDue === "today"
        ? eq(hospitalClearances.nextReviewDate, today)
        : request.reviewDue === "upcoming"
          ? gt(hospitalClearances.nextReviewDate, today)
          : undefined,
  );

  const [rows, [totals]] = await Promise.all([
    db
      .select({
        clearance: hospitalClearances,
        engagement: engagements,
        person: persons,
        recordedByName: staffUsers.displayName,
        // Every row here is the latest clearance, by the filter above.
        isLatest: sql<boolean>`true`,
      })
      .from(hospitalClearances)
      .innerJoin(
        workflowCycles,
        eq(hospitalClearances.workflowCycleId, workflowCycles.id),
      )
      .innerJoin(engagements, eq(workflowCycles.engagementId, engagements.id))
      .innerJoin(persons, eq(engagements.personId, persons.id))
      .leftJoin(staffUsers, eq(hospitalClearances.recordedBy, staffUsers.id))
      .where(where)
      .orderBy(asc(hospitalClearances.nextReviewDate))
      .limit(pageSize)
      .offset(pageOffset(page, pageSize)),
    db
      .select({ value: count() })
      .from(hospitalClearances)
      .innerJoin(
        workflowCycles,
        eq(hospitalClearances.workflowCycleId, workflowCycles.id),
      )
      .innerJoin(engagements, eq(workflowCycles.engagementId, engagements.id))
      .innerJoin(persons, eq(engagements.personId, persons.id))
      .where(where),
  ]);

  return { rows, total: totals?.value ?? 0, page, pageSize };
}

// The Awaiting Review pill, shown on every tab like the Awaiting pill.
export async function countAwaitingHospitalReviews(): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(hospitalClearances)
    .innerJoin(
      workflowCycles,
      eq(hospitalClearances.workflowCycleId, workflowCycles.id),
    )
    .innerJoin(engagements, eq(workflowCycles.engagementId, engagements.id))
    .where(awaitingHospitalReviewConditions());

  return row?.value ?? 0;
}

// Whether a delegated approver has anything to show on the Approved tab.
// Without this the page cannot tell "delegate with nothing left to do" from
// "delegate who has never been granted anything".
export async function countStakeholderApprovalsBy(
  approverStaffUserId: string,
): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(stakeholderApprovals)
    .where(eq(stakeholderApprovals.approverStaffUserId, approverStaffUserId));

  return row?.value ?? 0;
}

export type ExemptionAudience =
  | "Receptionist"
  | "TrainingStaff"
  | "SecurityStaff"
  | "HSE"
  | "DepartmentHead";

export type StakeholderApprovalResult = {
  engagement: Engagement;
  recipients: StaffUser[];
  nextRole: WorkflowRole | null;
  exemptionMessage?: WorkflowExemptionMessage;
  // A Medical By-pass is told to everyone but Hospital, each with their
  // audience so the email links somewhere they can open. Empty otherwise.
  exemptionRecipients: { user: StaffUser; audience: ExemptionAudience }[];
};

// Who hears about a Medical By-pass: every stage but Hospital — Reception,
// Training School, Security, HSE — and the record's HOD (2026-11-05). One
// entry per person, the first audience they appear under winning.
async function exemptionAudience(
  engagementId: string,
  client: DbClient,
): Promise<{ user: StaffUser; audience: ExemptionAudience }[]> {
  const roles = [
    "Receptionist",
    "TrainingStaff",
    "SecurityStaff",
    "HSE",
  ] as const;
  const byRole = await Promise.all(
    roles.map((role) => getStaffByWorkflowRoles([role], client)),
  );
  const groups: [ExemptionAudience, StaffUser[]][] = [
    ...roles.map(
      (role, index) =>
        [role, byRole[index] ?? []] as [ExemptionAudience, StaffUser[]],
    ),
    ["DepartmentHead", await getRecordDepartmentHeads(engagementId, client)],
  ];

  const seen = new Set<string>();
  const recipients: { user: StaffUser; audience: ExemptionAudience }[] = [];

  for (const [audience, users] of groups) {
    for (const user of users) {
      if (seen.has(user.id)) continue;
      seen.add(user.id);
      recipients.push({ user, audience });
    }
  }

  return recipients;
}

export async function applyStakeholderApproval(
  engagementId: string,
  session: SessionUser,
  input: { signature: string },
  performedBy: string,
  client: DbClient = db,
): Promise<StakeholderApprovalResult> {
  // Normal approval accepts only a signature; exemptions use their own guarded entry point.
  return applyApprovalDecision(
    engagementId,
    session,
    { signature: input.signature },
    performedBy,
    client,
  );
}

export async function applyStakeholderExemption(
  engagementId: string,
  session: SessionUser,
  input: WorkflowExemptionApprovalInput,
  performedBy: string,
  client: DbClient = db,
): Promise<StakeholderApprovalResult> {
  if (!input.exemption) {
    throw new Error("Select the stages and enter a reason for the exemption");
  }

  return applyApprovalDecision(
    engagementId,
    session,
    input,
    performedBy,
    client,
  );
}

async function applyApprovalDecision(
  engagementId: string,
  session: SessionUser,
  input: {
    signature: string;
    exemption?: WorkflowExemptionInput;
  },
  performedBy: string,
  client: DbClient,
): Promise<StakeholderApprovalResult> {
  if (
    session.systemRole === "Guest" ||
    !session.pinConfirmed ||
    session.systemRole === "User"
  ) {
    throw new Error("Read-only or unconfirmed access: cannot approve");
  }

  if (performedBy !== session.staffUserId) {
    throw new Error("Approval actor must match the signed-in stakeholder");
  }

  const engagement = await getEngagementById(engagementId, client);

  if (!engagement) {
    throw new Error("Engagement not found");
  }

  if (engagement.workflowState !== "AtReception") {
    throw new Error("Engagement is not awaiting Reception approval");
  }

  // Rejected stands until Reception asks again, which clears it.
  if (engagement.approvalRejectedAt) {
    throw new Error(
      "This request was rejected. Reception must request approval again",
    );
  }

  const directRole = STAKEHOLDER_ROLES.find((role) =>
    session.workflowRoles.includes(role),
  );

  const isDelegatedApprover =
    !directRole &&
    engagement.delegatedApproverId !== null &&
    engagement.delegatedApproverId === session.staffUserId;

  if (!directRole && !isDelegatedApprover) {
    throw new Error("Not authorized to approve this engagement");
  }

  const approverName = session.displayName ?? "";

  return client.transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(engagements)
      .where(eq(engagements.id, engagementId))
      .for("update");

    if (
      !locked ||
      locked.workflowState !== "AtReception" ||
      locked.approvalRejectedAt
    ) {
      throw new Error("This request has already been decided");
    }

    if (!directRole && locked.delegatedApproverId !== session.staffUserId) {
      throw new Error("Delegated approval is no longer authorized");
    }

    // SAFETY: accessPurpose is stored from the AccessPurpose domain union.
    const purpose = locked.accessPurpose as AccessPurpose;

    const exemption = input.exemption
      ? validateWorkflowExemption(
          input.exemption,
          purpose,
          session,
          input.signature,
        )
      : undefined;

    let approverRole: ApproverRole = directRole ?? "Delegated";

    if (exemption) {
      if (!locked.approvalRequestedAt) {
        throw new Error(
          "Reception must request stakeholder approval before an exemption can be granted",
        );
      }

      const [actor] = await tx
        .select()
        .from(staffUsers)
        .where(eq(staffUsers.id, session.staffUserId));

      const currentRole = EXEMPTION_APPROVER_ROLES.find(
        (role) =>
          actor?.workflowRoles.includes(role) &&
          session.workflowRoles.includes(role),
      );

      if (
        !actor ||
        actor.deactivatedAt ||
        !currentRole ||
        !["Admin", "SystemAdmin"].includes(actor.systemRole)
      ) {
        throw new Error(
          "Stakeholder exemption authority is no longer available",
        );
      }

      approverRole = currentRole;
    }

    const { nextState, nextRole } = approvalDestination(
      purpose,
      exemption?.stages,
    );

    const exemptionRecipients = exemption
      ? await exemptionAudience(engagementId, tx)
      : [];
    const recipients = exemption
      ? exemptionRecipients.map((recipient) => recipient.user)
      : nextRole
        ? await getStaffByWorkflowRoles([nextRole], tx)
        : [];

    const [exemptionVisitor] = exemption
      ? await tx
          .select({
            personName: persons.fullName,
            passportNo: persons.passportNo,
          })
          .from(persons)
          .where(eq(persons.id, locked.personId))
      : [];

    if (exemption && !exemptionVisitor) {
      throw new Error("Visitor details are required to record the exemption");
    }

    const [existing] = await tx
      .select()
      .from(stakeholderApprovals)
      .where(eq(stakeholderApprovals.engagementId, engagementId));

    if (existing) {
      throw new Error("Engagement has already been approved");
    }

    let approval: StakeholderApproval;

    try {
      [approval] = await tx
        .insert(stakeholderApprovals)
        .values({
          engagementId,
          approverRole,
          approverStaffUserId: session.staffUserId,
          approverName,
          signature: input.signature,
          isDelegated: isDelegatedApprover,
          delegatedBy: isDelegatedApprover ? locked.delegationGrantedBy : null,
          delegatedAt: isDelegatedApprover ? locked.delegationGrantedAt : null,
          delegationReason: isDelegatedApprover
            ? locked.delegationReason
            : null,
        })
        .returning();
    } catch (error) {
      // 23505 = Postgres unique_violation — a concurrent approval won the
      // race between the check above and this insert; the unique
      // constraint on stakeholderApprovals.engagementId is the real guard,
      // the select above is just a friendlier fast path.
      if (isUniqueViolation(error)) {
        throw new Error("Engagement has already been approved");
      }

      throw error;
    }

    const [cycle] = await tx
      .select()
      .from(workflowCycles)
      .where(
        and(
          eq(workflowCycles.engagementId, engagementId),
          isNull(workflowCycles.archivedAt),
        ),
      )
      .orderBy(desc(workflowCycles.cycleNumber))
      .limit(1);

    if (!cycle) {
      throw new Error("No active workflow cycle for this engagement");
    }

    if (exemption) {
      await tx.insert(workflowExemptions).values(
        exemption.stages.map((stage) => ({
          engagementId,
          workflowCycleId: cycle.id,
          stakeholderApprovalId: approval.id,
          stage,
          reason: exemption.reason,
        })),
      );
    }

    const [updatedEngagement] = await tx
      .update(engagements)
      .set({
        workflowState: nextState,
        delegatedApproverId: null,
        delegationGrantedBy: null,
        delegationGrantedAt: null,
        delegationReason: null,
      })
      // Conditional, so a rejection that commits first wins: this then
      // matches nothing and the approval insert above rolls back with it.
      .where(
        and(
          eq(engagements.id, engagementId),
          eq(engagements.workflowState, "AtReception"),
          isNull(engagements.approvalRejectedAt),
        ),
      )
      .returning();

    if (!updatedEngagement) {
      throw new Error("This request has already been decided");
    }

    await tx.insert(workflowTransitions).values({
      engagementId,
      workflowCycleId: cycle.id,
      fromState: "AtReception",
      toState: nextState,
      performedBy,
      comments: exemption
        ? `Approved by ${approverName} (${approverRole}). Exempted: ${exemption.stages.map((stage) => WORKFLOW_EXEMPTION_STAGE_LABELS[stage]).join(", ")}. Reason: ${exemption.reason}`
        : `Approved by ${approverName} (${approverRole})`,
    });

    const exemptionMessage: WorkflowExemptionMessage | undefined =
      exemption && exemptionVisitor
        ? {
            engagementId,
            ...exemptionVisitor,
            stages: exemption.stages,
            reason: exemption.reason,
            approverName: approval.approverName,
            approverRole: approval.approverRole,
            approvedAt: approval.approvedAt,
            nextState,
          }
        : undefined;

    if (recipients.length > 0 && (exemptionMessage || nextRole)) {
      const personName = await personNameFor(engagementId, tx);
      const message = exemptionMessage
        ? workflowExemptionNotification(exemptionMessage)
        : notice.readyFor(personName, nextRole as WorkflowRole);

      await tx.insert(notifications).values(
        recipients.map((recipient) => ({
          recipientStaffUserId: recipient.id,
          engagementId,
          message,
        })),
      );
    }

    return {
      engagement: updatedEngagement,
      recipients,
      nextRole,
      exemptionMessage,
      exemptionRecipients,
    };
  });
}

// The Department Head who invited the visitor, when the record came from a
// registration link. Records Reception keyed in directly have none.
async function getInvitingDepartmentHead(
  engagementId: string,
  client: DbClient = db,
): Promise<StaffUser | undefined> {
  const [row] = await client
    .select({ staffUser: staffUsers })
    .from(registrationRequests)
    .innerJoin(
      invitations,
      eq(registrationRequests.invitationId, invitations.id),
    )
    .innerJoin(staffUsers, eq(invitations.issuedBy, staffUsers.id))
    .where(
      and(
        eq(registrationRequests.engagementId, engagementId),
        isNull(staffUsers.deactivatedAt),
      ),
    )
    .limit(1);

  return row?.staffUser;
}

// The record's HOD for medical outcomes: the Head who invited the visitor, or
// — for a record Reception keyed in directly — the active Head(s) of its GMC
// Liaison Department. Empty when neither exists.
async function getRecordDepartmentHeads(
  engagementId: string,
  client: DbClient = db,
): Promise<StaffUser[]> {
  const inviting = await getInvitingDepartmentHead(engagementId, client);

  if (inviting) {
    return [inviting];
  }

  const engagement = await getEngagementById(engagementId, client);
  // SAFETY: reception_data is jsonb written only from the Reception form's
  // own values; a record without a liaison department simply has no HOD.
  const department = (engagement?.receptionData as Partial<ReceptionData>)
    ?.gmcLiaisonDept;

  if (!department) {
    return [];
  }

  const heads = await getStaffByWorkflowRoles(["DepartmentHead"], client);

  return heads.filter((head) => head.department === department);
}

// Keeps each person to one notice when they hold more than one of the roles
// being told — the earlier audience wins.
function withoutAlreadyNotified(
  users: StaffUser[],
  ...notified: StaffUser[][]
): StaffUser[] {
  const ids = new Set(notified.flat().map((user) => user.id));

  return users.filter((user) => !ids.has(user.id));
}

// A stakeholder turns the request down. The record stays at Reception (this is
// not a workflow_state move, so no transition row), leaves the stakeholder
// queue, and reads as rejected until Reception asks again or cancels it. Like
// approval, the first decision wins.
export async function rejectStakeholderApproval(
  engagementId: string,
  session: SessionUser,
  reason: string,
  client: DbClient = db,
): Promise<{
  rejection: StakeholderRejection;
  receptionists: StaffUser[];
  departmentHead: StaffUser | undefined;
}> {
  const engagement = await getEngagementById(engagementId, client);
  if (!engagement) {
    throw new Error("Engagement not found");
  }
  if (engagement.workflowState !== "AtReception") {
    throw new Error("Engagement is not awaiting Reception approval");
  }
  if (engagement.approvalRejectedAt) {
    throw new Error("This request has already been rejected");
  }

  const directRole = STAKEHOLDER_ROLES.find((role) =>
    session.workflowRoles.includes(role),
  );
  const isDelegatedApprover =
    !directRole &&
    engagement.delegatedApproverId !== null &&
    engagement.delegatedApproverId === session.staffUserId;

  if (!directRole && !isDelegatedApprover) {
    throw new Error("Not authorized to reject this engagement");
  }

  const approverRole: ApproverRole = directRole ?? "Delegated";
  const approverName = session.displayName ?? "";

  const [receptionists, departmentHead] = await Promise.all([
    getStaffByWorkflowRoles(["Receptionist"], client),
    getInvitingDepartmentHead(engagementId, client),
  ]);

  const rejection = await client.transaction(async (tx) => {
    // Conditional for the same reason as the approval's update: whichever
    // decision commits first wins, and the other matches nothing.
    const [updated] = await tx
      .update(engagements)
      .set({
        approvalRequestedAt: null,
        approvalRejectedAt: new Date(),
        delegatedApproverId: null,
        delegationGrantedBy: null,
        delegationGrantedAt: null,
        delegationReason: null,
      })
      .where(
        and(
          eq(engagements.id, engagementId),
          eq(engagements.workflowState, "AtReception"),
          isNull(engagements.approvalRejectedAt),
        ),
      )
      .returning({ id: engagements.id });

    if (!updated) {
      throw new Error("This request has already been decided");
    }

    const [inserted] = await tx
      .insert(stakeholderRejections)
      .values({
        engagementId,
        approverRole,
        approverStaffUserId: session.staffUserId,
        approverName,
        reason,
        isDelegated: isDelegatedApprover,
      })
      .returning();

    const recipients = departmentHead
      ? [
          ...receptionists.filter((user) => user.id !== departmentHead.id),
          departmentHead,
        ]
      : receptionists;

    const rejectedName = await personNameFor(engagementId, tx);

    if (recipients.length > 0) {
      await tx.insert(notifications).values(
        recipients.map((recipient) => ({
          recipientStaffUserId: recipient.id,
          engagementId,
          message: notice.applicationRejected(rejectedName),
        })),
      );
    }

    return inserted;
  });

  if (!rejection) {
    throw new Error("Failed to record the rejection");
  }

  return { rejection, receptionists, departmentHead };
}

export async function requestDelegatedApproval(
  engagementId: string,
  reason: string,
): Promise<{ recipients: StaffUser[] }> {
  const engagement = await getEngagementById(engagementId);
  if (!engagement) {
    throw new Error("Engagement not found");
  }
  if (engagement.workflowState !== "AtReception") {
    throw new Error("Engagement is not awaiting Reception approval");
  }

  const recipients = await getStakeholdersAndSystemAdmins();
  await notifyStaff(
    recipients,
    engagementId,
    notice.delegatedApprovalRequested(
      await personNameFor(engagementId),
      reason,
    ),
  );

  return { recipients };
}

export async function grantDelegatedApproval(
  engagementId: string,
  receptionistStaffUserId: string,
  grantedBy: string,
  reason: string,
): Promise<{ engagement: Engagement; recipient: StaffUser | undefined }> {
  const existing = await getEngagementById(engagementId);
  if (!existing) {
    throw new Error("Engagement not found");
  }
  if (existing.workflowState !== "AtReception") {
    throw new Error("Engagement is not awaiting Reception approval");
  }

  const [engagement] = await db
    .update(engagements)
    .set({
      delegatedApproverId: receptionistStaffUserId,
      delegationGrantedBy: grantedBy,
      delegationGrantedAt: new Date(),
      delegationReason: reason,
    })
    .where(eq(engagements.id, engagementId))
    .returning();

  const [recipient] = await db
    .select()
    .from(staffUsers)
    .where(eq(staffUsers.id, receptionistStaffUserId));

  if (recipient) {
    await notifyStaff(
      [recipient],
      engagementId,
      notice.delegationGranted(await personNameFor(engagementId)),
    );
  }

  return { engagement, recipient };
}

export async function revokeDelegatedApproval(
  engagementId: string,
): Promise<void> {
  await db
    .update(engagements)
    .set({
      delegatedApproverId: null,
      delegationGrantedBy: null,
      delegationGrantedAt: null,
      delegationReason: null,
    })
    .where(eq(engagements.id, engagementId));
}

// Reception asks for access to be revoked; Security does it. There is no
// approval step in between (changed 2026-10-21): the request moves the access
// state to TerminationRequested, which is what puts the record in Security's
// revocation queue. Only Active access can be revoked, and the state flip
// inside the row lock is what stops a second request for the same record.
export async function requestTermination(
  engagementId: string,
  requestedBy: string,
  reason: string,
): Promise<{ recipients: StaffUser[] }> {
  const preCheck = await getEngagementById(engagementId);

  if (!preCheck) {
    throw new Error("Engagement not found");
  }

  const provisioning = await getAccessProvisioning(engagementId);

  // An expired card is already dead access: nothing left to revoke.
  if (
    getEffectiveAccessState(
      preCheck.accessState as AccessState,
      provisioning?.accessCardExpiry,
    ) !== "Active"
  ) {
    throw new Error("Only active access can be revoked");
  }

  const recipients = await getStaffByWorkflowRoles(["SecurityStaff"]);

  await db.transaction(async (tx) => {
    const [engagement] = await tx
      .select()
      .from(engagements)
      .where(eq(engagements.id, engagementId))
      .for("update");

    if (!engagement || engagement.accessState !== "Active") {
      throw new Error(
        "Access is not active, or a revocation has already been requested",
      );
    }

    const [cycle] = await tx
      .select()
      .from(workflowCycles)
      .where(
        and(
          eq(workflowCycles.engagementId, engagementId),
          isNull(workflowCycles.archivedAt),
        ),
      )
      .orderBy(desc(workflowCycles.cycleNumber))
      .limit(1);

    if (!cycle) {
      throw new Error("No active workflow cycle for this engagement");
    }

    await tx
      .insert(terminationRequests)
      .values({ engagementId, requestedBy, reason });

    await tx
      .update(engagements)
      .set({ accessState: "TerminationRequested" })
      .where(eq(engagements.id, engagementId));

    // The workflow state does not change; the row is the audit record.
    await tx.insert(workflowTransitions).values({
      engagementId,
      workflowCycleId: cycle.id,
      fromState: engagement.workflowState,
      toState: engagement.workflowState,
      performedBy: requestedBy,
      comments: `Access revocation requested: ${reason}`,
    });

    const revocationName = await personNameFor(engagementId, tx);

    if (recipients.length > 0) {
      await tx.insert(notifications).values(
        recipients.map((recipient) => ({
          recipientStaffUserId: recipient.id,
          engagementId,
          message: notice.revocationRequested(revocationName),
        })),
      );
    }
  });

  return { recipients };
}

// Security's half: switches the access off. Reception is told it is done.
export async function revokeAccess(
  engagementId: string,
  performedBy: string,
): Promise<{ recipients: StaffUser[] }> {
  const preCheck = await getEngagementById(engagementId);

  if (!preCheck) {
    throw new Error("Engagement not found");
  }

  if (preCheck.accessState !== "TerminationRequested") {
    throw new Error("No revocation has been requested for this record");
  }

  const recipients = await getStaffByWorkflowRoles(["Receptionist"]);

  await db.transaction(async (tx) => {
    const [engagement] = await tx
      .select()
      .from(engagements)
      .where(eq(engagements.id, engagementId))
      .for("update");

    if (!engagement || engagement.accessState !== "TerminationRequested") {
      throw new Error("No revocation has been requested for this record");
    }

    const [cycle] = await tx
      .select()
      .from(workflowCycles)
      .where(
        and(
          eq(workflowCycles.engagementId, engagementId),
          isNull(workflowCycles.archivedAt),
        ),
      )
      .orderBy(desc(workflowCycles.cycleNumber))
      .limit(1);

    if (!cycle) {
      throw new Error("No active workflow cycle for this engagement");
    }

    await tx
      .update(terminationRequests)
      .set({ status: "Revoked", decidedBy: performedBy, decidedAt: new Date() })
      .where(
        and(
          eq(terminationRequests.engagementId, engagementId),
          eq(terminationRequests.status, "Pending"),
        ),
      );

    await tx
      .update(engagements)
      .set({ accessState: "Terminated" })
      .where(eq(engagements.id, engagementId));

    await tx.insert(workflowTransitions).values({
      engagementId,
      workflowCycleId: cycle.id,
      fromState: engagement.workflowState,
      toState: engagement.workflowState,
      performedBy,
      comments: "Access revoked",
    });

    const revokedName = await personNameFor(engagementId, tx);

    if (recipients.length > 0) {
      await tx.insert(notifications).values(
        recipients.map((recipient) => ({
          recipientStaffUserId: recipient.id,
          engagementId,
          message: notice.accessRevoked(revokedName),
        })),
      );
    }
  });

  return { recipients };
}

// Security's revocation queue: requests still waiting to be carried out.
export type RevocationRow = {
  request: typeof terminationRequests.$inferSelect;
  engagement: Engagement;
  person: typeof persons.$inferSelect;
  requestedByName: string;
  accessCardNumber: string | null;
};

export async function countPendingRevocations(): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(terminationRequests)
    .where(eq(terminationRequests.status, "Pending"));

  return row?.value ?? 0;
}

export async function listPendingRevocations(
  request: PageRequest = {},
): Promise<Page<RevocationRow>> {
  const page = request.page ?? 1;
  const pageSize = request.pageSize ?? DEFAULT_PAGE_SIZE;
  const search = personSearchFilter(request.search);
  const where = search
    ? and(eq(terminationRequests.status, "Pending"), search)
    : eq(terminationRequests.status, "Pending");

  const [rows, [totals]] = await Promise.all([
    db
      .select({
        request: terminationRequests,
        engagement: engagements,
        person: persons,
        requestedByName: staffUsers.displayName,
        accessCardNumber: accessProvisionings.accessCardNumber,
      })
      .from(terminationRequests)
      .innerJoin(
        engagements,
        eq(terminationRequests.engagementId, engagements.id),
      )
      .innerJoin(persons, eq(engagements.personId, persons.id))
      .innerJoin(staffUsers, eq(terminationRequests.requestedBy, staffUsers.id))
      .leftJoin(
        workflowCycles,
        and(
          eq(workflowCycles.engagementId, engagements.id),
          isNull(workflowCycles.archivedAt),
        ),
      )
      .leftJoin(
        accessProvisionings,
        eq(accessProvisionings.workflowCycleId, workflowCycles.id),
      )
      .where(where)
      .orderBy(desc(terminationRequests.requestedAt))
      .limit(pageSize)
      .offset(pageOffset(page, pageSize)),
    db
      .select({ value: count() })
      .from(terminationRequests)
      .innerJoin(
        engagements,
        eq(terminationRequests.engagementId, engagements.id),
      )
      .innerJoin(persons, eq(engagements.personId, persons.id))
      .where(where),
  ]);

  return { rows, total: totals?.value ?? 0, page, pageSize };
}

export async function getLatestHospitalClearance(
  engagementId: string,
  client: DbClient = db,
): Promise<HospitalClearance | undefined> {
  const cycle = await getActiveWorkflowCycle(engagementId, client);
  if (!cycle) {
    return undefined;
  }

  const [latest] = await client
    .select()
    .from(hospitalClearances)
    .where(eq(hospitalClearances.workflowCycleId, cycle.id))
    .orderBy(desc(hospitalClearances.clearanceDate))
    .limit(1);

  return latest;
}

// One recorded clearance, for the read-only View on Hospital's recorded tab.
// Scoped to the engagement through its workflow cycle so a clearance id from
// another record can't be read under this one's URL. Any cycle, not just the
// active one: the recorded tab lists clearances from earlier cycles too.
export async function getHospitalClearanceForEngagement(
  engagementId: string,
  clearanceId: string,
): Promise<HospitalClearance | undefined> {
  const [row] = await db
    .select({ clearance: hospitalClearances })
    .from(hospitalClearances)
    .innerJoin(
      workflowCycles,
      eq(hospitalClearances.workflowCycleId, workflowCycles.id),
    )
    .where(
      and(
        eq(hospitalClearances.id, clearanceId),
        eq(workflowCycles.engagementId, engagementId),
      ),
    )
    .limit(1);

  return row?.clearance;
}

export type HospitalClearanceInput = {
  clearanceStatus: HospitalClearanceStatus;
  doctorComments: string;
  /** YYYY-MM-DD. Optional for Fit with Conditions, ignored otherwise. */
  nextReviewDate?: string;
};

// The rules a clearance and a review share. Returns the review date to store:
// the given one (if any) for Fit with Conditions, NULL for anything else.
function validateHospitalClearanceInput(
  input: HospitalClearanceInput,
): string | null {
  // The conditions are what Reception and Training School act on, so a
  // conditional clearance without them tells nobody anything. Likewise an
  // Unfit without a reason leaves Reception unable to act on it.
  if (
    (input.clearanceStatus === "FitWithConditions" ||
      input.clearanceStatus === "Unfit") &&
    !input.doctorComments.trim()
  ) {
    throw new Error(
      `Doctor's comments are required for ${HOSPITAL_CLEARANCE_LABELS[input.clearanceStatus]}`,
    );
  }

  if (input.clearanceStatus !== "FitWithConditions") {
    return null;
  }

  // Optional: not every condition needs a medical follow-up. Without a date
  // the clearance never enters Awaiting Review or the reminder job, but can
  // still be reviewed from the recorded tab.
  const nextReviewDate = input.nextReviewDate?.trim() ?? "";

  if (nextReviewDate === "") {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextReviewDate)) {
    throw new Error("Next review date is not a valid date");
  }

  if (nextReviewDate <= isoToday()) {
    throw new Error("Next review date must be in the future");
  }

  return nextReviewDate;
}

// The latest clearance outcome in each engagement's active cycle, for a page
// of queue rows at once — one query, not one per row. Engagements with no
// clearance yet are simply absent from the map.
export async function getLatestClearanceStatuses(
  engagementIds: string[],
): Promise<Map<string, HospitalClearanceStatus>> {
  const statuses = new Map<string, HospitalClearanceStatus>();

  if (engagementIds.length === 0) return statuses;

  const rows = await db
    .select({
      engagementId: workflowCycles.engagementId,
      clearanceStatus: hospitalClearances.clearanceStatus,
    })
    .from(hospitalClearances)
    .innerJoin(
      workflowCycles,
      eq(hospitalClearances.workflowCycleId, workflowCycles.id),
    )
    .where(
      and(
        inArray(workflowCycles.engagementId, engagementIds),
        isNull(workflowCycles.archivedAt),
      ),
    )
    .orderBy(desc(hospitalClearances.clearanceDate));

  for (const row of rows) {
    if (!statuses.has(row.engagementId)) {
      // SAFETY: clearance_status is written only from the
      // HospitalClearanceStatus union by `recordHospitalClearance`.
      statuses.set(
        row.engagementId,
        row.clearanceStatus as HospitalClearanceStatus,
      );
    }
  }

  return statuses;
}

// The current card's expiry for a page of engagements at once, so a status
// column can show Expired from the date rather than the stored state. Only
// the active cycle's card counts; engagements without one are absent.
export async function getCurrentCardExpiries(
  engagementIds: string[],
): Promise<Map<string, string>> {
  const expiries = new Map<string, string>();

  if (engagementIds.length === 0) return expiries;

  const rows = await db
    .select({
      engagementId: workflowCycles.engagementId,
      accessCardExpiry: accessProvisionings.accessCardExpiry,
    })
    .from(accessProvisionings)
    .innerJoin(
      workflowCycles,
      eq(accessProvisionings.workflowCycleId, workflowCycles.id),
    )
    .where(
      and(
        inArray(workflowCycles.engagementId, engagementIds),
        isNull(workflowCycles.archivedAt),
      ),
    )
    .orderBy(desc(accessProvisionings.activatedAt));

  for (const row of rows) {
    if (!expiries.has(row.engagementId)) {
      expiries.set(row.engagementId, row.accessCardExpiry);
    }
  }

  return expiries;
}

export async function recordHospitalClearance(
  engagementId: string,
  input: HospitalClearanceInput,
  performedBy: string,
  client: DbClient = db,
): Promise<{
  engagement: Engagement;
  nextRecipients: StaffUser[];
  nextRole: "TrainingStaff" | "SecurityStaff" | null;
  receptionRecipients: StaffUser[];
  departmentHeads: StaffUser[];
  hseRecipients: StaffUser[];
  outcome: "Cleared" | "Unfit";
}> {
  const preCheck = await getEngagementById(engagementId, client);

  if (!preCheck) {
    throw new Error("Engagement not found");
  }

  if (
    preCheck.workflowState !== "AtHospital" ||
    (preCheck.accessPurpose !== "Work" && preCheck.accessPurpose !== "WorkMine")
  ) {
    throw new Error("Engagement is not awaiting Hospital clearance");
  }

  const nextReviewDate = validateHospitalClearanceInput(input);

  const outcome: "Cleared" | "Unfit" =
    input.clearanceStatus === "Unfit" ? "Unfit" : "Cleared";

  // Conditional/Unfit outcomes still notify Reception regardless of the next required stage.
  const receptionRecipients =
    input.clearanceStatus === "Fit"
      ? []
      : await getStaffByWorkflowRoles(["Receptionist"], client);

  // HSE hears about every clearance, whatever the outcome — an Unfit most of
  // all. Outcome and comments stay on Hospital's screens; HSE sees the
  // outcome on the Site Access Records overview.
  const hseRecipients = await getStaffByWorkflowRoles(["HSE"], client);

  // The record's HOD follows the same outcomes Reception does: a conditional
  // clearance and an Unfit, not a plain Fit.
  const departmentHeads =
    input.clearanceStatus === "Fit"
      ? []
      : withoutAlreadyNotified(
          await getRecordDepartmentHeads(engagementId, client),
          receptionRecipients,
        );

  return client.transaction(async (tx) => {
    // Row lock — the pre-check above is just a friendly fast path; this is
    // the real guard against a concurrent clearance submission racing this
    // one (e.g. two Cleared/Unfit decisions in flight at once). Whichever
    // transaction commits first wins; the second re-reads the now-updated
    // state below and correctly rejects itself instead of persisting a
    // contradictory clearance.
    const [engagement] = await tx
      .select()
      .from(engagements)
      .where(eq(engagements.id, engagementId))
      .for("update");

    if (!engagement) {
      throw new Error("Engagement not found");
    }

    if (
      engagement.workflowState !== "AtHospital" ||
      (engagement.accessPurpose !== "Work" &&
        engagement.accessPurpose !== "WorkMine")
    ) {
      throw new Error("Engagement is not awaiting Hospital clearance");
    }

    const [cycle] = await tx
      .select()
      .from(workflowCycles)
      .where(
        and(
          eq(workflowCycles.engagementId, engagementId),
          isNull(workflowCycles.archivedAt),
        ),
      )
      .orderBy(desc(workflowCycles.cycleNumber))
      .limit(1);

    if (!cycle) {
      throw new Error("No active workflow cycle for this engagement");
    }

    const exemptions = await getActiveWorkflowExemptions(engagementId, tx);

    if (exemptions.some((exemption) => exemption.stage === "Hospital")) {
      throw new Error("Hospital is exempted for this workflow cycle");
    }

    const destination = hospitalDestination(
      exemptions.map((exemption) => exemption.stage),
    );

    const nextRole = outcome === "Cleared" ? destination.nextRole : null;

    const nextRecipients = nextRole
      ? await getStaffByWorkflowRoles([nextRole], tx)
      : [];

    await tx.insert(hospitalClearances).values({
      workflowCycleId: cycle.id,
      clearanceStatus: input.clearanceStatus,
      clearanceStatusIndex: blindIndex(input.clearanceStatus),
      doctorComments: input.doctorComments.trim(),
      recordedBy: performedBy,
      nextReviewDate,
    });

    let updatedEngagement = engagement;

    if (outcome === "Cleared") {
      [updatedEngagement] = await tx
        .update(engagements)
        .set({ workflowState: destination.nextState })
        .where(eq(engagements.id, engagementId))
        .returning();

      await tx.insert(workflowTransitions).values({
        engagementId,
        workflowCycleId: cycle.id,
        fromState: "AtHospital",
        toState: destination.nextState,
        performedBy,
        comments: `Hospital clearance: ${input.clearanceStatus}`,
      });
    }

    // Each audience is told what it has to act on, not one shared sentence.
    const personName = await personNameFor(engagementId, tx);
    const receptionMessage =
      outcome === "Unfit"
        ? notice.unfit(personName)
        : notice.fitWithConditions(personName);

    const dashboardNotices = [
      ...nextRecipients.map((recipient) => ({
        recipientStaffUserId: recipient.id,
        engagementId,
        message: notice.medicallyCleared(
          personName,
          destination.nextRole === "SecurityStaff"
            ? "SecurityStaff"
            : "TrainingStaff",
        ),
      })),
      ...[...receptionRecipients, ...departmentHeads].map((recipient) => ({
        recipientStaffUserId: recipient.id,
        engagementId,
        message: receptionMessage,
      })),
      ...hseRecipients.map((recipient) => ({
        recipientStaffUserId: recipient.id,
        engagementId,
        message: notice.clearanceRecorded(personName),
      })),
    ];

    if (dashboardNotices.length > 0) {
      await tx.insert(notifications).values(dashboardNotices);
    }

    return {
      engagement: updatedEngagement,
      nextRecipients,
      nextRole,
      receptionRecipients,
      departmentHeads,
      hseRecipients,
      outcome,
    };
  });
}

// A Hospital review of a Fit with Conditions clearance, from the recorded
// tab. Saved as a new clearance row for the history, but the record's
// workflow stage and access are left as they are — so no workflow_transitions
// row either. Only the latest clearance can be reviewed, and only while the
// record is past Hospital: one back at Hospital needs a full clearance from
// the awaiting tab instead.
export async function recordHospitalReview(
  engagementId: string,
  reviewedClearanceId: string,
  input: HospitalClearanceInput,
  performedBy: string,
): Promise<HospitalReviewRecipients> {
  const nextReviewDate = validateHospitalClearanceInput(input);

  return db.transaction(async (tx) => {
    // Same row lock as recordHospitalClearance, so two doctors reviewing at
    // once can't both pass the "is it still the latest" check below.
    const [engagement] = await tx
      .select()
      .from(engagements)
      .where(eq(engagements.id, engagementId))
      .for("update");

    if (!engagement) {
      throw new Error("Engagement not found");
    }

    if (engagement.workflowState === "AtHospital") {
      throw new Error(
        "This record is back at the Hospital stage. Record a new clearance from Awaiting Clearance instead",
      );
    }

    const [latest] = await tx
      .select({ clearance: hospitalClearances, cycle: workflowCycles })
      .from(hospitalClearances)
      .innerJoin(
        workflowCycles,
        eq(hospitalClearances.workflowCycleId, workflowCycles.id),
      )
      .where(eq(workflowCycles.engagementId, engagementId))
      .orderBy(desc(hospitalClearances.clearanceDate))
      .limit(1);

    if (!latest || latest.clearance.id !== reviewedClearanceId) {
      throw new Error(
        "This clearance has already been superseded. Only the latest one can be reviewed",
      );
    }

    if (latest.clearance.clearanceStatus !== "FitWithConditions") {
      throw new Error("Only a Fit with Conditions clearance can be reviewed");
    }

    if (latest.cycle.archivedAt) {
      throw new Error("No active workflow cycle for this engagement");
    }

    await tx.insert(hospitalClearances).values({
      workflowCycleId: latest.cycle.id,
      clearanceStatus: input.clearanceStatus,
      clearanceStatusIndex: blindIndex(input.clearanceStatus),
      doctorComments: input.doctorComments.trim(),
      recordedBy: performedBy,
      nextReviewDate,
    });

    // Who hears depends on the outcome, mirroring a first-time clearance:
    // Unfit → Reception, HOD, HSE. Fit with Conditions → the stage the record
    // is at now, Reception, HSE, HOD. Fit → the stage it is at, HSE. The
    // stage is read here, under the row lock, since the record may have moved
    // on since it was cleared.
    const status = input.clearanceStatus;
    const stageRole: "TrainingStaff" | "SecurityStaff" | null =
      status === "Unfit"
        ? null
        : engagement.workflowState === "AtTraining"
          ? "TrainingStaff"
          : engagement.workflowState === "AtSecurity"
            ? "SecurityStaff"
            : null;

    const stageRecipients = stageRole
      ? await getStaffByWorkflowRoles([stageRole], tx)
      : [];
    const receptionRecipients =
      status === "Fit"
        ? []
        : withoutAlreadyNotified(
            await getStaffByWorkflowRoles(["Receptionist"], tx),
            stageRecipients,
          );
    const departmentHeads =
      status === "Fit"
        ? []
        : withoutAlreadyNotified(
            await getRecordDepartmentHeads(engagementId, tx),
            stageRecipients,
            receptionRecipients,
          );
    const hseRecipients = await getStaffByWorkflowRoles(["HSE"], tx);

    const personName = await personNameFor(engagementId, tx);
    const followUpMessage = notice.reviewRecorded(personName, status);

    const notices = [
      ...[...stageRecipients, ...receptionRecipients, ...departmentHeads].map(
        (recipient) => ({
          recipientStaffUserId: recipient.id,
          engagementId,
          message: followUpMessage,
        }),
      ),
      ...hseRecipients.map((recipient) => ({
        recipientStaffUserId: recipient.id,
        engagementId,
        message: notice.reviewRecordedForHse(personName),
      })),
    ];

    if (notices.length > 0) {
      await tx.insert(notifications).values(notices);
    }

    return {
      stageRole,
      stageRecipients,
      receptionRecipients,
      departmentHeads,
      hseRecipients,
    };
  });
}

export type HospitalReviewRecipients = {
  stageRole: "TrainingStaff" | "SecurityStaff" | null;
  stageRecipients: StaffUser[];
  receptionRecipients: StaffUser[];
  departmentHeads: StaffUser[];
  hseRecipients: StaffUser[];
};

export type HospitalReviewReminderKind = "DayBefore" | "Due";

// The reminders the daily job owes Hospital today: a heads-up the day before
// a Fit with Conditions review falls due, and one on the day (or the first
// run after it, if a run was missed). Only the engagement's latest clearance
// counts — a review already recorded supersedes it and stops the reminders —
// and only while the record is past Hospital and not cancelled or revoked.
// Ids only: the job keeps step results on Inngest's side, so no names or
// health data go back.
export async function listDueHospitalReviewReminders(): Promise<
  { clearanceId: string; kind: HospitalReviewReminderKind }[]
> {
  const today = isoToday();
  const tomorrow = new Date(`${today}T00:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowIso = tomorrow.toISOString().slice(0, 10);

  const rows = await db
    .select({
      clearanceId: hospitalClearances.id,
      nextReviewDate: hospitalClearances.nextReviewDate,
      dayBeforeSentAt: hospitalClearances.reviewReminderDayBeforeSentAt,
      dueSentAt: hospitalClearances.reviewReminderDueSentAt,
    })
    .from(hospitalClearances)
    .innerJoin(
      workflowCycles,
      eq(hospitalClearances.workflowCycleId, workflowCycles.id),
    )
    .innerJoin(engagements, eq(workflowCycles.engagementId, engagements.id))
    .where(
      and(
        awaitingHospitalReviewConditions(),
        sql`${hospitalClearances.nextReviewDate} <= ${tomorrowIso}`,
      ),
    );

  const due: { clearanceId: string; kind: HospitalReviewReminderKind }[] = [];

  for (const row of rows) {
    if (!row.nextReviewDate) continue;

    if (row.nextReviewDate <= today) {
      if (!row.dueSentAt) {
        due.push({ clearanceId: row.clearanceId, kind: "Due" });
      }
    } else if (!row.dayBeforeSentAt) {
      due.push({ clearanceId: row.clearanceId, kind: "DayBefore" });
    }
  }

  return due;
}

// Everyone told about a due review: Hospital, which carries it out, and —
// for information — Reception, Training School, Security, HSE and the
// record's HOD. The audience picks each one's email and link.
export type HospitalReviewReminderRecipient = {
  user: StaffUser;
  audience:
    | "HospitalStaff"
    | "Receptionist"
    | "TrainingStaff"
    | "SecurityStaff"
    | "HSE"
    | "DepartmentHead";
};

// Claims one reminder and writes everyone's bell notices in the same
// transaction. The claim is an UPDATE … WHERE sent_at IS NULL, so a retried
// step or an overlapping run gets nothing back and notifies nobody twice.
// Returns what the caller needs to email, or undefined if already claimed.
export async function claimHospitalReviewReminder(
  clearanceId: string,
  kind: HospitalReviewReminderKind,
): Promise<
  | {
      recipients: HospitalReviewReminderRecipient[];
      personName: string;
      engagementId: string;
      nextReviewDate: string;
    }
  | undefined
> {
  const sentColumn =
    kind === "DayBefore"
      ? hospitalClearances.reviewReminderDayBeforeSentAt
      : hospitalClearances.reviewReminderDueSentAt;

  return db.transaction(async (tx) => {
    const [claimed] = await tx
      .update(hospitalClearances)
      .set(
        kind === "DayBefore"
          ? { reviewReminderDayBeforeSentAt: new Date() }
          : { reviewReminderDueSentAt: new Date() },
      )
      .where(and(eq(hospitalClearances.id, clearanceId), isNull(sentColumn)))
      .returning({
        workflowCycleId: hospitalClearances.workflowCycleId,
        nextReviewDate: hospitalClearances.nextReviewDate,
      });

    if (!claimed?.nextReviewDate) {
      return undefined;
    }

    const [row] = await tx
      .select({ engagementId: engagements.id, personName: persons.fullName })
      .from(workflowCycles)
      .innerJoin(engagements, eq(workflowCycles.engagementId, engagements.id))
      .innerJoin(persons, eq(engagements.personId, persons.id))
      .where(eq(workflowCycles.id, claimed.workflowCycleId))
      .limit(1);

    if (!row) {
      return undefined;
    }

    const roleAudiences = [
      "HospitalStaff",
      "Receptionist",
      "TrainingStaff",
      "SecurityStaff",
      "HSE",
    ] as const;
    const byRole = await Promise.all(
      roleAudiences.map((role) => getStaffByWorkflowRoles([role], tx)),
    );
    const departmentHeads = await getRecordDepartmentHeads(
      row.engagementId,
      tx,
    );

    // One reminder per person even if they hold several of these roles;
    // Hospital first, so a doctor who is also HSE still gets the review link.
    const seen = new Set<string>();
    const recipients: HospitalReviewReminderRecipient[] = [];
    const groups: [HospitalReviewReminderRecipient["audience"], StaffUser[]][] =
      [
        ...roleAudiences.map(
          (role, index) =>
            [role, byRole[index]] as [
              HospitalReviewReminderRecipient["audience"],
              StaffUser[],
            ],
        ),
        ["DepartmentHead", departmentHeads],
      ];

    for (const [audience, users] of groups) {
      for (const user of users) {
        if (seen.has(user.id)) continue;
        seen.add(user.id);
        recipients.push({ user, audience });
      }
    }

    if (recipients.length > 0) {
      const message = notice.reviewDue(row.personName, kind === "Due");

      await tx.insert(notifications).values(
        recipients.map((recipient) => ({
          recipientStaffUserId: recipient.user.id,
          engagementId: row.engagementId,
          message,
        })),
      );
    }

    return {
      recipients,
      personName: row.personName,
      engagementId: row.engagementId,
      nextReviewDate: claimed.nextReviewDate,
    };
  });
}

export type StayExtension = typeof stayExtensions.$inferSelect;

// Every extension on a record, newest first — shown on the record pages.
export async function getStayExtensions(
  engagementId: string,
): Promise<StayExtension[]> {
  return db
    .select()
    .from(stayExtensions)
    .where(eq(stayExtensions.engagementId, engagementId))
    .orderBy(desc(stayExtensions.extendedAt));
}

export type StayExtensionRecipients = {
  securityRecipients: StaffUser[];
  receptionRecipients: StaffUser[];
  departmentHeads: StaffUser[];
  hseRecipients: StaffUser[];
};

// A stakeholder moves an approved record's departure date later. Only the
// date moves: the access card stays as Security issued it, and Security is
// told so it can update the card. Not a workflow_state move, so no
// transition row — `stay_extensions` is the history.
export async function extendStay(
  engagementId: string,
  session: SessionUser,
  input: StayExtensionInput,
): Promise<{ extension: StayExtension } & StayExtensionRecipients> {
  const role = stayExtensionRole(session);

  if (!role) {
    throw new Error(
      "Only CSO, HCM, GMM, EM or MM stakeholders with write access can extend a stay",
    );
  }

  return db.transaction(async (tx) => {
    const [engagement] = await tx
      .select()
      .from(engagements)
      .where(eq(engagements.id, engagementId))
      .for("update");

    if (!engagement) {
      throw new Error("Engagement not found");
    }

    // SAFETY: workflow_state and access_state are written only from their
    // unions by this service.
    if (
      !isStayExtendable({
        workflowState: engagement.workflowState as WorkflowState,
        accessState: engagement.accessState as AccessState,
      })
    ) {
      throw new Error(
        "Only an approved record that is not cancelled or revoked can have its stay extended",
      );
    }

    // Re-read under the lock, so two stakeholders extending at once can't
    // both move the date from the same starting point.
    const valid = validateStayExtension(input, engagement.departureDate);

    // The actor's role is re-checked against the database, not just the
    // session: a role removed since sign-in no longer grants this.
    const [actor] = await tx
      .select()
      .from(staffUsers)
      .where(eq(staffUsers.id, session.staffUserId));

    if (!actor || actor.deactivatedAt || !actor.workflowRoles.includes(role)) {
      throw new Error("Stakeholder authority is no longer available");
    }

    const [extension] = await tx
      .insert(stayExtensions)
      .values({
        engagementId,
        previousDepartureDate: engagement.departureDate,
        newDepartureDate: valid.newDepartureDate,
        reason: valid.reason,
        signature: valid.signature,
        extendedBy: actor.id,
        extendedByName: actor.displayName,
        extendedByRole: role,
      })
      .returning();

    await tx
      .update(engagements)
      .set({ departureDate: valid.newDepartureDate })
      .where(eq(engagements.id, engagementId));

    const securityRecipients = await getStaffByWorkflowRoles(
      ["SecurityStaff"],
      tx,
    );
    const receptionRecipients = withoutAlreadyNotified(
      await getStaffByWorkflowRoles(["Receptionist"], tx),
      securityRecipients,
    );
    const departmentHeads = withoutAlreadyNotified(
      await getRecordDepartmentHeads(engagementId, tx),
      securityRecipients,
      receptionRecipients,
    );
    const hseRecipients = withoutAlreadyNotified(
      await getStaffByWorkflowRoles(["HSE"], tx),
      securityRecipients,
      receptionRecipients,
      departmentHeads,
    );

    const personName = await personNameFor(engagementId, tx);
    const notices = [
      ...securityRecipients.map((recipient) => ({
        recipientStaffUserId: recipient.id,
        engagementId,
        message: notice.stayExtendedForSecurity(
          personName,
          valid.newDepartureDate,
        ),
      })),
      ...[...receptionRecipients, ...departmentHeads, ...hseRecipients].map(
        (recipient) => ({
          recipientStaffUserId: recipient.id,
          engagementId,
          message: notice.stayExtended(personName, valid.newDepartureDate),
        }),
      ),
    ];

    if (notices.length > 0) {
      await tx.insert(notifications).values(notices);
    }

    return {
      extension,
      securityRecipients,
      receptionRecipients,
      departmentHeads,
      hseRecipients,
    };
  });
}

export type InductionRecord = typeof inductionRecords.$inferSelect;

// A work-path visitor's medical is only good for three months, and Training
// is where that matters: the induction they are about to sign off is what
// sends them to Security. Visit+mine records never went through Hospital, so
// they have no clearance to age and are always clear here.
const CLEARANCE_VALID_DAYS = 90;
const CLEARANCE_WARNING_DAYS = 30;

export type ClearanceAge =
  | { applicable: false }
  | {
      applicable: true;
      clearanceDate: Date;
      expiresAt: Date;
      daysRemaining: number;
      expired: boolean;
      expiringSoon: boolean;
    };

export async function checkHospitalClearanceAge(
  engagementId: string,
  client: DbClient = db,
): Promise<ClearanceAge> {
  const engagement = await getEngagementById(engagementId, client);

  if (
    !engagement ||
    (engagement.accessPurpose !== "Work" &&
      engagement.accessPurpose !== "WorkMine")
  ) {
    return { applicable: false };
  }

  const exemptions = await getActiveWorkflowExemptions(engagementId, client);

  if (exemptions.some((exemption) => exemption.stage === "Hospital")) {
    return { applicable: false };
  }

  const clearance = await getLatestHospitalClearance(engagementId, client);

  if (!clearance) {
    return { applicable: false };
  }

  const expiresAt = new Date(clearance.clearanceDate);
  expiresAt.setDate(expiresAt.getDate() + CLEARANCE_VALID_DAYS);

  const daysRemaining = Math.ceil(
    (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  return {
    applicable: true,
    clearanceDate: clearance.clearanceDate,
    expiresAt,
    daysRemaining,
    expired: daysRemaining <= 0,
    expiringSoon: daysRemaining > 0 && daysRemaining <= CLEARANCE_WARNING_DAYS,
  };
}

export async function getLatestInductionRecord(
  engagementId: string,
): Promise<InductionRecord | undefined> {
  const [cycle] = await db
    .select()
    .from(workflowCycles)
    .where(
      and(
        eq(workflowCycles.engagementId, engagementId),
        isNull(workflowCycles.archivedAt),
      ),
    )
    .orderBy(desc(workflowCycles.cycleNumber))
    .limit(1);

  if (!cycle) {
    return undefined;
  }

  const [record] = await db
    .select()
    .from(inductionRecords)
    .where(eq(inductionRecords.workflowCycleId, cycle.id))
    .orderBy(desc(inductionRecords.completedAt))
    .limit(1);

  return record;
}

// Training's worked-on tab. Per induction record rather than per engagement:
// a work-path record whose medical lapses returns to Hospital and inducts
// again, and both sign-offs are history.
export type InductionRow = {
  induction: InductionRecord;
  engagement: Engagement;
  person: typeof persons.$inferSelect;
};

export async function listRecentInductions(
  request: PageRequest & Pick<EngagementFilters, "accessPurpose"> = {},
): Promise<Page<InductionRow>> {
  const page = request.page ?? 1;
  const pageSize = request.pageSize ?? DEFAULT_PAGE_SIZE;
  const where = and(
    personSearchFilter(request.search),
    ...engagementFilterConditions({ accessPurpose: request.accessPurpose }),
  );

  const [rows, [totals]] = await Promise.all([
    db
      .select({
        induction: inductionRecords,
        engagement: engagements,
        person: persons,
      })
      .from(inductionRecords)
      .innerJoin(
        workflowCycles,
        eq(inductionRecords.workflowCycleId, workflowCycles.id),
      )
      .innerJoin(engagements, eq(workflowCycles.engagementId, engagements.id))
      .innerJoin(persons, eq(engagements.personId, persons.id))
      .where(where)
      .orderBy(desc(inductionRecords.completedAt))
      .limit(pageSize)
      .offset(pageOffset(page, pageSize)),
    db
      .select({ value: count() })
      .from(inductionRecords)
      .innerJoin(
        workflowCycles,
        eq(inductionRecords.workflowCycleId, workflowCycles.id),
      )
      .innerJoin(engagements, eq(workflowCycles.engagementId, engagements.id))
      .innerJoin(persons, eq(engagements.personId, persons.id))
      .where(where),
  ]);

  return { rows, total: totals?.value ?? 0, page, pageSize };
}

export async function exportApprovalsRows(
  delegatedApproverId?: string,
  client: DbClient = db,
): Promise<string[][]> {
  const batchSize = 500;

  return client.transaction(
    async (tx) => {
      const reportRows: string[][] = [];

      for (let offset = 0; ; offset += batchSize) {
        const rows = await tx
          .select({
            engagement: engagements,
            name: persons.fullName,
            passport: persons.passportNo,
            approval: {
              id: stakeholderApprovals.id,
              approverName: stakeholderApprovals.approverName,
              approverRole: stakeholderApprovals.approverRole,
              approvedAt: stakeholderApprovals.approvedAt,
              isDelegated: stakeholderApprovals.isDelegated,
              delegatedBy: stakeholderApprovals.delegatedBy,
              delegatedAt: stakeholderApprovals.delegatedAt,
              delegationReason: stakeholderApprovals.delegationReason,
            },
          })
          .from(engagements)
          .innerJoin(persons, eq(engagements.personId, persons.id))
          .leftJoin(
            stakeholderApprovals,
            eq(stakeholderApprovals.engagementId, engagements.id),
          )
          .where(
            or(
              and(
                eq(engagements.workflowState, "AtReception"),
                isNotNull(engagements.approvalRequestedAt),
                isNull(stakeholderApprovals.id),
                delegatedApproverId
                  ? eq(engagements.delegatedApproverId, delegatedApproverId)
                  : undefined,
              ),
              and(
                isNotNull(stakeholderApprovals.id),
                delegatedApproverId
                  ? eq(
                      stakeholderApprovals.approverStaffUserId,
                      delegatedApproverId,
                    )
                  : undefined,
              ),
            ),
          )
          .orderBy(engagements.createdAt, engagements.id)
          .limit(batchSize)
          .offset(offset);

        if (rows.length === 0) break;

        const ids = rows.map(({ engagement }) => engagement.id);

        const exemptions = await listWorkflowExemptionDetails(
          inArray(workflowExemptions.engagementId, ids),
          tx,
        );

        const actorIds = [
          ...new Set(
            rows.flatMap(({ engagement, approval }) => {
              if (approval)
                return approval.isDelegated && approval.delegatedBy
                  ? [approval.delegatedBy]
                  : [];

              return [
                engagement.delegatedApproverId,
                engagement.delegationGrantedBy,
              ].filter((id): id is string => id !== null);
            }),
          ),
        ];

        const actors = actorIds.length
          ? await tx
              .select({ id: staffUsers.id, name: staffUsers.displayName })
              .from(staffUsers)
              .where(inArray(staffUsers.id, actorIds))
          : [];

        const names = new Map(actors.map((actor) => [actor.id, actor.name]));

        const records = rows.map(({ engagement, name, passport, approval }) => {
          const isDelegated = approval
            ? approval.isDelegated
            : engagement.delegatedApproverId !== null;

          const delegatedById = approval
            ? approval.delegatedBy
            : engagement.delegationGrantedBy;

          return {
            engagementId: engagement.id,
            name,
            passport,
            // SAFETY: engagements store the validated Reception data contract.
            company:
              (engagement.receptionData as Partial<ReceptionData>)
                .companyName ?? "",
            purpose: engagement.accessPurpose,
            arrival: engagement.arrivalDate,
            departure: engagement.departureDate,
            workflowState: engagement.workflowState,
            requestedAt: engagement.approvalRequestedAt,
            approvalId: approval?.id ?? null,
            approvedBy: approval?.approverName ?? "",
            approverRole: approval?.approverRole ?? "",
            approvedAt: approval?.approvedAt ?? null,
            isDelegated,
            delegatedTo: approval
              ? approval.isDelegated
                ? approval.approverName
                : ""
              : (names.get(engagement.delegatedApproverId ?? "") ?? ""),
            delegatedBy: names.get(delegatedById ?? "") ?? "",
            delegatedAt: approval
              ? approval.delegatedAt
              : engagement.delegationGrantedAt,
            delegationReason: approval
              ? (approval.delegationReason ?? "")
              : (engagement.delegationReason ?? ""),
          };
        });

        for (const row of approvalsReportRows(records, exemptions))
          reportRows.push(row);

        if (rows.length < batchSize) break;
      }

      return reportRows;
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}

// The same report as one CSV: byte-order mark, header row, then the rows.
export async function exportApprovalsCsv(
  delegatedApproverId?: string,
  client: DbClient = db,
): Promise<string> {
  const rows = await exportApprovalsRows(delegatedApproverId, client);

  return ["\uFEFF", csvRow(APPROVALS_REPORT_HEADERS), ...rows.map(csvRow)].join(
    "",
  );
}

export async function exportHospitalRows(
  client: DbClient = db,
): Promise<string[][]> {
  const batchSize = 500;

  return client.transaction(
    async (tx) => {
      const reportRows: string[][] = [];

      for (let offset = 0; ; offset += batchSize) {
        const cycles = await tx
          .select({
            id: workflowCycles.id,
            engagementId: engagements.id,
            name: persons.fullName,
            passport: persons.passportNo,
            receptionData: engagements.receptionData,
            purpose: engagements.accessPurpose,
            arrival: engagements.arrivalDate,
            departure: engagements.departureDate,
            workflowState: engagements.workflowState,
            archivedAt: workflowCycles.archivedAt,
          })
          .from(workflowCycles)
          .innerJoin(
            engagements,
            eq(workflowCycles.engagementId, engagements.id),
          )
          .innerJoin(persons, eq(engagements.personId, persons.id))
          .where(
            or(
              and(
                isNull(workflowCycles.archivedAt),
                eq(engagements.workflowState, "AtHospital"),
                inArray(engagements.accessPurpose, ["Work", "WorkMine"]),
              ),
              exists(
                tx
                  .select({ id: hospitalClearances.id })
                  .from(hospitalClearances)
                  .where(
                    eq(hospitalClearances.workflowCycleId, workflowCycles.id),
                  ),
              ),
              exists(
                tx
                  .select({ id: workflowExemptions.id })
                  .from(workflowExemptions)
                  .where(
                    and(
                      eq(workflowExemptions.workflowCycleId, workflowCycles.id),
                      eq(workflowExemptions.stage, "Hospital"),
                    ),
                  ),
              ),
            ),
          )
          .orderBy(
            engagements.createdAt,
            engagements.id,
            workflowCycles.cycleNumber,
            workflowCycles.id,
          )
          .limit(batchSize)
          .offset(offset);

        if (cycles.length === 0) break;

        const cycleIds = cycles.map((cycle) => cycle.id);

        const clearances = await tx
          .select({
            workflowCycleId: hospitalClearances.workflowCycleId,
            clearanceStatus: hospitalClearances.clearanceStatus,
            doctorComments: hospitalClearances.doctorComments,
            clearanceDate: hospitalClearances.clearanceDate,
            recordedByName: staffUsers.displayName,
            nextReviewDate: hospitalClearances.nextReviewDate,
            // Match Hospital's recorded tab: latest clearance across this engagement's cycles.
            isLatest: sql<boolean>`not exists (
            select 1 from ${hospitalClearances} as later
            inner join ${workflowCycles} as later_cycle on later.workflow_cycle_id = later_cycle.id
            where later_cycle.engagement_id = ${engagements.id}
              and later.clearance_date > ${hospitalClearances.clearanceDate}
          )`,
            awaitingReview: sql<boolean>`coalesce(${awaitingHospitalReviewConditions()}, false)`,
          })
          .from(hospitalClearances)
          .innerJoin(
            workflowCycles,
            eq(hospitalClearances.workflowCycleId, workflowCycles.id),
          )
          .innerJoin(
            engagements,
            eq(workflowCycles.engagementId, engagements.id),
          )
          .leftJoin(
            staffUsers,
            eq(hospitalClearances.recordedBy, staffUsers.id),
          )
          .where(inArray(hospitalClearances.workflowCycleId, cycleIds))
          .orderBy(
            desc(hospitalClearances.clearanceDate),
            desc(hospitalClearances.id),
          );

        const exemptions = await listWorkflowExemptionDetails(
          inArray(workflowExemptions.workflowCycleId, cycleIds),
          tx,
        );

        for (const row of hospitalReportRows(
          cycles.map((cycle) => ({
            ...cycle,
            // SAFETY: engagements store the validated Reception data contract.
            company:
              (cycle.receptionData as Partial<ReceptionData>).companyName ?? "",
          })),
          clearances,
          exemptions,
        )) {
          reportRows.push(row);
        }

        if (cycles.length < batchSize) break;
      }

      return reportRows;
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}

// The same report as one CSV: byte-order mark, header row, then the rows.
export async function exportHospitalCsv(
  client: DbClient = db,
): Promise<string> {
  const rows = await exportHospitalRows(client);

  return ["\uFEFF", csvRow(HOSPITAL_REPORT_HEADERS), ...rows.map(csvRow)].join(
    "",
  );
}

export async function exportReceptionRows(
  client: DbClient = db,
): Promise<string[][]> {
  const batchSize = 500;

  return client.transaction(
    async (tx) => {
      const reportRows: string[][] = [];

      // Converted submissions are represented by their engagement below.
      for (let offset = 0; ; offset += batchSize) {
        const requests = await tx
          .select()
          .from(registrationRequests)
          .where(
            and(
              eq(registrationRequests.status, "Approved"),
              isNull(registrationRequests.engagementId),
            ),
          )
          .orderBy(registrationRequests.id)
          .limit(batchSize)
          .offset(offset);

        for (const request of requests) {
          // SAFETY: both registration forms save this typed subset; older optional fields default below.
          const form = request.formData as Partial<ReceptionFormInput> & {
            registrationData?: Partial<ReceptionData>;
          };

          const data = form.receptionData ?? form.registrationData;

          for (const row of receptionReportRows([
            {
              engagementId: null,
              name: form.person?.fullName ?? "",
              passport: form.person?.passportNo ?? "",
              registrationType: request.registrationType,
              company: data?.companyName ?? "",
              department: request.department,
              purpose: form.accessPurpose ?? "",
              arrival: form.arrivalDate ?? "",
              departure: form.departureDate ?? "",
              submissionStatus: "Approved — Awaiting Conversion",
              submittedAt: request.createdAt,
              workflowState: "",
              accessState: "",
              cardExpiry: null,
              rejectedBy: "",
              rejectionReason: "",
              rejectedAt: null,
            },
          ]))
            reportRows.push(row);
        }

        if (requests.length < batchSize) break;
      }

      for (let offset = 0; ; offset += batchSize) {
        const rows = await tx
          .select({
            engagement: engagements,
            name: persons.fullName,
            passport: persons.passportNo,
          })
          .from(engagements)
          .innerJoin(persons, eq(engagements.personId, persons.id))
          .orderBy(engagements.id)
          .limit(batchSize)
          .offset(offset);

        if (rows.length === 0) break;
        const ids = rows.map(({ engagement }) => engagement.id);

        const requests = await tx
          .select({
            engagementId: registrationRequests.engagementId,
            registrationType: registrationRequests.registrationType,
            department: registrationRequests.department,
            createdAt: registrationRequests.createdAt,
          })
          .from(registrationRequests)
          .where(
            and(
              eq(registrationRequests.status, "Converted"),
              inArray(registrationRequests.engagementId, ids),
            ),
          )
          .orderBy(registrationRequests.createdAt, registrationRequests.id);

        const rejections = await tx
          .select()
          .from(stakeholderRejections)
          .where(inArray(stakeholderRejections.engagementId, ids))
          .orderBy(
            desc(stakeholderRejections.rejectedAt),
            desc(stakeholderRejections.id),
          );

        const cards = await tx
          .select({
            engagementId: workflowCycles.engagementId,
            expiry: accessProvisionings.accessCardExpiry,
          })
          .from(accessProvisionings)
          .innerJoin(
            workflowCycles,
            eq(accessProvisionings.workflowCycleId, workflowCycles.id),
          )
          .where(inArray(workflowCycles.engagementId, ids))
          .orderBy(
            desc(accessProvisionings.activatedAt),
            desc(accessProvisionings.id),
          );

        const exemptions = await listWorkflowExemptionDetails(
          inArray(workflowExemptions.engagementId, ids),
          tx,
        );

        const records = rows.map(({ engagement, name, passport }) => {
          const request = requests.find(
            (item) => item.engagementId === engagement.id,
          );

          const rejection = rejections.find(
            (item) => item.engagementId === engagement.id,
          );

          // SAFETY: engagements store the validated Reception form data contract.
          const data = engagement.receptionData as Partial<ReceptionData>;

          return {
            engagementId: engagement.id,
            name,
            passport,
            // Legacy/manual engagements have no recorded Local/Foreign type: leave it blank.
            registrationType: request?.registrationType ?? "",
            company: data.companyName ?? "",
            department: request?.department ?? data.gmcLiaisonDept ?? "",
            purpose: engagement.accessPurpose,
            arrival: engagement.arrivalDate,
            departure: engagement.departureDate,
            submissionStatus: request ? "Converted" : "Direct Registration",
            submittedAt: request?.createdAt ?? null,
            workflowState: engagement.workflowState,
            accessState: engagement.accessState,
            cardExpiry:
              cards.find((item) => item.engagementId === engagement.id)
                ?.expiry ?? null,
            rejectedBy: rejection
              ? `${rejection.approverName} (${rejection.approverRole})`
              : "",
            rejectionReason: rejection?.reason ?? "",
            rejectedAt: rejection?.rejectedAt ?? null,
          };
        });

        for (const row of receptionReportRows(records, exemptions))
          reportRows.push(row);

        if (rows.length < batchSize) break;
      }

      return reportRows;
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}

// The same report as one CSV: byte-order mark, header row, then the rows.
export async function exportReceptionCsv(
  client: DbClient = db,
): Promise<string> {
  const rows = await exportReceptionRows(client);

  return ["\uFEFF", csvRow(RECEPTION_REPORT_HEADERS), ...rows.map(csvRow)].join(
    "",
  );
}

export async function exportSecurityRows(
  client: DbClient = db,
): Promise<string[][]> {
  const batchSize = 500;

  return client.transaction(
    async (tx) => {
      const reportRows: string[][] = [];

      for (let offset = 0; ; offset += batchSize) {
        const rows = await tx
          .select({
            engagement: engagements,
            name: persons.fullName,
            passport: persons.passportNo,
          })
          .from(engagements)
          .innerJoin(persons, eq(engagements.personId, persons.id))
          .where(
            or(
              and(
                eq(engagements.workflowState, "AtSecurity"),
                inArray(engagements.accessPurpose, [
                  "Work",
                  "WorkMine",
                  "VisitMine",
                ]),
              ),
              exists(
                tx
                  .select({ id: accessProvisionings.id })
                  .from(accessProvisionings)
                  .innerJoin(
                    workflowCycles,
                    eq(accessProvisionings.workflowCycleId, workflowCycles.id),
                  )
                  .where(eq(workflowCycles.engagementId, engagements.id)),
              ),
              exists(
                tx
                  .select({ id: terminationRequests.id })
                  .from(terminationRequests)
                  .where(
                    and(
                      eq(terminationRequests.engagementId, engagements.id),
                      eq(terminationRequests.status, "Pending"),
                    ),
                  ),
              ),
            ),
          )
          .orderBy(engagements.id)
          .limit(batchSize)
          .offset(offset);

        if (rows.length === 0) break;

        const ids = rows.map(({ engagement }) => engagement.id);

        const cards = await tx
          .select({
            engagementId: workflowCycles.engagementId,
            workflowCycleId: accessProvisionings.workflowCycleId,
            idType: accessProvisionings.idType,
            accessCardNumber: accessProvisionings.accessCardNumber,
            accessCardExpiry: accessProvisionings.accessCardExpiry,
            activatedAt: accessProvisionings.activatedAt,
          })
          .from(accessProvisionings)
          .innerJoin(
            workflowCycles,
            eq(accessProvisionings.workflowCycleId, workflowCycles.id),
          )
          .where(inArray(workflowCycles.engagementId, ids))
          .orderBy(
            desc(accessProvisionings.activatedAt),
            desc(accessProvisionings.id),
          );

        const audits = await tx
          .select({
            engagementId: workflowTransitions.engagementId,
            workflowCycleId: workflowTransitions.workflowCycleId,
            performedBy: staffUsers.displayName,
            comments: workflowTransitions.comments,
          })
          .from(workflowTransitions)
          .leftJoin(
            staffUsers,
            eq(workflowTransitions.performedBy, staffUsers.id),
          )
          .where(
            and(
              inArray(workflowTransitions.engagementId, ids),
              eq(workflowTransitions.fromState, "AtSecurity"),
              eq(workflowTransitions.toState, "Completed"),
            ),
          )
          .orderBy(
            desc(workflowTransitions.performedAt),
            desc(workflowTransitions.id),
          );

        const requests = await tx
          .select()
          .from(terminationRequests)
          .where(inArray(terminationRequests.engagementId, ids))
          .orderBy(
            desc(terminationRequests.requestedAt),
            desc(terminationRequests.id),
          );

        const actorIds = [
          ...new Set(
            requests.flatMap((request) =>
              request.decidedBy
                ? [request.requestedBy, request.decidedBy]
                : [request.requestedBy],
            ),
          ),
        ];

        const actors =
          actorIds.length > 0
            ? await tx
                .select({ id: staffUsers.id, name: staffUsers.displayName })
                .from(staffUsers)
                .where(inArray(staffUsers.id, actorIds))
            : [];

        const actorNames = new Map(
          actors.map((actor) => [actor.id, actor.name]),
        );

        const exemptions = await listWorkflowExemptionDetails(
          inArray(workflowExemptions.engagementId, ids),
          tx,
        );

        for (const row of securityReportRows(
          rows.map(({ engagement, name, passport }) => ({
            id: engagement.id,
            name,
            passport,
            // SAFETY: receptionData is saved from the validated ReceptionData form contract.
            company:
              (engagement.receptionData as ReceptionData).companyName ?? "",
            purpose: engagement.accessPurpose,
            arrival: engagement.arrivalDate,
            departure: engagement.departureDate,
            workflowState: engagement.workflowState,
            accessState: engagement.accessState,
          })),
          cards,
          audits,
          requests.map((request) => ({
            ...request,
            requestedBy: actorNames.get(request.requestedBy) ?? "",
            decidedBy: request.decidedBy
              ? (actorNames.get(request.decidedBy) ?? "")
              : "",
          })),
          exemptions,
        )) {
          reportRows.push(row);
        }

        if (rows.length < batchSize) break;
      }

      return reportRows;
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}

// The same report as one CSV: byte-order mark, header row, then the rows.
export async function exportSecurityCsv(
  client: DbClient = db,
): Promise<string> {
  const rows = await exportSecurityRows(client);

  return ["\uFEFF", csvRow(SECURITY_REPORT_HEADERS), ...rows.map(csvRow)].join(
    "",
  );
}

export async function exportTrainingRows(
  client: DbClient = db,
): Promise<string[][]> {
  const batchSize = 500;

  return client.transaction(
    async (tx) => {
      const reportRows: string[][] = [];

      for (let offset = 0; ; offset += batchSize) {
        const cycles = await tx
          .select({
            id: workflowCycles.id,
            engagementId: engagements.id,
            cycleNumber: workflowCycles.cycleNumber,
            name: persons.fullName,
            passport: persons.passportNo,
            purpose: engagements.accessPurpose,
            workflowState: engagements.workflowState,
          })
          .from(workflowCycles)
          .innerJoin(
            engagements,
            eq(workflowCycles.engagementId, engagements.id),
          )
          .innerJoin(persons, eq(engagements.personId, persons.id))
          .where(
            or(
              and(
                isNull(workflowCycles.archivedAt),
                eq(engagements.workflowState, "AtTraining"),
                inArray(engagements.accessPurpose, [
                  "Work",
                  "WorkMine",
                  "VisitMine",
                ]),
              ),
              exists(
                tx
                  .select({ id: inductionRecords.id })
                  .from(inductionRecords)
                  .where(
                    eq(inductionRecords.workflowCycleId, workflowCycles.id),
                  ),
              ),
              exists(
                tx
                  .select({ id: workflowExemptions.id })
                  .from(workflowExemptions)
                  .where(
                    and(
                      eq(workflowExemptions.workflowCycleId, workflowCycles.id),
                      eq(workflowExemptions.stage, "Training"),
                    ),
                  ),
              ),
            ),
          )
          .orderBy(
            engagements.createdAt,
            engagements.id,
            workflowCycles.cycleNumber,
            workflowCycles.id,
          )
          .limit(batchSize)
          .offset(offset);

        if (cycles.length === 0) break;

        const cycleIds = cycles.map((cycle) => cycle.id);

        const exemptions = await listWorkflowExemptionDetails(
          inArray(workflowExemptions.workflowCycleId, cycleIds),
          tx,
        );

        const inductions = await tx
          .select({
            workflowCycleId: inductionRecords.workflowCycleId,
            generalSiteInduction: inductionRecords.generalSiteInduction,
            otherInductions: inductionRecords.otherInductions,
            completedAt: inductionRecords.completedAt,
          })
          .from(inductionRecords)
          .where(inArray(inductionRecords.workflowCycleId, cycleIds))
          .orderBy(
            desc(inductionRecords.completedAt),
            desc(inductionRecords.id),
          );

        const audits = await tx
          .select({
            workflowCycleId: workflowTransitions.workflowCycleId,
            engagementId: workflowTransitions.engagementId,
            completedBy: staffUsers.displayName,
            performedAt: workflowTransitions.performedAt,
            fromState: workflowTransitions.fromState,
            toState: workflowTransitions.toState,
            comments: workflowTransitions.comments,
          })
          .from(workflowTransitions)
          .leftJoin(
            staffUsers,
            eq(workflowTransitions.performedBy, staffUsers.id),
          )
          .where(
            and(
              inArray(workflowTransitions.workflowCycleId, cycleIds),
              eq(workflowTransitions.fromState, "AtTraining"),
              eq(workflowTransitions.toState, "AtSecurity"),
            ),
          )
          .orderBy(
            desc(workflowTransitions.performedAt),
            desc(workflowTransitions.id),
          );

        const clearanceForms = await tx
          .select({
            workflowCycleId: documents.workflowCycleId,
            engagementId: documents.engagementId,
          })
          .from(documents)
          .where(
            and(
              inArray(documents.workflowCycleId, cycleIds),
              eq(documents.docType, "training_clearance_form"),
            ),
          );

        for (const row of trainingReportRows(
          cycles,
          inductions,
          audits,
          clearanceForms,
          exemptions,
        )) {
          reportRows.push(row);
        }

        if (cycles.length < batchSize) break;
      }

      return reportRows;
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}

// The same report as one CSV: byte-order mark, header row, then the rows.
export async function exportTrainingCsv(
  client: DbClient = db,
): Promise<string> {
  const rows = await exportTrainingRows(client);

  return ["\uFEFF", csvRow(TRAINING_REPORT_HEADERS), ...rows.map(csvRow)].join(
    "",
  );
}

export async function recordInductionCompletion(
  engagementId: string,
  input: {
    generalSiteInduction: boolean;
    otherInductions: boolean;
    trainerComments: string;
  },
  performedBy: string,
  client: DbClient = db,
): Promise<{
  engagement: Engagement;
  recipients: StaffUser[];
  hseRecipients: StaffUser[];
}> {
  const preCheck = await getEngagementById(engagementId, client);

  if (!preCheck) {
    throw new Error("Engagement not found");
  }

  if (preCheck.workflowState !== "AtTraining") {
    throw new Error("Engagement is not awaiting induction");
  }

  // The medical has to still be valid at sign-off, not merely at the moment
  // Hospital cleared them — otherwise a record can sit here for months and
  // reach Security on an expired clearance.
  const clearance = await checkHospitalClearanceAge(engagementId, client);

  if (clearance.applicable && clearance.expired) {
    throw new Error(
      "Hospital clearance has expired. This record must return to the Hospital stage before induction can be signed off",
    );
  }

  const recipients = await getStaffByWorkflowRoles(["SecurityStaff"], client);
  const hseRecipients = await getStaffByWorkflowRoles(["HSE"], client);

  const updated = await client.transaction(async (tx) => {
    // Same row lock as Hospital's: the pre-check is a fast path, this is the
    // guard against two sign-offs racing each other.
    const [engagement] = await tx
      .select()
      .from(engagements)
      .where(eq(engagements.id, engagementId))
      .for("update");

    if (!engagement) {
      throw new Error("Engagement not found");
    }

    if (engagement.workflowState !== "AtTraining") {
      throw new Error("Engagement is not awaiting induction");
    }

    const [cycle] = await tx
      .select()
      .from(workflowCycles)
      .where(
        and(
          eq(workflowCycles.engagementId, engagementId),
          isNull(workflowCycles.archivedAt),
        ),
      )
      .orderBy(desc(workflowCycles.cycleNumber))
      .limit(1);

    if (!cycle) {
      throw new Error("No active workflow cycle for this engagement");
    }

    const exemptions = await getActiveWorkflowExemptions(engagementId, tx);

    if (exemptions.some((exemption) => exemption.stage === "Training")) {
      throw new Error("Training School is exempted for this workflow cycle");
    }

    const currentClearance = await checkHospitalClearanceAge(engagementId, tx);

    if (currentClearance.applicable && currentClearance.expired) {
      throw new Error(
        "Hospital clearance has expired. This record must return to Hospital before induction can be signed off",
      );
    }

    await tx.insert(inductionRecords).values({
      workflowCycleId: cycle.id,
      generalSiteInduction: input.generalSiteInduction,
      otherInductions: input.otherInductions,
      trainerComments: input.trainerComments.trim(),
    });

    const [updatedEngagement] = await tx
      .update(engagements)
      .set({ workflowState: "AtSecurity" })
      .where(eq(engagements.id, engagementId))
      .returning();

    await tx.insert(workflowTransitions).values({
      engagementId,
      workflowCycleId: cycle.id,
      fromState: "AtTraining",
      toState: "AtSecurity",
      performedBy,
      comments: "Induction completed",
    });

    const personName = await personNameFor(engagementId, tx);
    const notices = [
      ...recipients.map((recipient) => ({
        recipientStaffUserId: recipient.id,
        engagementId,
        message: notice.inductionCompleted(personName),
      })),
      ...hseRecipients.map((recipient) => ({
        recipientStaffUserId: recipient.id,
        engagementId,
        message: notice.inductionCompletedForHse(personName),
      })),
    ];

    if (notices.length > 0) {
      await tx.insert(notifications).values(notices);
    }

    return updatedEngagement;
  });

  return { engagement: updated, recipients, hseRecipients };
}

export type AccessProvisioning = typeof accessProvisionings.$inferSelect;

export async function getAccessProvisioning(
  engagementId: string,
): Promise<AccessProvisioning | undefined> {
  const [cycle] = await db
    .select()
    .from(workflowCycles)
    .where(
      and(
        eq(workflowCycles.engagementId, engagementId),
        isNull(workflowCycles.archivedAt),
      ),
    )
    .orderBy(desc(workflowCycles.cycleNumber))
    .limit(1);

  if (!cycle) {
    return undefined;
  }

  const [record] = await db
    .select()
    .from(accessProvisionings)
    .where(eq(accessProvisionings.workflowCycleId, cycle.id))
    .orderBy(desc(accessProvisionings.activatedAt))
    .limit(1);

  return record;
}

const REQUIRED_ACTIVATION_DOCS: DocType[] = ["passport_photo"];

// Moves Active records whose card has lapsed to Expired, so the stored state
// catches up with the date. Nothing runs on a timer yet, so Security's register
// calls this when it loads; the display derives the same answer
// (`getEffectiveAccessState`) so it is right even before this has run.
export async function expireLapsedAccess(): Promise<number> {
  const expired = await db
    .update(engagements)
    .set({ accessState: "Expired" })
    .where(
      and(
        eq(engagements.accessState, "Active"),
        inArray(
          engagements.id,
          db
            .select({ id: workflowCycles.engagementId })
            .from(accessProvisionings)
            .innerJoin(
              workflowCycles,
              eq(accessProvisionings.workflowCycleId, workflowCycles.id),
            )
            .where(
              and(
                isNull(workflowCycles.archivedAt),
                lt(accessProvisionings.accessCardExpiry, isoToday()),
              ),
            ),
        ),
      ),
    )
    .returning({ id: engagements.id });

  return expired.length;
}

// Security's worked-on tab: access that has actually been switched on, with
// the card it was issued against.
export type ProvisioningRow = {
  provisioning: AccessProvisioning;
  engagement: Engagement;
  person: typeof persons.$inferSelect;
  // Set when the card belongs to an earlier cycle — history, not the card
  // the record holds now, so it can't be re-dated.
  cycleArchivedAt: Date | null;
  // What `hasPendingStayExtension` needs: Security may only re-date a card
  // after a stakeholder extends the stay.
  latestExtensionAt: Date | null;
  latestCardUpdateAt: Date | null;
};

const toDateOrNull = (value: string | Date | null): Date | null =>
  value === null ? null : new Date(value);

function latestStayExtensionAt() {
  return sql<Date | null>`(select max(${stayExtensions.extendedAt}) from ${stayExtensions} where ${stayExtensions.engagementId} = ${engagements.id})`.mapWith(
    toDateOrNull,
  );
}

function latestCardUpdateAt() {
  return sql<Date | null>`(select max(${accessCardExpiryUpdates.updatedAt}) from ${accessCardExpiryUpdates} where ${accessCardExpiryUpdates.accessProvisioningId} = ${accessProvisionings.id})`.mapWith(
    toDateOrNull,
  );
}

export async function listRecentProvisionings(
  request: PageRequest &
    Pick<EngagementFilters, "accessState" | "accessPurpose"> = {},
): Promise<Page<ProvisioningRow>> {
  const page = request.page ?? 1;
  const pageSize = request.pageSize ?? DEFAULT_PAGE_SIZE;
  const where = and(
    personSearchFilter(request.search),
    // Each row shows access against its own card, so filter the same way.
    ...engagementFilterConditions(
      {
        accessState: request.accessState,
        accessPurpose: request.accessPurpose,
      },
      accessProvisionings.accessCardExpiry,
    ),
  );

  const [rows, [totals]] = await Promise.all([
    db
      .select({
        provisioning: accessProvisionings,
        engagement: engagements,
        person: persons,
        cycleArchivedAt: workflowCycles.archivedAt,
        latestExtensionAt: latestStayExtensionAt(),
        latestCardUpdateAt: latestCardUpdateAt(),
      })
      .from(accessProvisionings)
      .innerJoin(
        workflowCycles,
        eq(accessProvisionings.workflowCycleId, workflowCycles.id),
      )
      .innerJoin(engagements, eq(workflowCycles.engagementId, engagements.id))
      .innerJoin(persons, eq(engagements.personId, persons.id))
      .where(where)
      .orderBy(desc(accessProvisionings.activatedAt))
      .limit(pageSize)
      .offset(pageOffset(page, pageSize)),
    db
      .select({ value: count() })
      .from(accessProvisionings)
      .innerJoin(
        workflowCycles,
        eq(accessProvisionings.workflowCycleId, workflowCycles.id),
      )
      .innerJoin(engagements, eq(workflowCycles.engagementId, engagements.id))
      .innerJoin(persons, eq(engagements.personId, persons.id))
      .where(where),
  ]);

  return { rows, total: totals?.value ?? 0, page, pageSize };
}

export type CardExpiryUpdate = typeof accessCardExpiryUpdates.$inferSelect;

// Every re-dating of this record's cards, newest first.
export async function getCardExpiryUpdates(
  engagementId: string,
): Promise<CardExpiryUpdate[]> {
  return db
    .select()
    .from(accessCardExpiryUpdates)
    .where(eq(accessCardExpiryUpdates.engagementId, engagementId))
    .orderBy(desc(accessCardExpiryUpdates.updatedAt));
}

// Security re-dates the card a record holds now, usually after a stakeholder
// extended the stay. A lapsed card that is re-dated is live again, so a stored
// Expired goes back to Active (the new date is today or later). Not a
// workflow_state move, so no transition row — `access_card_expiry_updates` is
// the history.
export async function updateCardExpiry(
  engagementId: string,
  accessProvisioningId: string,
  input: CardExpiryUpdateInput,
  performedBy: string,
): Promise<{
  update: CardExpiryUpdate;
  receptionRecipients: StaffUser[];
  hseRecipients: StaffUser[];
}> {
  return db.transaction(async (tx) => {
    const [engagement] = await tx
      .select()
      .from(engagements)
      .where(eq(engagements.id, engagementId))
      .for("update");

    if (!engagement) {
      throw new Error("Engagement not found");
    }

    // SAFETY: workflow_state and access_state are written only from their
    // unions by this service.
    if (
      !isCardExpiryUpdatable({
        workflowState: engagement.workflowState as WorkflowState,
        accessState: engagement.accessState as AccessState,
      })
    ) {
      throw new Error(
        "Only an active or expired card on a completed record can be re-dated",
      );
    }

    const [current] = await tx
      .select({ provisioning: accessProvisionings })
      .from(accessProvisionings)
      .innerJoin(
        workflowCycles,
        eq(accessProvisionings.workflowCycleId, workflowCycles.id),
      )
      .where(
        and(
          eq(accessProvisionings.id, accessProvisioningId),
          eq(workflowCycles.engagementId, engagementId),
          isNull(workflowCycles.archivedAt),
        ),
      );

    if (!current) {
      throw new Error("This card is not the one the record currently holds");
    }

    const [timing] = await tx
      .select({
        latestExtensionAt: latestStayExtensionAt(),
        latestCardUpdateAt: latestCardUpdateAt(),
      })
      .from(accessProvisionings)
      .innerJoin(
        workflowCycles,
        eq(accessProvisionings.workflowCycleId, workflowCycles.id),
      )
      .innerJoin(engagements, eq(workflowCycles.engagementId, engagements.id))
      .where(eq(accessProvisionings.id, accessProvisioningId));

    if (
      !hasPendingStayExtension({
        cardActivatedAt: current.provisioning.activatedAt,
        latestExtensionAt: timing?.latestExtensionAt ?? null,
        latestCardUpdateAt: timing?.latestCardUpdateAt ?? null,
      })
    ) {
      throw new Error(
        "Security can only update the card after a stakeholder extends the stay",
      );
    }

    const valid = validateCardExpiryUpdate(input, {
      accessCardExpiry: current.provisioning.accessCardExpiry,
      departureDate: engagement.departureDate,
    });

    await tx
      .update(accessProvisionings)
      .set({ accessCardExpiry: valid.newExpiry })
      .where(eq(accessProvisionings.id, accessProvisioningId));

    if (engagement.accessState === "Expired") {
      await tx
        .update(engagements)
        .set({ accessState: "Active" })
        .where(eq(engagements.id, engagementId));
    }

    const [update] = await tx
      .insert(accessCardExpiryUpdates)
      .values({
        engagementId,
        accessProvisioningId,
        previousExpiry: current.provisioning.accessCardExpiry,
        newExpiry: valid.newExpiry,
        comments: valid.comments,
        updatedBy: performedBy,
      })
      .returning();

    // The same audiences told when access was activated.
    const receptionRecipients = await getStaffByWorkflowRoles(
      ["Receptionist"],
      tx,
    );
    const hseRecipients = withoutAlreadyNotified(
      await getStaffByWorkflowRoles(["HSE"], tx),
      receptionRecipients,
    );

    const message = notice.cardExpiryUpdated(
      await personNameFor(engagementId, tx),
      valid.newExpiry,
    );
    const notices = [...receptionRecipients, ...hseRecipients].map(
      (recipient) => ({
        recipientStaffUserId: recipient.id,
        engagementId,
        message,
      }),
    );

    if (notices.length > 0) {
      await tx.insert(notifications).values(notices);
    }

    return { update, receptionRecipients, hseRecipients };
  });
}

// The last step, taken by Security: access becomes live. Both the workflow and
// the access state move here — they are separate columns because a Completed
// engagement can later have its access terminated without the workflow being
// rewritten.
export async function activateAccess(
  engagementId: string,
  input: {
    idType: string;
    biometricCaptured: boolean;
    accessCardNumber: string;
    accessCardExpiry: string;
    comments: string;
  },
  performedBy: string,
): Promise<{
  engagement: Engagement;
  recipients: StaffUser[];
  hseRecipients: StaffUser[];
}> {
  const comments =
    typeof input.comments === "string" ? input.comments.trim() : "";

  if (!comments) {
    throw new Error("Comments are required before activating access");
  }

  const preCheck = await getEngagementById(engagementId);

  if (!preCheck) {
    throw new Error("Engagement not found");
  }

  if (preCheck.workflowState !== "AtSecurity") {
    throw new Error("Engagement is not awaiting Security review");
  }

  const uploaded = await getDocumentsForEngagement(engagementId);
  const missing = REQUIRED_ACTIVATION_DOCS.filter(
    (docType) => !uploaded.some((doc) => doc.docType === docType),
  );

  if (missing.length > 0) {
    throw new Error(
      `Upload the passport photograph before activating access: ${missing
        .map((docType) => DOCUMENT_LABELS[docType])
        .join(", ")}`,
    );
  }

  // A card that is already expired is not access. Valid through its expiry
  // date, so today is the earliest it can be.
  if (input.accessCardExpiry < isoToday()) {
    throw new Error("Access card expiry cannot be in the past");
  }

  // Business rule from project-overview.md. The visa/permit half of it cannot
  // be checked yet — those expiry dates are not stored until Slice 8.
  if (input.accessCardExpiry > preCheck.departureDate) {
    throw new Error(
      `Access card expiry cannot be later than the departure date (${preCheck.departureDate})`,
    );
  }

  // Security did this themselves, so only Reception needs telling — and HSE,
  // which follows every record through to activation.
  const recipients = await getStaffByWorkflowRoles(["Receptionist"]);
  const hseRecipients = await getStaffByWorkflowRoles(["HSE"]);

  const updated = await db.transaction(async (tx) => {
    const [engagement] = await tx
      .select()
      .from(engagements)
      .where(eq(engagements.id, engagementId))
      .for("update");

    if (!engagement || engagement.workflowState !== "AtSecurity") {
      throw new Error("Engagement is not awaiting Security review");
    }

    const [cycle] = await tx
      .select()
      .from(workflowCycles)
      .where(
        and(
          eq(workflowCycles.engagementId, engagementId),
          isNull(workflowCycles.archivedAt),
        ),
      )
      .orderBy(desc(workflowCycles.cycleNumber))
      .limit(1);

    if (!cycle) {
      throw new Error("No active workflow cycle for this engagement");
    }

    await tx.insert(accessProvisionings).values({
      workflowCycleId: cycle.id,
      idType: input.idType,
      biometricCaptured: input.biometricCaptured,
      accessCardNumber: input.accessCardNumber,
      accessCardExpiry: input.accessCardExpiry,
    });

    const [updatedEngagement] = await tx
      .update(engagements)
      .set({ workflowState: "Completed", accessState: "Active" })
      .where(eq(engagements.id, engagementId))
      .returning();

    await tx.insert(workflowTransitions).values({
      engagementId,
      workflowCycleId: cycle.id,
      fromState: "AtSecurity",
      toState: "Completed",
      performedBy,
      comments: `Access activated, card ${input.accessCardNumber}\n${comments}`,
    });

    const personName = await personNameFor(engagementId, tx);
    const notices = [
      ...recipients.map((recipient) => ({
        recipientStaffUserId: recipient.id,
        engagementId,
        message: notice.accessActivated(personName),
      })),
      ...hseRecipients.map((recipient) => ({
        recipientStaffUserId: recipient.id,
        engagementId,
        message: notice.accessActivated(personName),
      })),
    ];

    if (notices.length > 0) {
      await tx.insert(notifications).values(notices);
    }

    return updatedEngagement;
  });

  return { engagement: updated, recipients, hseRecipients };
}
