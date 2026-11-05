// Run explicitly: dotenvx run -f .env.development -- bun src/lib/services/workflow-exemptions.integration.ts
// Temporary tables shadow public tables inside one rolled-back transaction; no visitor data is written.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { and, count, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { SessionUser } from "@/lib/auth/session";
import type { DbClient } from "@/lib/db/client";
import {
  engagements,
  hospitalClearances,
  inductionRecords,
  notifications,
  persons,
  staffUsers,
  stakeholderApprovals,
  stakeholderRejections,
  workflowCycles,
  workflowExemptions,
  workflowTransitions,
} from "@/lib/db/schema";
import type {
  AccessPurpose,
  SystemRole,
  WorkflowExemptionStage,
  WorkflowRole,
} from "@/lib/domain/types";
import {
  applyStakeholderApproval,
  applyStakeholderExemption,
  checkHospitalClearanceAge,
  exportSecurityCsv,
  exportTrainingCsv,
  getActiveWorkflowExemptions,
  getEngagementById,
  getWorkflowExemptionDetails,
  recordHospitalClearance,
  recordInductionCompletion,
  rejectStakeholderApproval,
} from "./workflow-service";

const connectionString = process.env.DATABASE_URL;
if (!connectionString)
  throw new Error(
    "DATABASE_URL is required for this explicit integration check",
  );
const connection = postgres(connectionString, { max: 1, connect_timeout: 10 });
const database = drizzle(connection, { casing: "snake_case" });
const rollback = new Error("Rollback isolated workflow fixtures");
const signature = JSON.stringify({
  mode: "type",
  value: "Exemption Test Stakeholder",
});
let passed = 0;

async function verify(name: string, check: () => Promise<void>): Promise<void> {
  if (process.argv[2] && !name.includes(process.argv[2])) return;

  await check();
  passed += 1;
  console.log(`PASS ${name}`);
}

function serializedFixtureTransactions(client: DbClient): DbClient {
  let queue = Promise.resolve();
  return new Proxy(client, {
    get(target, property, receiver) {
      if (property === "transaction") {
        return async (
          work: Parameters<DbClient["transaction"]>[0],
        ): Promise<unknown> => {
          const previous = queue;
          let release: (() => void) | undefined;
          queue = new Promise<void>((resolve) => {
            release = resolve;
          });
          await previous;
          try {
            return await target.transaction(work);
          } finally {
            release?.();
          }
        };
      }
      return Reflect.get(target, property, receiver);
    },
  });
}

try {
  await database.transaction(async (client) => {
    for (const table of [
      "staff_users",
      "persons",
      "engagements",
      "workflow_cycles",
      "stakeholder_approvals",
      "stakeholder_rejections",
      "workflow_exemptions",
      "workflow_transitions",
      "notifications",
      "hospital_clearances",
      "induction_records",
      "invitations",
      "registration_requests",
      "documents",
      "access_provisionings",
      "termination_requests",
    ]) {
      await client.execute(
        sql.raw(
          `CREATE TEMP TABLE "${table}" (LIKE public."${table}" INCLUDING ALL) ON COMMIT DROP`,
        ),
      );
      const [resolved] = await client.execute<{ isolated: boolean }>(
        sql.raw(
          `SELECT to_regclass('${table}') = to_regclass('pg_temp.${table}') AS isolated`,
        ),
      );
      assert.equal(resolved?.isolated, true);
    }
    await client.execute(
      sql`ALTER TABLE workflow_exemptions ADD FOREIGN KEY (workflow_cycle_id, engagement_id) REFERENCES workflow_cycles(id, engagement_id)`,
    );
    await client.execute(
      sql`ALTER TABLE workflow_exemptions ADD FOREIGN KEY (stakeholder_approval_id, engagement_id) REFERENCES stakeholder_approvals(id, engagement_id)`,
    );

    async function actor(
      role: WorkflowRole,
      systemRole: SystemRole = "Admin",
    ): Promise<SessionUser> {
      const [row] = await client
        .insert(staffUsers)
        .values({
          entraObjectId: randomUUID(),
          email: `${randomUUID()}@example.test`,
          displayName: `Test ${role}`,
          systemRole,
          workflowRoles: [role],
        })
        .returning();
      return {
        staffUserId: row.id,
        systemRole,
        workflowRoles: [role],
        pinConfirmed: true,
        hasPinSet: true,
        displayName: row.displayName,
        email: row.email,
        image: null,
      };
    }

    async function engagement(
      purpose: AccessPurpose = "Work",
      withCycle = true,
    ): Promise<string> {
      const [person] = await client
        .insert(persons)
        .values({
          passportNo: "TEST-ONLY",
          passportNoHash: randomUUID(),
          fullName: "Test Visitor",
          dateOfBirth: "1990-01-01",
          gender: "Male",
          nationality: "Test",
          phone: "000",
          emergencyContactName: "Test Contact",
          emergencyContactPhone: "000",
        })
        .returning();
      const [row] = await client
        .insert(engagements)
        .values({
          personId: person.id,
          accessPurpose: purpose,
          arrivalDate: "2026-11-01",
          departureDate: "2099-12-31",
          receptionData: { companyName: "Test Company" },
          approvalRequestedAt: new Date(),
        })
        .returning();
      if (withCycle)
        await client
          .insert(workflowCycles)
          .values({ engagementId: row.id, cycleNumber: 1 });
      return row.id;
    }

    const stakeholder = await actor("CSO");
    const secondStakeholder = await actor("HCM");
    const receptionist = await actor("Receptionist");
    const hospital = await actor("HospitalStaff");
    const trainer = await actor("TrainingStaff");
    const security = await actor("SecurityStaff");

    async function exempt(
      id: string,
      stages: WorkflowExemptionStage[],
      signer = stakeholder,
      target: DbClient = client,
    ): Promise<void> {
      await applyStakeholderExemption(
        id,
        signer,
        { signature, exemption: { stages, reason: "  Verified exception  " } },
        signer.staffUserId,
        target,
      );
    }

    // Training can no longer be exempted (2026-11-05), but records that were
    // still exist. This writes one the way the old flow left it — a normal
    // approval plus a Training exemption row — so its routing stays tested.
    async function legacyTrainingExemption(id: string): Promise<void> {
      await applyStakeholderApproval(
        id,
        stakeholder,
        { signature },
        stakeholder.staffUserId,
        client,
      );
      const [cycle] = await client
        .select()
        .from(workflowCycles)
        .where(eq(workflowCycles.engagementId, id));
      const [approval] = await client
        .select()
        .from(stakeholderApprovals)
        .where(eq(stakeholderApprovals.engagementId, id));
      await client.insert(workflowExemptions).values({
        engagementId: id,
        workflowCycleId: cycle.id,
        stakeholderApprovalId: approval.id,
        stage: "Training",
        reason: "Verified exception",
      });
    }

    for (const purpose of ["Work", "WorkMine"] as const) {
      for (const stages of [
        [],
        ["Hospital"],
      ] satisfies WorkflowExemptionStage[][]) {
        await verify(
          `${purpose}: ${stages.join(" + ") || "normal approval"}`,
          async () => {
            const id = await engagement(purpose);
            if (stages.length) await exempt(id, stages);
            else
              await applyStakeholderApproval(
                id,
                stakeholder,
                { signature },
                stakeholder.staffUserId,
                client,
              );
            const row = await getEngagementById(id, client);
            assert.equal(
              row?.workflowState,
              stages.includes("Hospital") ? "AtTraining" : "AtHospital",
            );
            const saved = await getActiveWorkflowExemptions(id, client);
            assert.equal(saved.length, stages.length);
            for (const entry of saved)
              assert.equal(entry.reason, "Verified exception");
            const audits = await client
              .select()
              .from(workflowTransitions)
              .where(eq(workflowTransitions.engagementId, id));
            assert.equal(audits.length, 1);
            if (stages.length) {
              assert.match(audits[0].comments ?? "", /Verified exception/);
              const notices = await client
                .select()
                .from(notifications)
                .where(eq(notifications.engagementId, id));
              // Every stage but Hospital (2026-11-05).
              assert.deepEqual(
                notices.map((notice) => notice.recipientStaffUserId).sort(),
                [
                  receptionist.staffUserId,
                  trainer.staffUserId,
                  security.staffUserId,
                ].sort(),
              );
              assert.equal(
                notices.every((notice) =>
                  notice.message.includes("approved with an exemption"),
                ),
                true,
              );
            }
            const [stored] = await client.execute<{ reason: string }>(
              sql`SELECT reason FROM workflow_exemptions WHERE engagement_id = ${id}`,
            );
            if (stages.length) assert.match(stored.reason, /^enc1\./);
          },
        );
      }
    }

    await verify(
      "Training cannot be exempted any more, alone or with Hospital",
      async () => {
        for (const stages of [
          ["Training"],
          ["Hospital", "Training"],
        ] satisfies WorkflowExemptionStage[][]) {
          const id = await engagement();
          await assert.rejects(() => exempt(id, stages), /Hospital stage/);
          assert.equal(
            (await getEngagementById(id, client))?.workflowState,
            "AtReception",
          );
          assert.deepEqual(await getActiveWorkflowExemptions(id, client), []);
        }
      },
    );

    await verify(
      "a mine tour cannot be by-passed; visit-only approval remains completed",
      async () => {
        const tour = await engagement("VisitMine");
        await assert.rejects(
          () => exempt(tour, ["Hospital"]),
          /Hospital stage/,
        );
        await assert.rejects(
          () => exempt(tour, ["Training"]),
          /Hospital stage/,
        );
        assert.equal(
          (await getEngagementById(tour, client))?.workflowState,
          "AtReception",
        );
        const visit = await engagement("Visit");
        await applyStakeholderApproval(
          visit,
          stakeholder,
          { signature },
          stakeholder.staffUserId,
          client,
        );
        assert.equal(
          (await getEngagementById(visit, client))?.workflowState,
          "Completed",
        );
      },
    );

    await verify(
      "delegated, Guest, MM, inactive and revoked-role users cannot grant exemptions",
      async () => {
        const guest = await actor("CSO", "Guest");
        const mm = await actor("MM");
        const inactive = await actor("GMM");
        await client
          .update(staffUsers)
          .set({ deactivatedAt: new Date() })
          .where(eq(staffUsers.id, inactive.staffUserId));
        const revoked = await actor("EM");
        await client
          .update(staffUsers)
          .set({ workflowRoles: [] })
          .where(eq(staffUsers.id, revoked.staffUserId));
        for (const signer of [receptionist, guest, mm, inactive, revoked]) {
          const id = await engagement();
          await client
            .update(engagements)
            .set({ delegatedApproverId: receptionist.staffUserId })
            .where(eq(engagements.id, id));
          await assert.rejects(() => exempt(id, ["Hospital"], signer));
          assert.equal(
            (await getEngagementById(id, client))?.workflowState,
            "AtReception",
          );
          assert.equal(
            (await getActiveWorkflowExemptions(id, client)).length,
            0,
          );
        }
        const delegated = await engagement();
        await client
          .update(engagements)
          .set({ delegatedApproverId: receptionist.staffUserId })
          .where(eq(engagements.id, delegated));
        await applyStakeholderApproval(
          delegated,
          receptionist,
          { signature },
          receptionist.staffUserId,
          client,
        );
        assert.equal(
          (await getEngagementById(delegated, client))?.workflowState,
          "AtHospital",
        );
      },
    );

    await verify(
      "missing cycle or an audit write failure rolls back the whole exemption approval",
      async () => {
        const missing = await engagement("Work", false);
        await assert.rejects(
          () => exempt(missing, ["Hospital"]),
          /active workflow cycle/,
        );
        assert.equal(
          (
            await client
              .select()
              .from(stakeholderApprovals)
              .where(eq(stakeholderApprovals.engagementId, missing))
          ).length,
          0,
        );
        const failed = await engagement();
        await client.execute(
          sql`ALTER TABLE workflow_transitions ADD CONSTRAINT test_reject_audit CHECK (comments IS NULL) NOT VALID`,
        );
        try {
          await assert.rejects(() => exempt(failed, ["Hospital"]));
        } finally {
          await client.execute(
            sql`ALTER TABLE workflow_transitions DROP CONSTRAINT test_reject_audit`,
          );
        }
        assert.equal(
          (await getEngagementById(failed, client))?.workflowState,
          "AtReception",
        );
        assert.equal(
          (await getActiveWorkflowExemptions(failed, client)).length,
          0,
        );
        assert.equal(
          (
            await client
              .select()
              .from(stakeholderApprovals)
              .where(eq(stakeholderApprovals.engagementId, failed))
          ).length,
          0,
        );
      },
    );

    await verify(
      "first approval or rejection wins, including repeat submissions from another stakeholder",
      async () => {
        const approved = await engagement();
        await exempt(approved, ["Hospital"]);
        await assert.rejects(() =>
          exempt(approved, ["Hospital"], secondStakeholder),
        );
        await assert.rejects(() =>
          rejectStakeholderApproval(
            approved,
            secondStakeholder,
            "Reject",
            client,
          ),
        );
        const rejected = await engagement();
        await rejectStakeholderApproval(
          rejected,
          secondStakeholder,
          "Reject",
          client,
        );
        await assert.rejects(() => exempt(rejected, ["Hospital"]));
        assert.equal(
          (
            await client
              .select()
              .from(stakeholderApprovals)
              .where(eq(stakeholderApprovals.engagementId, approved))
          ).length,
          1,
        );
        assert.equal(
          (
            await client
              .select()
              .from(stakeholderRejections)
              .where(eq(stakeholderRejections.engagementId, rejected))
          ).length,
          1,
        );
      },
    );

    await verify(
      "Hospital sends a cleared legacy Training-exempt record to Security with the correct recipients",
      async () => {
        const id = await engagement();
        await legacyTrainingExemption(id);
        const result = await recordHospitalClearance(
          id,
          {
            clearanceStatus: "FitWithConditions",
            doctorComments: "Conditions recorded",
          },
          hospital.staffUserId,
          client,
        );
        assert.equal(result.engagement.workflowState, "AtSecurity");
        assert.equal(result.nextRole, "SecurityStaff");
        assert.deepEqual(
          result.nextRecipients.map((recipient) => recipient.id),
          [security.staffUserId],
        );
        assert.equal(
          result.receptionRecipients.some(
            (recipient) => recipient.id === receptionist.staffUserId,
          ),
          true,
        );
        const notices = await client
          .select()
          .from(notifications)
          .where(eq(notifications.engagementId, id));
        assert.equal(
          notices.some(
            (notice) => notice.recipientStaffUserId === trainer.staffUserId,
          ),
          false,
        );
        // Training was exempted, so the cleared notice says Security's next
        // step. Checked on a non-empty set, not vacuously.
        const cleared = notices.filter((notice) =>
          notice.message.includes("has been medically cleared"),
        );
        assert.ok(cleared.length > 0);
        assert.equal(
          cleared.every((notice) =>
            notice.message.includes("ready for access activation"),
          ),
          true,
        );
      },
    );

    await verify(
      "Unfit still blocks at Hospital and notifies Reception only",
      async () => {
        const id = await engagement();
        await legacyTrainingExemption(id);
        const result = await recordHospitalClearance(
          id,
          { clearanceStatus: "Unfit", doctorComments: "Reassessment needed" },
          hospital.staffUserId,
          client,
        );
        assert.equal(result.engagement.workflowState, "AtHospital");
        assert.equal(result.nextRole, null);
        assert.deepEqual(result.nextRecipients, []);
        assert.equal(
          result.receptionRecipients.some(
            (recipient) => recipient.id === receptionist.staffUserId,
          ),
          true,
        );
      },
    );

    await verify(
      "Hospital exemption allows induction despite an old medical in the same cycle",
      async () => {
        const id = await engagement();
        await exempt(id, ["Hospital"]);
        const [cycle] = await client
          .select()
          .from(workflowCycles)
          .where(eq(workflowCycles.engagementId, id));
        await client.insert(hospitalClearances).values({
          workflowCycleId: cycle.id,
          clearanceStatus: "Fit",
          doctorComments: "Old",
          clearanceDate: new Date("2000-01-01"),
        });
        assert.deepEqual(await checkHospitalClearanceAge(id, client), {
          applicable: false,
        });
        const result = await recordInductionCompletion(
          id,
          {
            generalSiteInduction: true,
            otherInductions: false,
            trainerComments: "Completed",
          },
          trainer.staffUserId,
          client,
        );
        assert.equal(result.engagement.workflowState, "AtSecurity");
      },
    );

    await verify(
      "a later cycle inherits neither exemptions nor an exemption from a different engagement",
      async () => {
        const id = await engagement();
        await exempt(id, ["Hospital"]);
        await client
          .update(workflowCycles)
          .set({ archivedAt: new Date() })
          .where(eq(workflowCycles.engagementId, id));
        const [cycle] = await client
          .insert(workflowCycles)
          .values({ engagementId: id, cycleNumber: 2 })
          .returning();
        await client.insert(hospitalClearances).values({
          workflowCycleId: cycle.id,
          clearanceStatus: "Fit",
          doctorComments: "Expired",
          clearanceDate: new Date("2000-01-01"),
        });
        assert.deepEqual(await getActiveWorkflowExemptions(id, client), []);
        const age = await checkHospitalClearanceAge(id, client);
        assert.equal(age.applicable && age.expired, true);
        await assert.rejects(
          () =>
            recordInductionCompletion(
              id,
              {
                generalSiteInduction: true,
                otherInductions: false,
                trainerComments: "Completed",
              },
              trainer.staffUserId,
              client,
            ),
          /expired/,
        );
        assert.equal(
          (
            await client
              .select()
              .from(inductionRecords)
              .where(eq(inductionRecords.workflowCycleId, cycle.id))
          ).length,
          0,
        );
        const unrelated = await engagement();
        assert.deepEqual(
          await getActiveWorkflowExemptions(unrelated, client),
          [],
        );
      },
    );

    await verify(
      "database rejects cross-engagement links and duplicate stage exemptions",
      async () => {
        const id = await engagement();
        await exempt(id, ["Hospital"]);
        const [saved] = await getActiveWorkflowExemptions(id, client);
        await assert.rejects(() =>
          client.transaction((tx) =>
            tx
              .insert(workflowExemptions)
              .values({ ...saved, id: randomUUID() }),
          ),
        );
        const unrelated = await engagement();
        const [other] = await client
          .select()
          .from(workflowCycles)
          .where(eq(workflowCycles.engagementId, unrelated));
        await assert.rejects(() =>
          client.transaction((tx) =>
            tx.insert(workflowExemptions).values({
              ...saved,
              id: randomUUID(),
              workflowCycleId: other.id,
            }),
          ),
        );
        const [total] = await client
          .select({ value: count() })
          .from(workflowExemptions)
          .where(
            and(
              eq(workflowExemptions.engagementId, id),
              eq(workflowExemptions.stage, "Hospital"),
            ),
          );
        assert.equal(total.value, 1);
      },
    );

    await verify(
      "report queries include exemptions and awaiting WorkMine induction with approval details",
      async () => {
        const beforeCsv = await exportTrainingCsv(client);
        const previousExempted = (beforeCsv.match(/"Exempted"/g) ?? []).length;
        const previousAwaiting = (beforeCsv.match(/"Awaiting"/g) ?? []).length;
        const trainingExempt = await engagement();
        await legacyTrainingExemption(trainingExempt);
        const direct = await engagement();
        await exempt(direct, ["Hospital"]);
        const awaiting = await engagement("WorkMine");
        await applyStakeholderApproval(
          awaiting,
          stakeholder,
          { signature },
          stakeholder.staffUserId,
          client,
        );
        await recordHospitalClearance(
          awaiting,
          { clearanceStatus: "Fit", doctorComments: "" },
          hospital.staffUserId,
          client,
        );

        const detail = await getWorkflowExemptionDetails(direct, client);
        assert.equal(detail.length, 1);
        assert.equal(
          detail.every(
            (entry) =>
              entry.approverName === stakeholder.displayName &&
              entry.approverRole === "CSO" &&
              entry.archivedAt === null,
          ),
          true,
        );

        const trainingCsv = await exportTrainingCsv(client);
        assert.match(trainingCsv, /"Exemption Reason \/ Comment"/);
        assert.match(trainingCsv, /Training School: Verified exception/);
        assert.match(trainingCsv, /Test CSO \(CSO\)/);
        // The legacy record's Training exemption reads Exempted; the
        // by-passed one is now awaiting induction, as is the WorkMine one.
        assert.equal(
          (trainingCsv.match(/"Exempted"/g) ?? []).length,
          previousExempted + 1,
        );
        assert.equal(
          (trainingCsv.match(/"Awaiting"/g) ?? []).length,
          previousAwaiting + 2,
        );

        await recordHospitalClearance(
          trainingExempt,
          { clearanceStatus: "Fit", doctorComments: "" },
          hospital.staffUserId,
          client,
        );
        const securityCsv = await exportSecurityCsv(client);
        assert.match(securityCsv, /"Exemption Approved By"/);
        assert.match(securityCsv, /Training School: Verified exception/);
      },
    );

    await verify(
      "a Medical By-pass notifies every active stage but Hospital, and rolls back if notification persistence fails",
      async () => {
        const secondReception = await actor("Receptionist");
        const inactiveReception = await actor("Receptionist");
        await client
          .update(staffUsers)
          .set({ deactivatedAt: new Date() })
          .where(eq(staffUsers.id, inactiveReception.staffUserId));
        await actor("DepartmentHead");
        const id = await engagement();
        const result = await applyStakeholderExemption(
          id,
          stakeholder,
          {
            signature,
            exemption: {
              stages: ["Hospital"],
              reason: "Verified exception",
            },
          },
          stakeholder.staffUserId,
          client,
        );
        // Reception, Training and Security; never Hospital, never the
        // deactivated Receptionist. The fixture Department Head heads no
        // department of this record, so is not its HOD.
        const expected = [
          receptionist.staffUserId,
          secondReception.staffUserId,
          trainer.staffUserId,
          security.staffUserId,
        ].sort();
        assert.deepEqual(
          result.recipients.map((recipient) => recipient.id).sort(),
          expected,
        );
        assert.equal(
          result.recipients.some(
            (recipient) => recipient.id === hospital.staffUserId,
          ),
          false,
        );
        assert.equal(result.exemptionMessage?.nextState, "AtTraining");
        assert.equal(result.exemptionMessage?.reason, "Verified exception");
        assert.equal(result.exemptionMessage?.personName, "Test Visitor");
        const notices = await client
          .select()
          .from(notifications)
          .where(eq(notifications.engagementId, id));
        assert.deepEqual(
          notices.map((notice) => notice.recipientStaffUserId).sort(),
          expected,
        );
        assert.equal(
          notices.every(
            (notice) =>
              notice.message.includes("Test Visitor") &&
              notice.message.includes("approved with an exemption"),
          ),
          true,
        );
        const [stored] = await client.execute<{ message: string }>(
          sql`SELECT message FROM notifications WHERE engagement_id = ${id} LIMIT 1`,
        );
        assert.match(stored.message, /^enc1\./);
        await assert.rejects(() => exempt(id, ["Hospital"]));
        assert.equal(
          (
            await client
              .select()
              .from(notifications)
              .where(eq(notifications.engagementId, id))
          ).length,
          4,
        );

        const failed = await engagement();
        await client.execute(
          sql`ALTER TABLE notifications ADD CONSTRAINT test_reject_notice CHECK (message IS NULL) NOT VALID`,
        );
        try {
          await assert.rejects(() => exempt(failed, ["Hospital"]));
        } finally {
          await client.execute(
            sql`ALTER TABLE notifications DROP CONSTRAINT test_reject_notice`,
          );
        }
        assert.equal(
          (await getEngagementById(failed, client))?.workflowState,
          "AtReception",
        );
        assert.deepEqual(await getActiveWorkflowExemptions(failed, client), []);
        assert.equal(
          (
            await client
              .select()
              .from(stakeholderApprovals)
              .where(eq(stakeholderApprovals.engagementId, failed))
          ).length,
          0,
        );
      },
    );

    // Requests overlap, but a single temporary-table session needs serialized savepoints.
    // Production row locks and conditional updates arbitrate separate sessions.
    await verify(
      "concurrent exemption requests produce exactly one approval and audit",
      async () => {
        const id = await engagement();
        const fixture = serializedFixtureTransactions(client);
        const results = await Promise.allSettled([
          exempt(id, ["Hospital"], stakeholder, fixture),
          exempt(id, ["Hospital"], secondStakeholder, fixture),
        ]);
        assert.equal(
          results.filter((result) => result.status === "fulfilled").length,
          1,
        );
        assert.equal(
          (
            await client
              .select()
              .from(stakeholderApprovals)
              .where(eq(stakeholderApprovals.engagementId, id))
          ).length,
          1,
        );
        assert.equal((await getActiveWorkflowExemptions(id, client)).length, 1);
        assert.equal(
          (
            await client
              .select()
              .from(workflowTransitions)
              .where(eq(workflowTransitions.engagementId, id))
          ).length,
          1,
        );
      },
    );

    await verify(
      "concurrent approval and rejection cannot both commit",
      async () => {
        const id = await engagement();
        const fixture = serializedFixtureTransactions(client);
        const results = await Promise.allSettled([
          exempt(id, ["Hospital"], stakeholder, fixture),
          rejectStakeholderApproval(id, secondStakeholder, "Reject", fixture),
        ]);
        assert.equal(
          results.filter((result) => result.status === "fulfilled").length,
          1,
        );
        const approvals = await client
          .select()
          .from(stakeholderApprovals)
          .where(eq(stakeholderApprovals.engagementId, id));
        const rejections = await client
          .select()
          .from(stakeholderRejections)
          .where(eq(stakeholderRejections.engagementId, id));
        assert.equal(approvals.length + rejections.length, 1);
        assert.equal(
          (await getActiveWorkflowExemptions(id, client)).length,
          approvals.length,
        );
      },
    );

    throw rollback;
  });
} catch (error) {
  if (error !== rollback) throw error;
  console.log(
    `${passed} integration scenarios passed; all temporary fixtures rolled back.`,
  );
} finally {
  await connection.end();
}
