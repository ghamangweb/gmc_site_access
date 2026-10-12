import { CheckCircle2Icon, ClipboardCheckIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { QueuePagination } from "@/components/layout/queue-pagination";
import { QueueSearch } from "@/components/layout/queue-search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requirePinConfirmed } from "@/lib/auth/guards";
import { toPageRequest } from "@/lib/domain/pagination";
import {
  ACCESS_PURPOSE_LABELS,
  type AccessPurpose,
  WORKFLOW_STATE_LABELS,
  type WorkflowState,
} from "@/lib/domain/types";
import {
  listEngagementsAwaitingApproval,
  listRecentStakeholderApprovals,
} from "@/lib/services/workflow-service";

const STAKEHOLDER_ROLES = ["HCM", "GMM", "DMD"] as const;

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
  // Two queues on one page, so each pages and searches on its own params —
  // moving through one must not reset the other.
  searchParams: Promise<{
    q?: string;
    page?: string;
    aq?: string;
    apage?: string;
  }>;
}) {
  const session = await requirePinConfirmed();

  const isStakeholder = STAKEHOLDER_ROLES.some((role) =>
    session.workflowRoles.includes(role),
  );

  // A delegate holds no stakeholder role — the grant is per engagement, so
  // they reach this page only while one is outstanding for them.
  const { q, page, aq, apage } = await searchParams;
  const pendingRequest = toPageRequest(q, page);
  const approvedRequest = toPageRequest(aq, apage);

  const [pending, approved] = await Promise.all([
    isStakeholder
      ? listEngagementsAwaitingApproval(undefined, pendingRequest)
      : listEngagementsAwaitingApproval(session.staffUserId, pendingRequest),
    listRecentStakeholderApprovals(approvedRequest),
  ]);

  const rows = pending.rows;

  if (!isStakeholder && pending.total === 0) {
    redirect("/dashboard");
  }

  const stakeholderRole = STAKEHOLDER_ROLES.find((role) =>
    session.workflowRoles.includes(role),
  );

  const firstName = session.displayName?.split(" ")[0] ?? "there";

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName}!`}
        subtitle={
          stakeholderRole
            ? "Engagements waiting for stakeholder sign-off. Any one of HCM, GMM or DMD is enough."
            : "Engagements delegated to you for sign-off."
        }
      />
      <section className="mb-10 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-foreground text-lg">
              Awaiting Approval
            </h2>
            {pending.total > 0 && (
              <Badge className="bg-status-warning-bg text-status-warning-fg">
                {pending.total}
              </Badge>
            )}
          </div>
          <QueueSearch searchParam="q" pageParam="page" />
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {rows.length === 0 ? (
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
                  <TableHead>Passport No.</TableHead>
                  <TableHead>Nature of Visit</TableHead>
                  <TableHead>Arrival</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ engagement, person }) => {
                  // SAFETY: access_purpose is a text column written only from
                  // the AccessPurpose union; the ?? shows a stray legacy value
                  // raw rather than rendering undefined.
                  const purposeLabel =
                    ACCESS_PURPOSE_LABELS[
                      engagement.accessPurpose as AccessPurpose
                    ] ?? engagement.accessPurpose;

                  return (
                    <TableRow key={engagement.id} className="hover:bg-muted/50">
                      <TableCell>{person.fullName}</TableCell>
                      <TableCell>{person.passportNo}</TableCell>
                      <TableCell>{purposeLabel}</TableCell>
                      <TableCell>{engagement.arrivalDate}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {engagement.approvalRequestedAt
                          ? daysWaiting(engagement.approvalRequestedAt)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm">
                          <Link href={`/dashboard/approvals/${engagement.id}`}>
                            Review &amp; Approve
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-foreground text-lg">Approved</h2>
            {approved.total > 0 && (
              <Badge className="bg-status-success-bg text-status-success-fg">
                {approved.total}
              </Badge>
            )}
          </div>
          <QueueSearch
            searchParam="aq"
            pageParam="apage"
            placeholder="Search approved"
          />
        </div>
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
                  <TableHead>Passport No.</TableHead>
                  <TableHead>Approved By</TableHead>
                  <TableHead>Approved On</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approved.rows.map(({ approval, engagement, person }) => (
                  <TableRow key={approval.id} className="hover:bg-muted/50">
                    <TableCell>{person.fullName}</TableCell>
                    <TableCell>{person.passportNo}</TableCell>
                    <TableCell>
                      {approval.approverName}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {approval.approverRole}
                        {approval.isDelegated ? " (delegated)" : ""}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {approval.approvedAt.toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
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
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/dashboard/approvals/${engagement.id}`}>
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <QueuePagination
            page={approvedRequest.page}
            pageSize={approved.pageSize}
            total={approved.total}
            pageParam="apage"
            searchParams={{ q, page, aq }}
          />
        </div>
      </section>
    </div>
  );
}
