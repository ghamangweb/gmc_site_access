import { ClipboardListIcon, GraduationCapIcon } from "lucide-react";
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
import { ACCESS_PURPOSE_LABELS, type AccessPurpose } from "@/lib/domain/types";
import {
  countEngagementsForLayer,
  listEngagementsForLayer,
  listRecentInductions,
} from "@/lib/services/workflow-service";
import { formatQueueDate } from "@/lib/utils";

export default async function TrainingQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string; page?: string }>;
}) {
  const session = await requirePinConfirmed();

  if (!session.workflowRoles.includes("TrainingStaff")) {
    redirect("/dashboard");
  }

  const { view, q, page } = await searchParams;

  const activeView = view === "recorded" ? "recorded" : "awaiting";
  const request = toPageRequest(q, page);

  // Both paths that reach induction: work-path visitors arriving from
  // Hospital, and visit+mine visitors who come straight from Reception.
  const [awaitingCount, awaiting, recorded] = await Promise.all([
    countEngagementsForLayer("AtTraining", ["Work", "VisitMine"]),
    activeView === "awaiting"
      ? listEngagementsForLayer("AtTraining", ["Work", "VisitMine"], request)
      : undefined,
    activeView === "recorded" ? listRecentInductions(request) : undefined,
  ]);

  const views = [
    {
      label: "Awaiting Induction",
      value: "awaiting",
      href: "/dashboard/training",
      count: awaitingCount,
    },
    {
      label: "Recorded Inductions",
      value: "recorded",
      href: "/dashboard/training?view=recorded",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Training School"
        subtitle="Induction queue for work-path and mine-site visitors."
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <QueueViewTabs views={views} activeView={activeView} />
        <QueueSearch
          searchParam="q"
          pageParam="page"
          placeholder={
            activeView === "awaiting"
              ? "Search the queue"
              : "Search recorded inductions"
          }
        />
      </div>

      {activeView === "awaiting" && awaiting && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {awaiting.rows.length === 0 ? (
            <EmptyState
              icon={GraduationCapIcon}
              title="No records awaiting induction"
              description="Visitors appear here once Hospital clears them, or once Reception sends a mine-site visit through."
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
                        <Link href={`/dashboard/training/${engagement.id}`}>
                          {person.fullName}
                        </Link>
                      </TableCell>
                      <TableCell>{person.passportNo}</TableCell>
                      <TableCell>{purposeLabel}</TableCell>
                      <TableCell>{engagement.arrivalDate}</TableCell>
                      <TableCell>{engagement.departureDate}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm">
                          <Link href={`/dashboard/training/${engagement.id}`}>
                            Record Induction
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

      {activeView === "recorded" && recorded && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {recorded.rows.length === 0 ? (
            <EmptyState
              icon={ClipboardListIcon}
              title="No inductions recorded yet"
              description="Every induction you sign off appears here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Passport No.</TableHead>
                  <TableHead>Inductions</TableHead>
                  <TableHead>Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recorded.rows.map(({ induction, person }) => (
                  <TableRow key={induction.id} className="hover:bg-muted/50">
                    <TableCell>{person.fullName}</TableCell>
                    <TableCell>{person.passportNo}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {[
                        induction.generalSiteInduction ? "General site" : null,
                        induction.otherInductions ? "Other" : null,
                      ]
                        .filter((label) => label !== null)
                        .join(", ") || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatQueueDate(induction.completedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <QueuePagination
            page={recorded.page}
            pageSize={recorded.pageSize}
            total={recorded.total}
            pageParam="page"
            searchParams={{ q, view }}
          />
        </div>
      )}
    </div>
  );
}
