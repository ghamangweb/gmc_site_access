import { IdCardIcon, KeyRoundIcon } from "lucide-react";
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
import { ACCESS_PURPOSE_LABELS, type AccessPurpose } from "@/lib/domain/types";
import {
  countEngagementsForLayer,
  listEngagementsForLayer,
  listRecentProvisionings,
} from "@/lib/services/workflow-service";
import { formatQueueDate } from "@/lib/utils";

export default async function ITQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string; page?: string }>;
}) {
  const session = await requirePinConfirmed();

  if (!session.workflowRoles.includes("ITStaff")) {
    redirect("/dashboard");
  }

  const { view, q, page } = await searchParams;

  const activeView = view === "activated" ? "activated" : "awaiting";
  const request = toPageRequest(q, page);

  // Everything on the awaiting tab has already cleared Security.
  const [awaitingCount, awaiting, activated] = await Promise.all([
    countEngagementsForLayer("AwaitingProvisioning", ["Work", "VisitMine"]),
    activeView === "awaiting"
      ? listEngagementsForLayer(
          "AwaitingProvisioning",
          ["Work", "VisitMine"],
          request,
        )
      : undefined,
    activeView === "activated" ? listRecentProvisionings(request) : undefined,
  ]);

  const views = [
    {
      label: "Awaiting Setup",
      value: "awaiting",
      href: "/dashboard/it",
      count: awaitingCount,
    },
    {
      label: "Access Activated",
      value: "activated",
      href: "/dashboard/it?view=activated",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Information Technology"
        subtitle="Biometric enrollment and access-card setup."
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <QueueViewTabs views={views} activeView={activeView} />
        <QueueSearch
          searchParam="q"
          pageParam="page"
          placeholder={
            activeView === "awaiting"
              ? "Search the queue"
              : "Search activated access"
          }
        />
      </div>

      {activeView === "awaiting" && awaiting && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {awaiting.rows.length === 0 ? (
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
            page={awaiting.page}
            pageSize={awaiting.pageSize}
            total={awaiting.total}
            pageParam="page"
            searchParams={{ q }}
          />
        </div>
      )}

      {activeView === "activated" && activated && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {activated.rows.length === 0 ? (
            <EmptyState
              icon={KeyRoundIcon}
              title="No access activated yet"
              description="Every visitor you switch access on for appears here, with the card issued and its expiry."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Passport No.</TableHead>
                  <TableHead>Card No.</TableHead>
                  <TableHead>Card Expiry</TableHead>
                  <TableHead>Activated</TableHead>
                  <TableHead>Access</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activated.rows.map(({ provisioning, engagement, person }) => (
                  <TableRow key={provisioning.id} className="hover:bg-muted/50">
                    <TableCell>{person.fullName}</TableCell>
                    <TableCell>{person.passportNo}</TableCell>
                    <TableCell>{provisioning.accessCardNumber}</TableCell>
                    <TableCell>{provisioning.accessCardExpiry}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatQueueDate(provisioning.activatedAt)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          engagement.accessState === "Active"
                            ? "bg-status-success-bg text-status-success-fg"
                            : "bg-status-neutral-bg text-status-neutral-fg"
                        }
                      >
                        {engagement.accessState}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/dashboard/it/${engagement.id}`}>
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <QueuePagination
            page={activated.page}
            pageSize={activated.pageSize}
            total={activated.total}
            pageParam="page"
            searchParams={{ q, view }}
          />
        </div>
      )}
    </div>
  );
}
