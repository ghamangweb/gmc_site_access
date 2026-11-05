import { CheckCircle2Icon, ClipboardCheckIcon } from "lucide-react";
import { redirect } from "next/navigation";

import { ApprovalRowActions } from "@/app/dashboard/(workflow)/approvals/approval-row-actions";

import { ApprovalsExportButton } from "@/components/layout/approvals-export-button";
import { PageHeader } from "@/components/layout/page-header";
import { QueuePagination } from "@/components/layout/queue-pagination";
import { QueueSearch } from "@/components/layout/queue-search";
import { QueueViewTabs } from "@/components/layout/queue-view-tabs";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NameWithAttention } from "@/components/workflow/attention-dot";
import { requirePinConfirmed } from "@/lib/auth/guards";
import { success } from "@/lib/domain/attention";
import { toPageRequest } from "@/lib/domain/pagination";
import {
  isStayExtendable,
  stayEndAttention,
  stayExtensionRole,
} from "@/lib/domain/stay-extensions";
import {
  ACCESS_PURPOSE_LABELS,
  type AccessPurpose,
  type AccessState,
  STAKEHOLDER_ROLES,
  WORKFLOW_STATE_LABELS,
  type WorkflowState,
} from "@/lib/domain/types";
import {
  canGrantWorkflowExemption,
  requiredWorkflowStages,
} from "@/lib/domain/workflow-exemptions";
import {
  countEngagementsAwaitingApproval,
  countStakeholderApprovalsBy,
  listEngagementsAwaitingApproval,
  listRecentStakeholderApprovals,
} from "@/lib/services/workflow-service";
import { formatQueueDate } from "@/lib/utils";

// Past this, a record waiting for sign-off is flagged on the queue.
const LONG_WAIT_DAYS = 3;

function wholeDaysSince(value: Date): number {
  return Math.floor((Date.now() - value.getTime()) / (1000 * 60 * 60 * 24));
}

function daysWaiting(requestedAt: Date): string {
  const days = Math.floor(
    (Date.now() - requestedAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (days === 0) {
    return "Today";
  }

  return days === 1 ? "1 day ago" : `${days} days ago`;
}

export default async function ApprovalsQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string; page?: string }>;
}) {
  const session = await requirePinConfirmed();

  const isStakeholder = STAKEHOLDER_ROLES.some((role) =>
    session.workflowRoles.includes(role),
  );

  const { view, q, page } = await searchParams;

  const activeView = view === "approved" ? "approved" : "awaiting";
  const request = toPageRequest(q, page);

  // A delegate holds no stakeholder role — the grant is per engagement, so
  // they only see what was delegated to them.
  const delegatedTo = isStakeholder ? undefined : session.staffUserId;

  const [pendingCount, signedCount, pending, approved] = await Promise.all([
    countEngagementsAwaitingApproval(delegatedTo),
    // A delegate who has already signed still belongs here — that sign-off is
    // the only record of their part in the workflow.
    delegatedTo ? countStakeholderApprovalsBy(delegatedTo) : Promise.resolve(0),
    activeView === "awaiting"
      ? listEngagementsAwaitingApproval(delegatedTo, request)
      : undefined,
    // Stakeholders see every sign-off (any one approval is enough, so a
    // colleague's counts); a delegate sees only their own.
    activeView === "approved"
      ? listRecentStakeholderApprovals(request, delegatedTo)
      : undefined,
  ]);

  // The grant is per engagement, not a standing role: a delegate with nothing
  // outstanding and nothing signed has no business on this page.
  if (!isStakeholder && pendingCount === 0 && signedCount === 0) {
    redirect("/dashboard");
  }

  const stakeholderRole = STAKEHOLDER_ROLES.find((role) =>
    session.workflowRoles.includes(role),
  );

  // Per viewer; each row then adds its own conditions. Delegates get
  // neither: their grant is one engagement's approval and nothing else.
  const mayBypass = canGrantWorkflowExemption(session);
  const mayExtend = stayExtensionRole(session) !== undefined;

  const firstName = session.displayName?.split(" ")[0] ?? "there";

  const views = [
    {
      label: "Awaiting Approval",
      value: "awaiting",
      href: "/dashboard/approvals",
    },
    {
      label: "Approved",
      value: "approved",
      href: "/dashboard/approvals?view=approved",
    },
  ];

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName}!`}
        actions={
          session.systemRole !== "Guest" ? <ApprovalsExportButton /> : undefined
        }
        subtitle={
          stakeholderRole
            ? "Engagements waiting for stakeholder sign-off. Any one of CSO, HCM, GMM, EM or MM is enough."
            : "Engagements delegated to you for sign-off."
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <QueueViewTabs views={views} activeView={activeView} />
        <QueueSearch
          searchParam="q"
          pageParam="page"
          placeholder={
            activeView === "awaiting"
              ? "Search the queue"
              : "Search approved records"
          }
        />
      </div>

      {activeView === "awaiting" && pending && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {pending.rows.length === 0 ? (
            <EmptyState
              icon={ClipboardCheckIcon}
              title="Nothing awaiting approval"
              description="When Reception sends an engagement for sign-off, it shows up here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Nature of Visit</TableHead>
                  <TableHead>Arrival</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.rows.map(({ engagement, person }) => {
                  // SAFETY: access_purpose is a text column written only from
                  // the AccessPurpose union; the ?? shows a stray legacy value
                  // raw rather than rendering undefined.
                  const purpose = engagement.accessPurpose as AccessPurpose;
                  const purposeLabel =
                    ACCESS_PURPOSE_LABELS[purpose] ?? engagement.accessPurpose;

                  return (
                    <TableRow key={engagement.id} className="hover:bg-muted/50">
                      <TableCell>
                        <NameWithAttention
                          attention={
                            engagement.approvalRequestedAt &&
                            wholeDaysSince(engagement.approvalRequestedAt) >
                              LONG_WAIT_DAYS
                              ? success(
                                  `Waiting ${wholeDaysSince(engagement.approvalRequestedAt)} days for sign-off`,
                                )
                              : undefined
                          }
                        >
                          {person.fullName}
                        </NameWithAttention>
                      </TableCell>
                      <TableCell>{purposeLabel}</TableCell>
                      <TableCell>{engagement.arrivalDate}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {engagement.approvalRequestedAt
                          ? daysWaiting(engagement.approvalRequestedAt)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <ApprovalRowActions
                          view="awaiting"
                          engagementId={engagement.id}
                          personName={person.fullName}
                          accessPurpose={purpose}
                          departureDate={engagement.departureDate}
                          // Same rule as the record page's "Approve with
                          // Exemption": a requested, unrejected record with a
                          // stage that can be exempted.
                          canBypass={
                            mayBypass &&
                            engagement.approvalRequestedAt !== null &&
                            engagement.approvalRejectedAt === null &&
                            requiredWorkflowStages(purpose).length > 0
                          }
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          <QueuePagination
            page={pending.page}
            pageSize={pending.pageSize}
            total={pending.total}
            pageParam="page"
            searchParams={{ q }}
          />
        </div>
      )}

      {activeView === "approved" && approved && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {approved.rows.length === 0 ? (
            <EmptyState
              icon={CheckCircle2Icon}
              title="Nothing approved yet"
              description="Engagements you or another stakeholder sign off appear here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Approved By</TableHead>
                  <TableHead>Approved On</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Departure</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approved.rows.map(({ approval, engagement, person }) => (
                  <TableRow key={approval.id} className="hover:bg-muted/50">
                    <TableCell>
                      <NameWithAttention
                        attention={
                          // Only where Extend Stay applies, so the dot always
                          // points at something the stakeholder can do.
                          isStayExtendable({
                            workflowState:
                              engagement.workflowState as WorkflowState,
                            accessState: engagement.accessState as AccessState,
                          })
                            ? stayEndAttention(engagement.departureDate)
                            : undefined
                        }
                      >
                        {person.fullName}
                      </NameWithAttention>
                    </TableCell>
                    <TableCell>
                      {approval.approverName}
                      <span className="ml-2 text-muted-foreground text-xs">
                        {approval.approverRole}
                        {approval.isDelegated ? " (delegated)" : ""}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatQueueDate(approval.approvedAt)}
                    </TableCell>
                    <TableCell>
                      {
                        // SAFETY: workflow_state is a text column the state
                        // machine alone writes, always a WorkflowState member.
                        WORKFLOW_STATE_LABELS[
                          engagement.workflowState as WorkflowState
                        ]
                      }
                    </TableCell>
                    <TableCell>{engagement.departureDate}</TableCell>
                    <TableCell className="text-right">
                      <ApprovalRowActions
                        view="approved"
                        engagementId={engagement.id}
                        personName={person.fullName}
                        // SAFETY: access_purpose, workflow_state and
                        // access_state are text columns written only from
                        // their unions.
                        accessPurpose={
                          engagement.accessPurpose as AccessPurpose
                        }
                        departureDate={engagement.departureDate}
                        canExtend={
                          mayExtend &&
                          isStayExtendable({
                            workflowState:
                              engagement.workflowState as WorkflowState,
                            accessState: engagement.accessState as AccessState,
                          })
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <QueuePagination
            page={approved.page}
            pageSize={approved.pageSize}
            total={approved.total}
            pageParam="page"
            searchParams={{ q, view }}
          />
        </div>
      )}
    </div>
  );
}
