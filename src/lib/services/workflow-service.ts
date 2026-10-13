import {
  and,
  arrayOverlaps,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  notInArray,
  or,
  type SQL,
} from "drizzle-orm";
import type { SessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import {
  accessProvisionings,
  engagements,
  hospitalClearances,
  inductionRecords,
  notifications,
  persons,
  staffUsers,
  stakeholderApprovals,
  terminationRequests,
  workflowCycles,
  workflowTransitions,
} from "@/lib/db/schema";
import {
  DEFAULT_PAGE_SIZE,
  type Page,
  type PageRequest,
  pageOffset,
} from "@/lib/domain/pagination";
import {
  type AccessPurpose,
  type ApproverRole,
  DOCUMENT_LABELS,
  type DocType,
  type HospitalClearanceStatus,
  type ReceptionData,
  type WorkflowRole,
  type WorkflowState,
} from "@/lib/domain/types";
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
export type WorkflowCycle = typeof workflowCycles.$inferSelect;
export type HospitalClearance = typeof hospitalClearances.$inferSelect;

export type ReceptionFormInput = {
  person: PersonInput;
  accessPurpose: AccessPurpose;
  arrivalDate: string;
  departureDate: string;
  receptionData: ReceptionData;
};

export async function getStaffByWorkflowRoles(
  roles: WorkflowRole[],
): Promise<StaffUser[]> {
  return db
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
  const stakeholders = await getStaffByWorkflowRoles(["HCM", "GMM", "DMD"]);
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

function getNextStateForPath(accessPurpose: AccessPurpose): {
  nextState: WorkflowState;
  nextRole: WorkflowRole | null;
} {
  switch (accessPurpose) {
    case "Work":
      return { nextState: "AtHospital", nextRole: "HospitalStaff" };
    case "VisitMine":
      return { nextState: "AtTraining", nextRole: "TrainingStaff" };
    case "Visit":
      return { nextState: "Completed", nextRole: null };
  }
}

export async function getEngagementById(
  engagementId: string,
): Promise<Engagement | undefined> {
  const [engagement] = await db
    .select()
    .from(engagements)
    .where(eq(engagements.id, engagementId));
  return engagement;
}

export async function getActiveWorkflowCycle(
  engagementId: string,
): Promise<WorkflowCycle | undefined> {
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
  return cycle;
}

export type EngagementRow = {
  engagement: Engagement;
  person: typeof persons.$inferSelect;
};

// Name or passport, case-insensitive and partial — the two things a
// Receptionist has in front of them when someone is standing at the desk.
// Matching happens in Postgres: these queues are expected to run to thousands
// of rows, and fetching all of them to filter in JS would not survive that.
function personSearchFilter(search: string | undefined): SQL | undefined {
  if (!search) {
    return undefined;
  }

  const pattern = `%${search}%`;

  return or(
    ilike(persons.fullName, pattern),
    ilike(persons.passportNo, pattern),
  );
}

export async function listEngagementsWithPerson(
  request: PageRequest & { workflowState?: WorkflowState } = {},
): Promise<Page<EngagementRow>> {
  const page = request.page ?? 1;
  const pageSize = request.pageSize ?? DEFAULT_PAGE_SIZE;

  const filters = [
    personSearchFilter(request.search),
    request.workflowState
      ? eq(engagements.workflowState, request.workflowState)
      : undefined,
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

export async function listEngagementsForLayer(
  workflowState: WorkflowState,
  accessPurposes?: AccessPurpose[],
  request: PageRequest = {},
): Promise<Page<EngagementRow>> {
  const page = request.page ?? 1;
  const pageSize = request.pageSize ?? DEFAULT_PAGE_SIZE;

  const conditions = [eq(engagements.workflowState, workflowState)];

  if (accessPurposes && accessPurposes.length > 0) {
    conditions.push(inArray(engagements.accessPurpose, accessPurposes));
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

  const approvals = await db
    .select()
    .from(stakeholderApprovals)
    .where(eq(stakeholderApprovals.engagementId, engagementId));

  return { ...row, approvals };
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
  `This passport already has an active engagement (currently ${workflowState}) — open that record instead of creating a new one.`;

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
    .set({ approvalRequestedAt: new Date() })
    .where(eq(engagements.id, engagementId));

  const recipients = await getStaffByWorkflowRoles(["HCM", "GMM", "DMD"]);
  await notifyStaff(
    recipients,
    engagementId,
    "Stakeholder approval requested — HCM, GMM, or DMD sign-off needed.",
  );

  return { recipients };
}

// Engagements Reception has sent for sign-off and nobody has signed yet. A
// delegated approver sees only the engagement they were granted; HCM, GMM and
// DMD see every outstanding one, since any single approval is enough.
export async function listEngagementsAwaitingApproval(
  delegatedApproverId?: string,
  request: PageRequest = {},
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
  request: PageRequest = {},
  /** Set for a delegated approver: their grant was per engagement, so they
   * see what they signed rather than every stakeholder's sign-offs. */
  approverStaffUserId?: string,
): Promise<Page<ApprovalRow>> {
  const page = request.page ?? 1;
  const pageSize = request.pageSize ?? DEFAULT_PAGE_SIZE;

  const filters = [
    personSearchFilter(request.search),
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
};

export async function listRecentHospitalClearances(
  request: PageRequest = {},
): Promise<Page<HospitalClearanceRow>> {
  const page = request.page ?? 1;
  const pageSize = request.pageSize ?? DEFAULT_PAGE_SIZE;
  const where = personSearchFilter(request.search);

  // A clearance hangs off the workflow cycle, not the engagement, so the
  // engagement and person both come through that join.
  const [rows, [totals]] = await Promise.all([
    db
      .select({
        clearance: hospitalClearances,
        engagement: engagements,
        person: persons,
      })
      .from(hospitalClearances)
      .innerJoin(
        workflowCycles,
        eq(hospitalClearances.workflowCycleId, workflowCycles.id),
      )
      .innerJoin(engagements, eq(workflowCycles.engagementId, engagements.id))
      .innerJoin(persons, eq(engagements.personId, persons.id))
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

export async function applyStakeholderApproval(
  engagementId: string,
  session: SessionUser,
  input: {
    signature: string;
  },
  performedBy: string,
): Promise<{
  engagement: Engagement;
  recipients: StaffUser[];
  nextRole: WorkflowRole | null;
}> {
  const engagement = await getEngagementById(engagementId);
  if (!engagement) {
    throw new Error("Engagement not found");
  }
  if (engagement.workflowState !== "AtReception") {
    throw new Error("Engagement is not awaiting Reception approval");
  }

  const directRole = (["HCM", "GMM", "DMD"] as const).find((role) =>
    session.workflowRoles.includes(role),
  );
  const isDelegatedApprover =
    !directRole &&
    engagement.delegatedApproverId !== null &&
    engagement.delegatedApproverId === session.staffUserId;

  if (!directRole && !isDelegatedApprover) {
    throw new Error("Not authorized to approve this engagement");
  }

  const approverRole: ApproverRole = directRole ?? "Delegated";
  const approverName = session.displayName ?? "";
  const { nextState, nextRole } = getNextStateForPath(
    engagement.accessPurpose as AccessPurpose,
  );
  const recipients = nextRole ? await getStaffByWorkflowRoles([nextRole]) : [];

  const updated = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(stakeholderApprovals)
      .where(eq(stakeholderApprovals.engagementId, engagementId));
    if (existing) {
      throw new Error("Engagement has already been approved");
    }

    try {
      await tx.insert(stakeholderApprovals).values({
        engagementId,
        approverRole,
        approverStaffUserId: session.staffUserId,
        approverName,
        signature: input.signature,
        isDelegated: isDelegatedApprover,
        delegatedBy: isDelegatedApprover
          ? engagement.delegationGrantedBy
          : null,
        delegatedAt: isDelegatedApprover
          ? engagement.delegationGrantedAt
          : null,
        delegationReason: isDelegatedApprover
          ? engagement.delegationReason
          : null,
      });
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

    const [updatedEngagement] = await tx
      .update(engagements)
      .set({
        workflowState: nextState,
        delegatedApproverId: null,
        delegationGrantedBy: null,
        delegationGrantedAt: null,
        delegationReason: null,
      })
      .where(eq(engagements.id, engagementId))
      .returning();

    await tx.insert(workflowTransitions).values({
      engagementId,
      workflowCycleId: cycle.id,
      fromState: "AtReception",
      toState: nextState,
      performedBy,
      comments: `Approved by ${approverName} (${approverRole})`,
    });

    if (recipients.length > 0 && nextRole) {
      await tx.insert(notifications).values(
        recipients.map((recipient) => ({
          recipientStaffUserId: recipient.id,
          engagementId,
          message: `Engagement approved at Reception and routed to ${nextRole}.`,
        })),
      );
    }

    return updatedEngagement;
  });

  return { engagement: updated, recipients, nextRole };
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
    `Delegated approval requested — HCM, GMM, and DMD are unavailable. Reason: ${reason}`,
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
      "You've been granted a one-off delegated approval privilege for this engagement.",
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

export async function requestTermination(
  engagementId: string,
  requestedBy: string,
  reason: string,
): Promise<{ recipients: StaffUser[] }> {
  await db
    .insert(terminationRequests)
    .values({ engagementId, requestedBy, reason });

  const admins = await db
    .select()
    .from(staffUsers)
    .where(
      and(
        eq(staffUsers.systemRole, "SystemAdmin"),
        isNull(staffUsers.deactivatedAt),
      ),
    );

  await notifyStaff(
    admins,
    engagementId,
    `Access termination requested. Reason: ${reason}`,
  );

  return { recipients: admins };
}

export async function getLatestHospitalClearance(
  engagementId: string,
): Promise<HospitalClearance | undefined> {
  const cycle = await getActiveWorkflowCycle(engagementId);
  if (!cycle) {
    return undefined;
  }

  const [latest] = await db
    .select()
    .from(hospitalClearances)
    .where(eq(hospitalClearances.workflowCycleId, cycle.id))
    .orderBy(desc(hospitalClearances.clearanceDate))
    .limit(1);

  return latest;
}

export async function recordHospitalClearance(
  engagementId: string,
  input: { clearanceStatus: HospitalClearanceStatus; doctorComments: string },
  performedBy: string,
): Promise<{
  engagement: Engagement;
  recipients: StaffUser[];
  outcome: "Cleared" | "Unfit";
}> {
  const preCheck = await getEngagementById(engagementId);
  if (!preCheck) {
    throw new Error("Engagement not found");
  }
  if (
    preCheck.workflowState !== "AtHospital" ||
    preCheck.accessPurpose !== "Work"
  ) {
    throw new Error("Engagement is not awaiting Hospital clearance");
  }

  const uploaded = await getDocumentsForEngagement(engagementId);
  const hasFitnessForm = uploaded.some(
    (doc) => doc.docType === "hospital_fitness_form",
  );
  if (!hasFitnessForm) {
    throw new Error(
      "Upload the fitness form before recording a clearance decision",
    );
  }

  const outcome: "Cleared" | "Unfit" =
    input.clearanceStatus === "Unfit" ? "Unfit" : "Cleared";
  const recipients =
    outcome === "Cleared"
      ? await getStaffByWorkflowRoles(["TrainingStaff"])
      : await getStaffByWorkflowRoles(["Receptionist"]);

  const updated = await db.transaction(async (tx) => {
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
      engagement.accessPurpose !== "Work"
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

    await tx.insert(hospitalClearances).values({
      workflowCycleId: cycle.id,
      clearanceStatus: input.clearanceStatus,
      doctorComments: input.doctorComments,
    });

    let updatedEngagement = engagement;
    if (outcome === "Cleared") {
      [updatedEngagement] = await tx
        .update(engagements)
        .set({ workflowState: "AtTraining" })
        .where(eq(engagements.id, engagementId))
        .returning();

      await tx.insert(workflowTransitions).values({
        engagementId,
        workflowCycleId: cycle.id,
        fromState: "AtHospital",
        toState: "AtTraining",
        performedBy,
        comments: `Hospital clearance: ${input.clearanceStatus}`,
      });
    }

    if (recipients.length > 0) {
      await tx.insert(notifications).values(
        recipients.map((recipient) => ({
          recipientStaffUserId: recipient.id,
          engagementId,
          message:
            outcome === "Cleared"
              ? "Hospital clearance recorded and routed to Training School."
              : "Hospital marked this record Unfit — it remains at Hospital.",
        })),
      );
    }

    return updatedEngagement;
  });

  return { engagement: updated, recipients, outcome };
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
): Promise<ClearanceAge> {
  const engagement = await getEngagementById(engagementId);

  if (!engagement || engagement.accessPurpose !== "Work") {
    return { applicable: false };
  }

  const clearance = await getLatestHospitalClearance(engagementId);

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

const REQUIRED_INDUCTION_DOCS: DocType[] = [
  "induction_declaration_form",
  "induction_registration_form",
];

// Training's worked-on tab. Per induction record rather than per engagement:
// a work-path record whose medical lapses returns to Hospital and inducts
// again, and both sign-offs are history.
export type InductionRow = {
  induction: InductionRecord;
  engagement: Engagement;
  person: typeof persons.$inferSelect;
};

export async function listRecentInductions(
  request: PageRequest = {},
): Promise<Page<InductionRow>> {
  const page = request.page ?? 1;
  const pageSize = request.pageSize ?? DEFAULT_PAGE_SIZE;
  const where = personSearchFilter(request.search);

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

export async function recordInductionCompletion(
  engagementId: string,
  input: {
    generalSiteInduction: boolean;
    otherInductions: boolean;
    trainerComments: string;
  },
  performedBy: string,
): Promise<{ engagement: Engagement; recipients: StaffUser[] }> {
  const preCheck = await getEngagementById(engagementId);

  if (!preCheck) {
    throw new Error("Engagement not found");
  }

  if (preCheck.workflowState !== "AtTraining") {
    throw new Error("Engagement is not awaiting induction");
  }

  const uploaded = await getDocumentsForEngagement(engagementId);
  const missing = REQUIRED_INDUCTION_DOCS.filter(
    (docType) => !uploaded.some((doc) => doc.docType === docType),
  );

  if (missing.length > 0) {
    throw new Error(
      `Upload both induction forms before signing off: ${missing
        .map((docType) => DOCUMENT_LABELS[docType])
        .join(", ")}`,
    );
  }

  // The medical has to still be valid at sign-off, not merely at the moment
  // Hospital cleared them — otherwise a record can sit here for months and
  // reach Security on an expired clearance.
  const clearance = await checkHospitalClearanceAge(engagementId);

  if (clearance.applicable && clearance.expired) {
    throw new Error(
      "Hospital clearance has expired — this record must return to the Hospital stage before induction can be signed off",
    );
  }

  const recipients = await getStaffByWorkflowRoles(["SecurityStaff"]);

  const updated = await db.transaction(async (tx) => {
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

    await tx.insert(inductionRecords).values({
      workflowCycleId: cycle.id,
      generalSiteInduction: input.generalSiteInduction,
      otherInductions: input.otherInductions,
      trainerComments: input.trainerComments,
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

    if (recipients.length > 0) {
      await tx.insert(notifications).values(
        recipients.map((recipient) => ({
          recipientStaffUserId: recipient.id,
          engagementId,
          message: "Induction completed — record forwarded to Security.",
        })),
      );
    }

    return updatedEngagement;
  });

  return { engagement: updated, recipients };
}

export type AccessProvisioning = typeof accessProvisionings.$inferSelect;

// Security's only action: it audits what the earlier layers recorded and
// hands the record to IT. Nothing is captured here, so there is no Security
// table — the transition row is the record that it happened.
// Security's worked-on tab. Unlike Hospital, Training and IT, Security
// produces no record of its own — forwarding *is* its output — so the
// workflow transition it performed is what gets listed.
export type SecurityForwardRow = {
  forwardedAt: Date;
  forwardedByName: string;
  engagement: Engagement;
  person: typeof persons.$inferSelect;
};

export async function listRecentSecurityForwards(
  request: PageRequest = {},
): Promise<Page<SecurityForwardRow>> {
  const page = request.page ?? 1;
  const pageSize = request.pageSize ?? DEFAULT_PAGE_SIZE;

  const conditions = [
    eq(workflowTransitions.fromState, "AtSecurity"),
    eq(workflowTransitions.toState, "AwaitingProvisioning"),
  ];

  const search = personSearchFilter(request.search);

  if (search) {
    conditions.push(search);
  }

  const where = and(...conditions);

  const [rows, [totals]] = await Promise.all([
    db
      .select({
        forwardedAt: workflowTransitions.performedAt,
        forwardedByName: staffUsers.displayName,
        engagement: engagements,
        person: persons,
      })
      .from(workflowTransitions)
      .innerJoin(
        engagements,
        eq(workflowTransitions.engagementId, engagements.id),
      )
      .innerJoin(persons, eq(engagements.personId, persons.id))
      .innerJoin(staffUsers, eq(workflowTransitions.performedBy, staffUsers.id))
      .where(where)
      .orderBy(desc(workflowTransitions.performedAt))
      .limit(pageSize)
      .offset(pageOffset(page, pageSize)),
    db
      .select({ value: count() })
      .from(workflowTransitions)
      .innerJoin(
        engagements,
        eq(workflowTransitions.engagementId, engagements.id),
      )
      .innerJoin(persons, eq(engagements.personId, persons.id))
      .where(where),
  ]);

  return { rows, total: totals?.value ?? 0, page, pageSize };
}

export async function forwardToIT(
  engagementId: string,
  performedBy: string,
): Promise<{ engagement: Engagement; recipients: StaffUser[] }> {
  const preCheck = await getEngagementById(engagementId);

  if (!preCheck) {
    throw new Error("Engagement not found");
  }

  if (preCheck.workflowState !== "AtSecurity") {
    throw new Error("Engagement is not awaiting Security review");
  }

  const recipients = await getStaffByWorkflowRoles(["ITStaff"]);

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

    const [updatedEngagement] = await tx
      .update(engagements)
      .set({ workflowState: "AwaitingProvisioning" })
      .where(eq(engagements.id, engagementId))
      .returning();

    await tx.insert(workflowTransitions).values({
      engagementId,
      workflowCycleId: cycle.id,
      fromState: "AtSecurity",
      toState: "AwaitingProvisioning",
      performedBy,
      comments: "Security review complete — forwarded to IT",
    });

    if (recipients.length > 0) {
      await tx.insert(notifications).values(
        recipients.map((recipient) => ({
          recipientStaffUserId: recipient.id,
          engagementId,
          message: "Security cleared this record — ready for access setup.",
        })),
      );
    }

    return updatedEngagement;
  });

  return { engagement: updated, recipients };
}

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

const REQUIRED_IT_DOCS: DocType[] = ["biometric_image", "passport_photo"];

// The last step: access becomes live. Both the workflow and the access state
// move here — they are separate columns because a Completed engagement can
// later have its access terminated without the workflow being rewritten.
// IT's worked-on tab: access that has actually been switched on, with the
// card it was issued against.
export type ProvisioningRow = {
  provisioning: AccessProvisioning;
  engagement: Engagement;
  person: typeof persons.$inferSelect;
};

export async function listRecentProvisionings(
  request: PageRequest = {},
): Promise<Page<ProvisioningRow>> {
  const page = request.page ?? 1;
  const pageSize = request.pageSize ?? DEFAULT_PAGE_SIZE;
  const where = personSearchFilter(request.search);

  const [rows, [totals]] = await Promise.all([
    db
      .select({
        provisioning: accessProvisionings,
        engagement: engagements,
        person: persons,
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

export async function activateAccess(
  engagementId: string,
  input: {
    idType: string;
    biometricCaptured: boolean;
    accessCardNumber: string;
    accessCardExpiry: string;
  },
  performedBy: string,
): Promise<{ engagement: Engagement; recipients: StaffUser[] }> {
  const preCheck = await getEngagementById(engagementId);

  if (!preCheck) {
    throw new Error("Engagement not found");
  }

  if (preCheck.workflowState !== "AwaitingProvisioning") {
    throw new Error("Engagement is not awaiting access provisioning");
  }

  const uploaded = await getDocumentsForEngagement(engagementId);
  const missing = REQUIRED_IT_DOCS.filter(
    (docType) => !uploaded.some((doc) => doc.docType === docType),
  );

  if (missing.length > 0) {
    throw new Error(
      `Upload both before activating access: ${missing
        .map((docType) => DOCUMENT_LABELS[docType])
        .join(", ")}`,
    );
  }

  // Business rule from project-overview.md. The visa/permit half of it cannot
  // be checked yet — those expiry dates are not stored until Slice 8.
  if (input.accessCardExpiry > preCheck.departureDate) {
    throw new Error(
      `Access card expiry cannot be later than the departure date (${preCheck.departureDate})`,
    );
  }

  // Security and Reception both want to know access went live.
  const recipients = await getStaffByWorkflowRoles([
    "SecurityStaff",
    "Receptionist",
  ]);

  const updated = await db.transaction(async (tx) => {
    const [engagement] = await tx
      .select()
      .from(engagements)
      .where(eq(engagements.id, engagementId))
      .for("update");

    if (!engagement || engagement.workflowState !== "AwaitingProvisioning") {
      throw new Error("Engagement is not awaiting access provisioning");
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
      fromState: "AwaitingProvisioning",
      toState: "Completed",
      performedBy,
      comments: `Access activated — card ${input.accessCardNumber}`,
    });

    if (recipients.length > 0) {
      await tx.insert(notifications).values(
        recipients.map((recipient) => ({
          recipientStaffUserId: recipient.id,
          engagementId,
          message: "Site access has been activated.",
        })),
      );
    }

    return updatedEngagement;
  });

  return { engagement: updated, recipients };
}
