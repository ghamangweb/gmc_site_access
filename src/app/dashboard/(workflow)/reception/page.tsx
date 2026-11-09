import { CircleXIcon, InboxIcon, UsersRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ReceptionRow } from "@/app/dashboard/(workflow)/reception/reception-row";
import { RegistrationRequestRow } from "@/app/dashboard/(workflow)/reception/registration-request-row";
import { RejectedRowActions } from "@/app/dashboard/(workflow)/reception/rejected-row-actions";
import {
  ENGAGEMENT_COLUMNS,
  REJECTED_COLUMNS,
  SUBMISSION_COLUMNS,
} from "@/app/dashboard/(workflow)/reception/skeleton-columns";
import { PageHeader } from "@/components/layout/page-header";
import { TableSkeleton } from "@/components/layout/page-skeletons";
import { QueueFilters } from "@/components/layout/queue-filter";
import { QueuePagination } from "@/components/layout/queue-pagination";
import { QueueSearch } from "@/components/layout/queue-search";
import {
  QueuePending,
  QueueTransitionProvider,
} from "@/components/layout/queue-transition";
import { QueueViewTabs } from "@/components/layout/queue-view-tabs";
import { ReceptionExportButton } from "@/components/layout/reception-export-button";
import { WorkflowReportButton } from "@/components/layout/workflow-report-button";
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
import { danger, pickAttention } from "@/lib/domain/attention";
import { toPageRequest } from "@/lib/domain/pagination";
import {
  ACCESS_PURPOSES,
  accessPurposeOptions,
  parseFilter,
  WORKFLOW_STATES,
  workflowStateOptions,
} from "@/lib/domain/queue-filters";
import {
  ACCESS_PURPOSE_LABELS,
  type AccessPurpose,
  type WorkflowState,
} from "@/lib/domain/types";
import { listRegistrationRequests } from "@/lib/services/registration-service";
import {
  getCurrentCardExpiries,
  getLatestClearanceStatuses,
  listEngagementsWithPerson,
  listRejectedEngagements,
} from "@/lib/services/workflow-service";
import { formatQueueDate } from "@/lib/utils";

export default async function ReceptionQueuePage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    type?: string;
    q?: string;
    page?: string;
    stage?: string;
    purpose?: string;
  }>;
}) {
  const session = await requirePinConfirmed();

  // Stakeholders used to land here too. They have their own queue now, and
  // nothing on this page is their work — /dashboard sends them to
  // /dashboard/approvals.
  if (!session.workflowRoles.includes("Receptionist")) {
    redirect("/dashboard");
  }

  const canManage =
    session.systemRole !== "Guest" &&
    session.workflowRoles.includes("Receptionist");

  const { view, type, q, page, stage, purpose } = await searchParams;

  // One queue at a time. Stacking submissions above engagements meant two
  // tables, two paginators and two searches competing on one screen; this is
  // the same information as two views of one page, so only the active one is
  // queried and rendered. Submissions is the default: it is where the
  // workflow starts.
  const activeView =
    view === "engagements" || view === "rejected" ? view : "submissions";

  // Anything other than a known registration type falls back to "All" rather
  // than showing an empty table for a typo'd URL.
  const activeFilter =
    type === "Local" || type === "Foreign" ? type : undefined;

  const request = toPageRequest(q, page);
  const accessPurpose = parseFilter(purpose, ACCESS_PURPOSES);
  const engagementStage = parseFilter(stage, WORKFLOW_STATES);

  const submissions =
    activeView === "submissions"
      ? await listRegistrationRequests({
          ...request,
          registrationType: activeFilter,
          accessPurpose,
        })
      : undefined;

  const engagements =
    activeView === "engagements"
      ? await listEngagementsWithPerson({
          ...request,
          workflowState: engagementStage,
          accessPurpose,
        })
      : undefined;

  // For the Engagements tab's attention dots: an Unfit is Reception's to
  // follow up, whether it came from a clearance or a review.
  const engagementIds =
    engagements?.rows.map(({ engagement }) => engagement.id) ?? [];
  const [clearanceStatuses, cardExpiries] = await Promise.all([
    getLatestClearanceStatuses(engagementIds),
    // Completed records show their card's state instead of "Completed".
    getCurrentCardExpiries(engagementIds),
  ]);

  // Rejected by a stakeholder and waiting on Reception: request approval
  // again, or cancel. Leaves this view as soon as either happens.
  const rejected =
    activeView === "rejected"
      ? await listRejectedEngagements(request)
      : undefined;

  const firstName = session.displayName?.split(" ")[0] ?? "there";

  const views = [
    {
      label: "Submitted Registrations",
      value: "submissions",
      href: "/dashboard/reception",
    },
    {
      label: "Engagements",
      value: "engagements",
      href: "/dashboard/reception?view=engagements",
    },
    {
      label: "Rejected",
      value: "rejected",
      href: "/dashboard/reception?view=rejected",
    },
  ];

  return (
    <QueueTransitionProvider>
      <div>
        <PageHeader
          title={`Welcome back, ${firstName}!`}
          subtitle="Here, you'll find existing engagements and create new ones."
          actions={
            canManage ? (
              <Button asChild>
                <Link href="/dashboard/reception/new">New Registration</Link>
              </Button>
            ) : undefined
          }
        />

        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <QueueViewTabs views={views} activeView={activeView} />
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {activeView !== "rejected" && (
              <QueueFilters
                pageParam="page"
                fields={[
                  ...(activeView === "submissions"
                    ? [
                        {
                          param: "type",
                          label: "Registration Type",
                          options: [
                            { value: "Local", label: "Local" },
                            { value: "Foreign", label: "Foreign" },
                          ],
                        },
                      ]
                    : []),
                  ...(activeView === "engagements"
                    ? [
                        {
                          param: "stage",
                          label: "Stage",
                          options: workflowStateOptions(),
                        },
                      ]
                    : []),
                  {
                    param: "purpose",
                    label: "Nature of Visit",
                    options: accessPurposeOptions(),
                  },
                ]}
              />
            )}
            <QueueSearch searchParam="q" pageParam="page" />
            {/* Last in the toolbar, after filter and search. */}
            {canManage && (
              <>
                <WorkflowReportButton workflow="Reception" />
                <ReceptionExportButton />
              </>
            )}
          </div>
        </div>

        {activeView === "submissions" && submissions && (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <QueuePending
              fallback={
                <TableSkeleton columns={SUBMISSION_COLUMNS} pagination />
              }
            >
              {submissions.rows.length === 0 ? (
                <EmptyState
                  icon={InboxIcon}
                  title={
                    activeFilter
                      ? `No ${activeFilter} submissions`
                      : "No submissions yet"
                  }
                  description={
                    activeFilter
                      ? "Switch the filter to All to see every submission."
                      : "Registrations submitted from invitation links will show up here."
                  }
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Nature of Visit</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.rows.map((request) => (
                      <RegistrationRequestRow
                        key={request.id}
                        request={request}
                        canManage={canManage}
                      />
                    ))}
                  </TableBody>
                </Table>
              )}
              <QueuePagination
                page={submissions.page}
                pageSize={submissions.pageSize}
                total={submissions.total}
                pageParam="page"
                searchParams={{ q, type, purpose }}
              />
            </QueuePending>
          </div>
        )}

        {activeView === "engagements" && engagements && (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <QueuePending
              fallback={
                <TableSkeleton columns={ENGAGEMENT_COLUMNS} pagination />
              }
            >
              {engagements.rows.length === 0 ? (
                <EmptyState
                  icon={UsersRound}
                  title="No engagements yet"
                  description="Registered visitors and expatriates will show up here."
                  action={
                    canManage ? (
                      <Button asChild>
                        <Link href="/dashboard/reception/new">
                          New Registration
                        </Link>
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Name</TableHead>
                      <TableHead>Nature of Visit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {engagements.rows.map(({ engagement, person }) => {
                      // SAFETY: workflow_state is a text column only the state
                      // machine writes, always a WorkflowState member.
                      const workflowState =
                        engagement.workflowState as WorkflowState;

                      return (
                        <ReceptionRow
                          key={engagement.id}
                          engagementId={engagement.id}
                          personName={person.fullName}
                          accessPurpose={engagement.accessPurpose}
                          workflowState={workflowState}
                          accessState={engagement.accessState}
                          cardExpiry={cardExpiries.get(engagement.id)}
                          approvalRejected={
                            engagement.workflowState === "AtReception" &&
                            engagement.approvalRejectedAt !== null
                          }
                          // A rejection clears `approvalRequestedAt`, so this
                          // covers both never-asked and rejected records.
                          canRequestApproval={
                            engagement.workflowState === "AtReception" &&
                            engagement.approvalRequestedAt === null
                          }
                          canRequestDelegated={
                            engagement.workflowState === "AtReception"
                          }
                          attention={pickAttention(
                            engagement.accessState === "TerminationRequested" &&
                              danger("Revocation requested"),
                            clearanceStatuses.get(engagement.id) === "Unfit" &&
                              danger("Marked Unfit"),
                            engagement.workflowState === "AtReception" &&
                              engagement.approvalRejectedAt !== null &&
                              danger("Approval rejected"),
                          )}
                          canManage={canManage}
                        />
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              <QueuePagination
                page={engagements.page}
                pageSize={engagements.pageSize}
                total={engagements.total}
                pageParam="page"
                searchParams={{ q, view: "engagements", stage, purpose }}
              />
            </QueuePending>
          </div>
        )}

        {activeView === "rejected" && rejected && (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <QueuePending
              fallback={<TableSkeleton columns={REJECTED_COLUMNS} pagination />}
            >
              {rejected.rows.length === 0 ? (
                <EmptyState
                  icon={CircleXIcon}
                  title="No rejected records"
                  description="When a stakeholder rejects an approval request, the record appears here until it is requested again or cancelled."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Name</TableHead>
                      <TableHead>Nature of Visit</TableHead>
                      <TableHead>Rejected By</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Rejected</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rejected.rows.map(({ engagement, person, rejection }) => (
                      <TableRow
                        key={engagement.id}
                        className="hover:bg-muted/50"
                      >
                        <TableCell>
                          <Link href={`/dashboard/reception/${engagement.id}`}>
                            {person.fullName}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {/* SAFETY: access_purpose is written only from the
                              AccessPurpose union by `createEngagement`. */}
                          {ACCESS_PURPOSE_LABELS[
                            engagement.accessPurpose as AccessPurpose
                          ] ?? engagement.accessPurpose}
                        </TableCell>
                        <TableCell>
                          {rejection
                            ? `${rejection.approverName} (${rejection.approverRole})`
                            : "-"}
                        </TableCell>
                        <TableCell className="max-w-xs whitespace-normal">
                          {rejection?.reason ?? "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {engagement.approvalRejectedAt
                            ? formatQueueDate(engagement.approvalRejectedAt)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <RejectedRowActions
                            engagementId={engagement.id}
                            canManage={canManage}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <QueuePagination
                page={rejected.page}
                pageSize={rejected.pageSize}
                total={rejected.total}
                pageParam="page"
                searchParams={{ q, view: "rejected" }}
              />
            </QueuePending>
          </div>
        )}
      </div>
    </QueueTransitionProvider>
  );
}
