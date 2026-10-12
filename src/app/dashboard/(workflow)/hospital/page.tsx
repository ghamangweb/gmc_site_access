import { Stethoscope } from "lucide-react";
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
import { listEngagementsForLayer } from "@/lib/services/workflow-service";

export default async function HospitalQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await requirePinConfirmed();

  if (!session.workflowRoles.includes("HospitalStaff")) {
    redirect("/dashboard");
  }

  const { q, page } = await searchParams;
  const request = toPageRequest(q, page);

  const { rows, total, pageSize } = await listEngagementsForLayer(
    "AtHospital",
    ["Work"],
    request,
  );

  return (
    <div>
      <PageHeader
        title="Hospital"
        subtitle="Medical clearance queue for work-path visitors."
      />
      <div className="mb-4 flex justify-end">
        <QueueSearch searchParam="q" pageParam="page" />
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {rows.length === 0 ? (
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
              {rows.map(({ engagement, person }) => (
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
