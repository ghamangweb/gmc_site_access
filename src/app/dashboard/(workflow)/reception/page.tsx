import { InboxIcon, UsersRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ReceptionRow } from "@/app/dashboard/(workflow)/reception/reception-row";
import { RegistrationRequestRow } from "@/app/dashboard/(workflow)/reception/registration-request-row";
import { PageHeader } from "@/components/layout/page-header";
import { QueuePagination } from "@/components/layout/queue-pagination";
import { QueueSearch } from "@/components/layout/queue-search";
import { QueueViewTabs } from "@/components/layout/queue-view-tabs";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requirePinConfirmed } from "@/lib/auth/guards";
import { toPageRequest } from "@/lib/domain/pagination";
import type { WorkflowState } from "@/lib/domain/types";
import {
  countOutstandingRegistrationRequests,
  countRegistrationRequestsByType,
  listRegistrationRequests,
} from "@/lib/services/registration-service";
import { listEngagementsWithPerson } from "@/lib/services/workflow-service";

// Switching Local/Foreign keeps whatever is in the search box but drops the
// page — page 4 of the old filter means nothing under the new one.
function filterHref(
  value: "Local" | "Foreign" | undefined,
  search: string | undefined,
): string {
  const params = new URLSearchParams();

  if (value) {
    params.set("type", value);
  }

  if (search) {
    params.set("q", search);
  }

  const query = params.toString();

  return query ? `/dashboard/reception?${query}` : "/dashboard/reception";
}

const REGISTRATION_FILTERS = [
  { label: "All", value: undefined },
  { label: "Local", value: "Local" },
  { label: "Foreign", value: "Foreign" },
] as const;

export default async function ReceptionQueuePage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    type?: string;
    q?: string;
    page?: string;
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

  const { view, type, q, page } = await searchParams;

  // One queue at a time. Stacking submissions above engagements meant two
  // tables, two paginators and two searches competing on one screen; this is
  // the same information as two views of one page, so only the active one is
  // queried and rendered. Submissions is the default: it is where the
  // workflow starts.
  const activeView = view === "engagements" ? "engagements" : "submissions";

  // Anything other than a known registration type falls back to "All" rather
  // than showing an empty table for a typo'd URL.
  const activeFilter =
    type === "Local" || type === "Foreign" ? type : undefined;

  const request = toPageRequest(q, page);

  // Counts drive the view tabs and must reflect everything, not the page on
  // screen, so they are their own queries.
  const [typeCounts, outstandingCount] = await Promise.all([
    countRegistrationRequestsByType(),
    countOutstandingRegistrationRequests(),
  ]);

  const submissions =
    activeView === "submissions"
      ? await listRegistrationRequests({
          ...request,
          registrationType: activeFilter,
        })
      : undefined;

  const engagements =
    activeView === "engagements"
      ? await listEngagementsWithPerson(request)
      : undefined;

  const firstName = session.displayName?.split(" ")[0] ?? "there";

  const views = [
    {
      label: "Submitted Registrations",
      value: "submissions",
      href: "/dashboard/reception",
      count: outstandingCount,
    },
    {
      label: "Engagements",
      value: "engagements",
      href: "/dashboard/reception?view=engagements",
    },
  ];

  return (
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
        <QueueSearch
          searchParam="q"
          pageParam="page"
          placeholder={
            activeView === "submissions"
              ? "Search submissions"
              : "Search engagements"
          }
        />
      </div>

      {activeView === "submissions" && submissions && (
        <>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-muted-foreground text-xs">Show</span>
            <div className="flex items-center gap-1">
              {REGISTRATION_FILTERS.map((filter) => (
                <Button
                  key={filter.label}
                  asChild
                  size="sm"
                  variant={activeFilter === filter.value ? "default" : "ghost"}
                >
                  <Link href={filterHref(filter.value, q)}>
                    {filter.label}
                    <span className="text-xs opacity-70">
                      {filter.value ? typeCounts[filter.value] : typeCounts.all}
                    </span>
                  </Link>
                </Button>
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
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
                    <TableHead>Passport / Ghana Card</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Nature of Visit</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Action</TableHead>
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
              searchParams={{ q, type }}
            />
          </div>
        </>
      )}

      {activeView === "engagements" && engagements && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
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
                  <TableHead>Passport No.</TableHead>
                  <TableHead>Nature of Visit</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
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
                      passportNo={person.passportNo}
                      accessPurpose={engagement.accessPurpose}
                      workflowState={workflowState}
                      accessState={engagement.accessState}
                      approvalRejected={
                        engagement.workflowState === "AtReception" &&
                        engagement.approvalRejectedAt !== null
                      }
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
            searchParams={{ q, view: "engagements" }}
          />
        </div>
      )}
    </div>
  );
}
