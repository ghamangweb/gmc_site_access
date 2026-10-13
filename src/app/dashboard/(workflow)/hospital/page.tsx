import { ClipboardListIcon, Stethoscope } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { QueuePagination } from "@/components/layout/queue-pagination";
import { QueueSearch } from "@/components/layout/queue-search";
import { QueueViewTabs } from "@/components/layout/queue-view-tabs";
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
  HOSPITAL_CLEARANCE_LABELS,
  type HospitalClearanceStatus,
  WORKFLOW_STATE_LABELS,
  type WorkflowState,
} from "@/lib/domain/types";
import {
  countEngagementsForLayer,
  listEngagementsForLayer,
  listRecentHospitalClearances,
} from "@/lib/services/workflow-service";
import { formatQueueDate } from "@/lib/utils";

// Per ui-tokens.md's state → bucket mapping. Unfit is a danger outcome, not a
// broken record — it stays on the awaiting tab until the visitor is
// re-examined.
const CLEARANCE_BADGE: Record<HospitalClearanceStatus, string> = {
  Fit: "bg-status-success-bg text-status-success-fg",
  FitWithConditions: "bg-status-warning-bg text-status-warning-fg",
  Unfit: "bg-status-danger-bg text-status-danger-fg",
};

export default async function HospitalQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string; page?: string }>;
}) {
  const session = await requirePinConfirmed();

  if (!session.workflowRoles.includes("HospitalStaff")) {
    redirect("/dashboard");
  }

  const { view, q, page } = await searchParams;

  // One queue at a time, like Reception. Awaiting is the default: it is the
  // work, and the recorded tab is the reference.
  const activeView = view === "recorded" ? "recorded" : "awaiting";
  const request = toPageRequest(q, page);

  // The awaiting pill must show outstanding work on either tab, so the count
  // is its own query.
  const [awaitingCount, awaiting, recorded] = await Promise.all([
    countEngagementsForLayer("AtHospital", ["Work"]),
    activeView === "awaiting"
      ? listEngagementsForLayer("AtHospital", ["Work"], request)
      : undefined,
    activeView === "recorded"
      ? listRecentHospitalClearances(request)
      : undefined,
  ]);

  const views = [
    {
      label: "Awaiting Clearance",
      value: "awaiting",
      href: "/dashboard/hospital",
      count: awaitingCount,
    },
    {
      label: "Recorded Clearances",
      value: "recorded",
      href: "/dashboard/hospital?view=recorded",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Hospital"
        subtitle="Medical clearance queue for work-path visitors."
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <QueueViewTabs views={views} activeView={activeView} />
        <QueueSearch
          searchParam="q"
          pageParam="page"
          placeholder={
            activeView === "awaiting"
              ? "Search the queue"
              : "Search recorded clearances"
          }
        />
      </div>

      {activeView === "awaiting" && awaiting && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {awaiting.rows.length === 0 ? (
            <EmptyState
              icon={Stethoscope}
              title="No records awaiting Hospital clearance"
              description="Work-path visitors will appear here once they reach the Hospital stage."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Passport No.</TableHead>
                  <TableHead>Arrival</TableHead>
                  <TableHead>Departure</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {awaiting.rows.map(({ engagement, person }) => (
                  <TableRow key={engagement.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Link href={`/dashboard/hospital/${engagement.id}`}>
                        {person.fullName}
                      </Link>
                    </TableCell>
                    <TableCell>{person.passportNo}</TableCell>
                    <TableCell>{engagement.arrivalDate}</TableCell>
                    <TableCell>{engagement.departureDate}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm">
                        <Link href={`/dashboard/hospital/${engagement.id}`}>
                          Record Clearance
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
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
              title="No clearances recorded yet"
              description="Every clearance decision you record appears here, with its outcome and the stage the record has since reached."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Passport No.</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Recorded</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recorded.rows.map(({ clearance, engagement, person }) => {
                  // SAFETY: clearance_status is a text column written only
                  // from the HospitalClearanceStatus union by
                  // `recordHospitalClearance`, and the table's check
                  // constraint allows nothing else.
                  const status =
                    clearance.clearanceStatus as HospitalClearanceStatus;

                  return (
                    <TableRow key={clearance.id} className="hover:bg-muted/50">
                      <TableCell>{person.fullName}</TableCell>
                      <TableCell>{person.passportNo}</TableCell>
                      <TableCell>
                        <Badge className={CLEARANCE_BADGE[status]}>
                          {HOSPITAL_CLEARANCE_LABELS[status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatQueueDate(clearance.clearanceDate)}
                      </TableCell>
                      <TableCell>
                        {
                          // SAFETY: workflow_state is a text column the state
                          // machine alone writes, always a WorkflowState.
                          WORKFLOW_STATE_LABELS[
                            engagement.workflowState as WorkflowState
                          ]
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/dashboard/hospital/${engagement.id}`}>
                            View
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
