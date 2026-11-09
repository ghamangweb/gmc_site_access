import "server-only";

import { type SQL, sql } from "drizzle-orm";

import { type DbClient, db } from "@/lib/db/client";
import type { AiReportWorkflow } from "@/lib/domain/ai-report";
import type { ReportActivity } from "@/lib/domain/report-activity";
import type { ReportCreationWindow } from "@/lib/domain/report-creation-window";
import type { WorkflowState } from "@/lib/domain/types";

const STAGES = {
  Reception: "AtReception",
  Hospital: "AtHospital",
  Training: "AtTraining",
  Security: "AtSecurity",
} satisfies Record<Exclude<AiReportWorkflow, "Approvals">, WorkflowState>;

type ActivityRow = {
  completed: number;
  median_hours: number | string | null;
  rejected: number | null;
};

type QueueRow = {
  waiting: number;
  over_3_days: number;
  over_7_days: number;
};

function hours(value: number | string | null): number | null {
  if (value === null) return null;

  return Math.round(Number(value) * 10) / 10;
}

// Activity is capped at generation time, like the creation-cohort window.
function periodEnd(window: ReportCreationWindow): Date {
  return window.endExclusive < window.generatedAt
    ? window.endExclusive
    : window.generatedAt;
}

function queueFrom(entered: SQL, from: SQL, generatedAt: Date): SQL {
  const at = generatedAt.toISOString();

  return sql`
    select
      count(*)::int as waiting,
      (count(*) filter (where ${entered} < ${at}::timestamptz - interval '3 days'))::int as over_3_days,
      (count(*) filter (where ${entered} < ${at}::timestamptz - interval '7 days'))::int as over_7_days
    ${from}`;
}

async function stageActivity(
  stage: WorkflowState,
  window: ReportCreationWindow,
  countRejections: boolean,
  client: DbClient,
): Promise<ReportActivity> {
  const start = window.start.toISOString();
  const end = periodEnd(window).toISOString();

  // Entry into the stage is the latest transition into it before the exit;
  // engagements created straight into Reception fall back to creation time.
  const [activity] = await client.execute<ActivityRow>(sql`
    with exits as (
      select
        t.performed_at as exited_at,
        coalesce(
          (
            select max(entry.performed_at)
            from workflow_transitions entry
            where entry.engagement_id = t.engagement_id
              and entry.to_state = ${stage}
              and entry.from_state <> ${stage}
              and entry.performed_at <= t.performed_at
          ),
          e.created_at
        ) as entered_at
      from workflow_transitions t
      join engagements e on e.id = t.engagement_id
      where t.from_state = ${stage}
        and t.to_state not in (${stage}, 'Cancelled')
        and t.performed_at >= ${start}::timestamptz
        and t.performed_at < ${end}::timestamptz
    )
    select
      (select count(*)::int from exits) as completed,
      (
        select percentile_cont(0.5) within group (
          order by extract(epoch from exited_at - entered_at) / 3600
        )
        from exits
      ) as median_hours,
      ${
        countRejections
          ? sql`(
              select count(*)::int from stakeholder_rejections r
              where r.rejected_at >= ${start}::timestamptz
                and r.rejected_at < ${end}::timestamptz
            )`
          : sql`null::int`
      } as rejected
  `);

  const entered = sql`coalesce(
    (
      select max(entry.performed_at)
      from workflow_transitions entry
      where entry.engagement_id = e.id
        and entry.to_state = ${stage}
        and entry.from_state <> ${stage}
    ),
    e.created_at
  )`;

  const [queue] = await client.execute<QueueRow>(
    queueFrom(
      entered,
      sql`from engagements e where e.workflow_state = ${stage}`,
      window.generatedAt,
    ),
  );

  return {
    completed: activity.completed,
    medianHours: hours(activity.median_hours),
    rejected: activity.rejected,
    waiting: queue.waiting,
    waitingOver3Days: queue.over_3_days,
    waitingOver7Days: queue.over_7_days,
  };
}

// Delegates see only their own decisions and assigned requests, matching the export scope.
async function approvalActivity(
  window: ReportCreationWindow,
  delegatedApproverId: string | undefined,
  client: DbClient,
): Promise<ReportActivity> {
  const start = window.start.toISOString();
  const end = periodEnd(window).toISOString();

  const approver = (column: SQL): SQL =>
    delegatedApproverId ? sql`and ${column} = ${delegatedApproverId}` : sql``;

  const [activity] = await client.execute<ActivityRow>(sql`
    select
      (
        select count(*)::int from stakeholder_approvals a
        where a.approved_at >= ${start}::timestamptz
          and a.approved_at < ${end}::timestamptz
          ${approver(sql`a.approver_staff_user_id`)}
      ) as completed,
      (
        select percentile_cont(0.5) within group (
          order by extract(epoch from a.approved_at - e.approval_requested_at) / 3600
        )
        from stakeholder_approvals a
        join engagements e on e.id = a.engagement_id
        where a.approved_at >= ${start}::timestamptz
          and a.approved_at < ${end}::timestamptz
          and e.approval_requested_at is not null
          and e.approval_requested_at <= a.approved_at
          ${approver(sql`a.approver_staff_user_id`)}
      ) as median_hours,
      (
        select count(*)::int from stakeholder_rejections r
        where r.rejected_at >= ${start}::timestamptz
          and r.rejected_at < ${end}::timestamptz
          ${approver(sql`r.approver_staff_user_id`)}
      ) as rejected
  `);

  const [queue] = await client.execute<QueueRow>(
    queueFrom(
      sql`e.approval_requested_at`,
      sql`from engagements e
        where e.workflow_state = 'AtReception'
          and e.approval_requested_at is not null
          and e.approval_rejected_at is null
          and not exists (
            select 1 from stakeholder_approvals a where a.engagement_id = e.id
          )
          ${approver(sql`e.delegated_approver_id`)}`,
      window.generatedAt,
    ),
  );

  return {
    completed: activity.completed,
    medianHours: hours(activity.median_hours),
    rejected: activity.rejected,
    waiting: queue.waiting,
    waitingOver3Days: queue.over_3_days,
    waitingOver7Days: queue.over_7_days,
  };
}

// Callers must authorize the workflow and derive delegate scope from the authenticated session.
export function collectReportActivity(
  workflow: AiReportWorkflow,
  window: ReportCreationWindow,
  delegatedApproverId?: string,
  client: DbClient = db,
): Promise<ReportActivity> {
  if (workflow === "Approvals") {
    return approvalActivity(window, delegatedApproverId, client);
  }

  return stageActivity(
    STAGES[workflow],
    window,
    workflow === "Reception",
    client,
  );
}
