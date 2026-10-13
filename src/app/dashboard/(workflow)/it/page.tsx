import { IdCardIcon } from "lucide-react";
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

export default async function ITQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await requirePinConfirmed();

  if (!session.workflowRoles.includes("ITStaff")) {
    redirect("/dashboard");
  }

  const { q, page } = await searchParams;
  const request = toPageRequest(q, page);

  // Everything here has already cleared Security.
  const { rows, total, pageSize } = await listEngagementsForLayer(
    "AwaitingProvisioning",
    ["Work", "VisitMine"],
    request,
  );

  return (
    <div>
      <PageHeader
        title="Information Technology"
        subtitle="Biometric enrollment and access-card setup."
      />
      <div className="mb-4 flex justify-end">
        <QueueSearch searchParam="q" pageParam="page" />
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {rows.length === 0 ? (
          <EmptyState
            icon={IdCardIcon}
            title="No records awaiting access setup"
            description="Records arrive here once Security has cleared them."
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
                      <Link href={`/dashboard/it/${engagement.id}`}>
                        {person.fullName}
                      </Link>
                    </TableCell>
                    <TableCell>{person.passportNo}</TableCell>
                    <TableCell>{purposeLabel}</TableCell>
                    <TableCell>{engagement.arrivalDate}</TableCell>
                    <TableCell>{engagement.departureDate}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm">
                        <Link href={`/dashboard/it/${engagement.id}`}>
                          Set Up Access
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
