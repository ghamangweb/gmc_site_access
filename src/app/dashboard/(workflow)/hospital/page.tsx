import { parseISO } from "date-fns";
import {
  CalendarClockIcon,
  ClipboardListIcon,
  MoreVerticalIcon,
  Stethoscope,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { QueuePagination } from "@/components/layout/queue-pagination";
import { QueueSearch } from "@/components/layout/queue-search";
import { QueueViewTabs } from "@/components/layout/queue-view-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { danger, success } from "@/lib/domain/attention";
import { toPageRequest } from "@/lib/domain/pagination";
import {
  HOSPITAL_CLEARANCE_LABELS,
  type HospitalClearanceStatus,
  isoToday,
  WORKFLOW_STATE_LABELS,
  type WorkflowState,
} from "@/lib/domain/types";
import {
  countAwaitingHospitalReviews,
  countEngagementsForLayer,
  getLatestClearanceStatuses,
  listAwaitingHospitalReviews,
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
  const activeView =
    view === "recorded" || view === "review" ? view : "awaiting";

  const request = toPageRequest(q, page);

  // The awaiting pills must show outstanding work on every tab, so the counts
  // are their own queries.
  const [awaitingCount, reviewCount, awaiting, awaitingReview, recorded] =
    await Promise.all([
      countEngagementsForLayer("AtHospital", ["Work", "WorkMine"]),
      countAwaitingHospitalReviews(),
      activeView === "awaiting"
        ? listEngagementsForLayer("AtHospital", ["Work", "WorkMine"], request)
        : undefined,
      activeView === "review"
        ? listAwaitingHospitalReviews(request)
        : undefined,
      activeView === "recorded"
        ? listRecentHospitalClearances(request)
        : undefined,
    ]);

  // Awaiting rows that were already marked Unfit are back for re-clearance —
  // flagged red, so they don't read like fresh arrivals.
  const awaitingStatuses = await getLatestClearanceStatuses(
    awaiting?.rows.map(({ engagement }) => engagement.id) ?? [],
  );
  const today = isoToday();

  const views = [
    {
      label: "Awaiting Clearance",
      value: "awaiting",
      href: "/dashboard/hospital",
      count: awaitingCount,
    },
    {
      label: "Awaiting Review",
      value: "review",
      href: "/dashboard/hospital?view=review",
      count: reviewCount,
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
              : activeView === "review"
                ? "Search awaiting reviews"
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
                  <TableHead>Arrival</TableHead>
                  <TableHead>Departure</TableHead>
                  {/* w-px shrinks the column to the button, so the header
                      starts where "Record Clearance" starts, at the right. */}
                  <TableHead className="w-px">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {awaiting.rows.map(({ engagement, person }) => (
                  <TableRow key={engagement.id} className="hover:bg-muted/50">
                    <TableCell>
                      <NameWithAttention
                        attention={
                          awaitingStatuses.get(engagement.id) === "Unfit"
                            ? danger("Marked Unfit — awaiting re-clearance")
                            : undefined
                        }
                      >
                        <Link href={`/dashboard/hospital/${engagement.id}`}>
                          {person.fullName}
                        </Link>
                      </NameWithAttention>
                    </TableCell>
                    <TableCell>{engagement.arrivalDate}</TableCell>
                    <TableCell>{engagement.departureDate}</TableCell>
                    <TableCell>
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

      {activeView === "review" && awaitingReview && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {awaitingReview.rows.length === 0 ? (
            <EmptyState
              icon={CalendarClockIcon}
              title="No reviews awaiting"
              description="Fit with Conditions clearances appear here, soonest review date first, until their review is recorded."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Recorded</TableHead>
                  <TableHead>Cleared By</TableHead>
                  <TableHead>Next Review Date</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {awaitingReview.rows.map(
                  ({ clearance, engagement, person, recordedByName }) => (
                    <TableRow key={clearance.id} className="hover:bg-muted/50">
                      <TableCell>
                        <NameWithAttention
                          attention={
                            clearance.nextReviewDate &&
                            clearance.nextReviewDate <= today
                              ? success(
                                  clearance.nextReviewDate < today
                                    ? "Review overdue"
                                    : "Review due today",
                                )
                              : undefined
                          }
                        >
                          <Link
                            href={`/dashboard/hospital/${engagement.id}?clearance=${clearance.id}`}
                          >
                            {person.fullName}
                          </Link>
                        </NameWithAttention>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatQueueDate(clearance.clearanceDate)}
                      </TableCell>
                      <TableCell>{recordedByName ?? "-"}</TableCell>
                      <TableCell>
                        {clearance.nextReviewDate
                          ? formatQueueDate(parseISO(clearance.nextReviewDate))
                          : "-"}
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
                      <TableCell>
                        <Button asChild size="sm">
                          <Link
                            href={`/dashboard/hospital/${engagement.id}?review=${clearance.id}`}
                          >
                            Record Review
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          )}
          <QueuePagination
            page={awaitingReview.page}
            pageSize={awaitingReview.pageSize}
            total={awaitingReview.total}
            pageParam="page"
            searchParams={{ q, view }}
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
                  <TableHead>Outcome</TableHead>
                  <TableHead>Recorded</TableHead>
                  <TableHead>Cleared By</TableHead>
                  <TableHead>Next Review Date</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recorded.rows.map(
                  ({
                    clearance,
                    engagement,
                    person,
                    recordedByName,
                    isLatest,
                  }) => {
                    // SAFETY: clearance_status is a text column written only
                    // from the HospitalClearanceStatus union by
                    // `recordHospitalClearance`, and the table's check
                    // constraint allows nothing else.
                    const status =
                      clearance.clearanceStatus as HospitalClearanceStatus;
                    // Only Fit with Conditions is reviewed, and only its
                    // latest clearance while the record is past Hospital —
                    // the same rule `recordHospitalReview` enforces.

                    const reviewable =
                      status === "FitWithConditions" &&
                      isLatest &&
                      engagement.workflowState !== "AtHospital";

                    return (
                      <TableRow
                        key={clearance.id}
                        className="hover:bg-muted/50"
                      >
                        <TableCell>{person.fullName}</TableCell>
                        <TableCell>
                          <Badge className={CLEARANCE_BADGE[status]}>
                            {HOSPITAL_CLEARANCE_LABELS[status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatQueueDate(clearance.clearanceDate)}
                        </TableCell>
                        <TableCell>{recordedByName ?? "-"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {clearance.nextReviewDate
                            ? formatQueueDate(
                                parseISO(clearance.nextReviewDate),
                              )
                            : "-"}
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                              >
                                <MoreVerticalIcon />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/dashboard/hospital/${engagement.id}?clearance=${clearance.id}`}
                                >
                                  View
                                </Link>
                              </DropdownMenuItem>
                              {reviewable ? (
                                <DropdownMenuItem asChild>
                                  <Link
                                    href={`/dashboard/hospital/${engagement.id}?review=${clearance.id}`}
                                  >
                                    Review
                                  </Link>
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem disabled>
                                  Review
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  },
                )}
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
