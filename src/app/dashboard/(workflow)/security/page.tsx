import { ShieldCheckIcon } from "lucide-react";
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

export default async function SecurityQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await requirePinConfirmed();

  if (!session.workflowRoles.includes("SecurityStaff")) {
    redirect("/dashboard");
  }

  const { q, page } = await searchParams;
  const request = toPageRequest(q, page);

  // Visit-only records never reach Security — they finish at Reception.
  const { rows, total, pageSize } = await listEngagementsForLayer(
    "AtSecurity",
    ["Work", "VisitMine"],
    request,
  );

  return (
    <div>
      <PageHeader
        title="Security"
        subtitle="Review completed requirements and forward records to IT."
      />
      <div className="mb-4 flex justify-end">
        <QueueSearch searchParam="q" pageParam="page" />
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {rows.length === 0 ? (
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
