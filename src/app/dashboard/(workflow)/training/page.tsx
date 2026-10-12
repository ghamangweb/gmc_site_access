import { GraduationCapIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { QueuePagination } from "@/components/layout/queue-pagination";
import { QueueSearch } from "@/components/layout/queue-search";
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
import { listEngagementsForLayer } from "@/lib/services/workflow-service";

export default async function TrainingQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await requirePinConfirmed();

  if (!session.workflowRoles.includes("TrainingStaff")) {
    redirect("/dashboard");
  }

  const { q, page } = await searchParams;
  const request = toPageRequest(q, page);

  // Both paths that reach induction: work-path visitors arriving from
  // Hospital, and visit+mine visitors who come straight from Reception.
  const { rows, total, pageSize } = await listEngagementsForLayer(
    "AtTraining",
    ["Work", "VisitMine"],
    request,
  );

  return (
    <div>
      <PageHeader
        title="Training School"
        subtitle="Induction queue for work-path and mine-site visitors."
      />
      <div className="mb-4 flex justify-end">
        <QueueSearch searchParam="q" pageParam="page" />
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {rows.length === 0 ? (
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
              {rows.map(({ engagement, person }) => {
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
          page={request.page}
          pageSize={pageSize}
          total={total}
          pageParam="page"
          searchParams={{ q }}
        />
      </div>
    </div>
  );
}
