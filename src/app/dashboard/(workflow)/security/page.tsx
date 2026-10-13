import { SendIcon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { QueuePagination } from "@/components/layout/queue-pagination";
import { QueueSearch } from "@/components/layout/queue-search";
import { QueueViewTabs } from "@/components/layout/queue-view-tabs";
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
  countEngagementsForLayer,
  listEngagementsForLayer,
  listRecentSecurityForwards,
} from "@/lib/services/workflow-service";
import { formatQueueDate } from "@/lib/utils";

export default async function SecurityQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string; page?: string }>;
}) {
  const session = await requirePinConfirmed();

  if (!session.workflowRoles.includes("SecurityStaff")) {
    redirect("/dashboard");
  }

  const { view, q, page } = await searchParams;

  const activeView = view === "forwarded" ? "forwarded" : "awaiting";
  const request = toPageRequest(q, page);

  // Visit-only records never reach Security — they finish at Reception.
  const [awaitingCount, awaiting, forwarded] = await Promise.all([
    countEngagementsForLayer("AtSecurity", ["Work", "VisitMine"]),
    activeView === "awaiting"
      ? listEngagementsForLayer("AtSecurity", ["Work", "VisitMine"], request)
      : undefined,
    activeView === "forwarded"
      ? listRecentSecurityForwards(request)
      : undefined,
  ]);

  const views = [
    {
      label: "Awaiting Review",
      value: "awaiting",
      href: "/dashboard/security",
      count: awaitingCount,
    },
    {
      label: "Forwarded to IT",
      value: "forwarded",
      href: "/dashboard/security?view=forwarded",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Security"
        subtitle="Review completed requirements and forward records to IT."
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <QueueViewTabs views={views} activeView={activeView} />
        <QueueSearch
          searchParam="q"
          pageParam="page"
          placeholder={
            activeView === "awaiting"
              ? "Search the queue"
              : "Search forwarded records"
          }
        />
      </div>

      {activeView === "awaiting" && awaiting && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {awaiting.rows.length === 0 ? (
            <EmptyState
              icon={ShieldCheckIcon}
              title="No records awaiting Security review"
              description="Records arrive here once Training School signs off the induction."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Passport No.</TableHead>
                  <TableHead>Nature of Visit</TableHead>
                  <TableHead>Arrival</TableHead>
                  <TableHead>Departure</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {awaiting.rows.map(({ engagement, person }) => {
                  // SAFETY: access_purpose is a text column written only from
                  // the AccessPurpose union by `createEngagement`.
                  const purposeLabel =
                    ACCESS_PURPOSE_LABELS[
                      engagement.accessPurpose as AccessPurpose
                    ] ?? engagement.accessPurpose;

                  return (
                    <TableRow key={engagement.id} className="hover:bg-muted/50">
                      <TableCell>
                        <Link href={`/dashboard/security/${engagement.id}`}>
                          {person.fullName}
                        </Link>
                      </TableCell>
                      <TableCell>{person.passportNo}</TableCell>
                      <TableCell>{purposeLabel}</TableCell>
                      <TableCell>{engagement.arrivalDate}</TableCell>
                      <TableCell>{engagement.departureDate}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm">
                          <Link href={`/dashboard/security/${engagement.id}`}>
                            Review
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          <QueuePagination
            page={awaiting.page}
            pageSize={awaiting.pageSize}
            total={awaiting.total}
            pageParam="page"
            searchParams={{ q }}
          />
        </div>
      )}

      {activeView === "forwarded" && forwarded && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {forwarded.rows.length === 0 ? (
            <EmptyState
              icon={SendIcon}
              title="Nothing forwarded to IT yet"
              description="Records you forward for access setup appear here, with the stage they have since reached."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Passport No.</TableHead>
                  <TableHead>Nature of Visit</TableHead>
                  <TableHead>Forwarded By</TableHead>
                  <TableHead>Forwarded</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forwarded.rows.map(
                  ({ forwardedAt, forwardedByName, engagement, person }) => {
                    // SAFETY: access_purpose is a text column written only
                    // from the AccessPurpose union by `createEngagement`.
                    const purposeLabel =
                      ACCESS_PURPOSE_LABELS[
                        engagement.accessPurpose as AccessPurpose
                      ] ?? engagement.accessPurpose;

                    return (
                      <TableRow
                        key={`${engagement.id}-${forwardedAt.toISOString()}`}
                        className="hover:bg-muted/50"
                      >
                        <TableCell>{person.fullName}</TableCell>
                        <TableCell>{person.passportNo}</TableCell>
                        <TableCell>{purposeLabel}</TableCell>
                        <TableCell>{forwardedByName}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatQueueDate(forwardedAt)}
                        </TableCell>
                        <TableCell>
                          {
                            // SAFETY: workflow_state is a text column the
                            // state machine alone writes.
                            WORKFLOW_STATE_LABELS[
                              engagement.workflowState as WorkflowState
                            ]
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/dashboard/security/${engagement.id}`}>
                              View
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  },
                )}
              </TableBody>
            </Table>
          )}
          <QueuePagination
            page={forwarded.page}
            pageSize={forwarded.pageSize}
            total={forwarded.total}
            pageParam="page"
            searchParams={{ q, view }}
          />
        </div>
      )}
    </div>
  );
}
