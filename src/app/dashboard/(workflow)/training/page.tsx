import { ClipboardListIcon, GraduationCapIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { QueueFilters } from "@/components/layout/queue-filter";
import { QueuePagination } from "@/components/layout/queue-pagination";
import { QueueSearch } from "@/components/layout/queue-search";
import { QueueViewTabs } from "@/components/layout/queue-view-tabs";
import { TrainingExportButton } from "@/components/layout/training-export-button";
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
import { NameWithAttention } from "@/components/workflow/attention-dot";
import { requirePinConfirmed } from "@/lib/auth/guards";
import { type Attention, danger } from "@/lib/domain/attention";
import { toPageRequest } from "@/lib/domain/pagination";
import { accessPurposeOptions, parseFilter } from "@/lib/domain/queue-filters";
import { ACCESS_PURPOSE_LABELS, type AccessPurpose } from "@/lib/domain/types";
import {
  checkHospitalClearanceAge,
  listEngagementsForLayer,
  listRecentInductions,
} from "@/lib/services/workflow-service";
import { formatQueueDate } from "@/lib/utils";

const TRAINING_PURPOSES: AccessPurpose[] = ["Work", "WorkMine", "VisitMine"];

export default async function TrainingQueuePage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    q?: string;
    page?: string;
    purpose?: string;
  }>;
}) {
  const session = await requirePinConfirmed();

  if (!session.workflowRoles.includes("TrainingStaff")) {
    redirect("/dashboard");
  }

  const { view, q, page, purpose } = await searchParams;

  const activeView = view === "recorded" ? "recorded" : "awaiting";
  const request = toPageRequest(q, page);
  const accessPurpose = parseFilter(purpose, TRAINING_PURPOSES);

  // Both paths that reach induction: work-path visitors arriving from
  // Hospital, and visit+mine visitors who come straight from Reception.
  const [awaiting, recorded] = await Promise.all([
    activeView === "awaiting"
      ? listEngagementsForLayer("AtTraining", TRAINING_PURPOSES, {
          ...request,
          accessPurpose,
        })
      : undefined,
    activeView === "recorded"
      ? listRecentInductions({ ...request, accessPurpose })
      : undefined,
  ]);

  // The medical has to be valid at sign-off, so a lapsed or lapsing one is
  // flagged — the same check that blocks the induction. Bounded by the page.
  const clearanceFlags = new Map<string, Attention>();

  await Promise.all(
    (awaiting?.rows ?? []).map(async ({ engagement }) => {
      const age = await checkHospitalClearanceAge(engagement.id);

      if (!age.applicable) return;

      if (age.expired) {
        clearanceFlags.set(
          engagement.id,
          danger("Medical clearance expired — must return to Hospital"),
        );
      } else if (age.expiringSoon) {
        clearanceFlags.set(
          engagement.id,
          danger(
            `Medical clearance expires in ${age.daysRemaining} day${age.daysRemaining === 1 ? "" : "s"}`,
          ),
        );
      }
    }),
  );

  const views = [
    {
      label: "Awaiting Induction",
      value: "awaiting",
      href: "/dashboard/training",
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
        actions={
          session.systemRole !== "Guest" ? <TrainingExportButton /> : undefined
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <QueueViewTabs views={views} activeView={activeView} />
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <QueueFilters
            pageParam="page"
            fields={[
              {
                param: "purpose",
                label: "Nature of Visit",
                options: accessPurposeOptions(TRAINING_PURPOSES),
              },
            ]}
          />
          <QueueSearch searchParam="q" pageParam="page" />
        </div>
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
                        <NameWithAttention
                          attention={clearanceFlags.get(engagement.id)}
                        >
                          <Link href={`/dashboard/training/${engagement.id}`}>
                            {person.fullName}
                          </Link>
                        </NameWithAttention>
                      </TableCell>
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
            searchParams={{ q, purpose }}
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
                  <TableHead>Inductions</TableHead>
                  <TableHead>Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recorded.rows.map(({ induction, person }) => (
                  <TableRow key={induction.id} className="hover:bg-muted/50">
                    <TableCell>{person.fullName}</TableCell>
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
            searchParams={{ q, view, purpose }}
          />
        </div>
      )}
    </div>
  );
}
