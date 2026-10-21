import { BanIcon, IdCardIcon, ShieldCheckIcon } from "lucide-react";
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
import { RevokeAccessButton } from "@/components/workflow/revoke-access-button";
import { requirePinConfirmed } from "@/lib/auth/guards";
import { toPageRequest } from "@/lib/domain/pagination";
import {
  ACCESS_PURPOSE_LABELS,
  ACCESS_STATE_LABELS,
  type AccessPurpose,
  type AccessState,
  getEffectiveAccessState,
} from "@/lib/domain/types";
import {
  countEngagementsForLayer,
  countPendingRevocations,
  expireLapsedAccess,
  listEngagementsForLayer,
  listPendingRevocations,
  listRecentProvisionings,
} from "@/lib/services/workflow-service";
import { formatQueueDate } from "@/lib/utils";

// How long the card was issued for: its own validity window, activation day to
// expiry day inclusive, since a card is good through its expiry date. The
// authoritative window — `activateAccess` refuses an expiry later than the
// departure date or in the past. Whether it has since lapsed is the Access
// column's job, not this one.
function accessDuration(activatedAt: Date, cardExpiry: string): string {
  const start = Date.parse(
    `${activatedAt.toISOString().slice(0, 10)}T00:00:00Z`,
  );

  const end = Date.parse(`${cardExpiry}T00:00:00Z`);

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return "-";
  }

  const days = Math.round((end - start) / 86_400_000) + 1;

  if (days <= 0) {
    return "-";
  }

  return days === 1 ? "1 day" : `${days} days`;
}

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

  const activeView =
    view === "granted" || view === "revocations" ? view : "awaiting";

  const request = toPageRequest(q, page);

  // Bring the stored state up to date before the register reads it.
  if (activeView === "granted") {
    await expireLapsedAccess();
  }

  // Visit-only records never reach Security — they finish at Reception.
  const [awaitingCount, revocationCount, awaiting, granted, revocations] =
    await Promise.all([
      countEngagementsForLayer("AtSecurity", ["Work", "VisitMine"]),
      countPendingRevocations(),
      activeView === "awaiting"
        ? listEngagementsForLayer("AtSecurity", ["Work", "VisitMine"], request)
        : undefined,
      // The end of the line: Security has issued a card, so the visitor is
      // through every stage — one row per card issued.
      activeView === "granted" ? listRecentProvisionings(request) : undefined,
      // Access Reception has asked to switch off. Security carries it out; there
      // is no approval step in between.
      activeView === "revocations"
        ? listPendingRevocations(request)
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
      label: "Site Access Granted",
      value: "granted",
      href: "/dashboard/security?view=granted",
    },
    {
      label: "Revocation Requests",
      value: "revocations",
      href: "/dashboard/security?view=revocations",
      count: revocationCount,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Security"
        subtitle="Review completed requirements, issue site access and revoke it when asked."
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <QueueViewTabs views={views} activeView={activeView} />
        <QueueSearch
          searchParam="q"
          pageParam="page"
          placeholder={
            activeView === "awaiting"
              ? "Search the queue"
              : activeView === "revocations"
                ? "Search revocation requests"
                : "Search granted access"
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

      {activeView === "granted" && granted && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {granted.rows.length === 0 ? (
            <EmptyState
              icon={IdCardIcon}
              title="Nobody has site access yet"
              description="Visitors appear here once Security activates their access card, the end of the workflow."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Passport No.</TableHead>
                  <TableHead>Nature of Visit</TableHead>
                  <TableHead>Card No.</TableHead>
                  <TableHead>Access From</TableHead>
                  <TableHead>Access Until</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Access</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {granted.rows.map(({ provisioning, engagement, person }) => {
                  // SAFETY: access_state is a text column written only from
                  // the AccessState union.
                  const accessState = getEffectiveAccessState(
                    engagement.accessState as AccessState,
                    provisioning.accessCardExpiry,
                  );

                  // SAFETY: access_purpose is a text column written only from
                  // the AccessPurpose union by `createEngagement`.
                  const purposeLabel =
                    ACCESS_PURPOSE_LABELS[
                      engagement.accessPurpose as AccessPurpose
                    ] ?? engagement.accessPurpose;

                  return (
                    <TableRow
                      key={provisioning.id}
                      className="hover:bg-muted/50"
                    >
                      <TableCell>{person.fullName}</TableCell>
                      <TableCell>{person.passportNo}</TableCell>
                      <TableCell>{purposeLabel}</TableCell>
                      <TableCell>{provisioning.accessCardNumber}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatQueueDate(provisioning.activatedAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {provisioning.accessCardExpiry}
                      </TableCell>
                      <TableCell>
                        {accessDuration(
                          provisioning.activatedAt,
                          provisioning.accessCardExpiry,
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            accessState === "Active"
                              ? "bg-status-success-bg text-status-success-fg"
                              : accessState === "TerminationRequested"
                                ? "bg-status-warning-bg text-status-warning-fg"
                                : accessState === "Expired" ||
                                    accessState === "Terminated"
                                  ? "bg-status-danger-bg text-status-danger-fg"
                                  : "bg-status-neutral-bg text-status-neutral-fg"
                          }
                        >
                          {ACCESS_STATE_LABELS[accessState]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          <QueuePagination
            page={granted.page}
            pageSize={granted.pageSize}
            total={granted.total}
            pageParam="page"
            searchParams={{ q, view }}
          />
        </div>
      )}

      {activeView === "revocations" && revocations && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {revocations.rows.length === 0 ? (
            <EmptyState
              icon={BanIcon}
              title="No revocation requests"
              description="When Reception asks for someone's site access to be revoked, the request appears here for you to carry out."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Passport No.</TableHead>
                  <TableHead>Card No.</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revocations.rows.map(
                  ({
                    request: terminationRequest,
                    engagement,
                    person,
                    requestedByName,
                    accessCardNumber,
                  }) => (
                    <TableRow
                      key={terminationRequest.id}
                      className="hover:bg-muted/50"
                    >
                      <TableCell>{person.fullName}</TableCell>
                      <TableCell>{person.passportNo}</TableCell>
                      <TableCell>{accessCardNumber ?? "-"}</TableCell>
                      <TableCell className="max-w-xs whitespace-normal">
                        {terminationRequest.reason}
                      </TableCell>
                      <TableCell>{requestedByName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatQueueDate(terminationRequest.requestedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        {session.systemRole !== "Guest" && (
                          <RevokeAccessButton
                            engagementId={engagement.id}
                            personName={person.fullName}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          )}
          <QueuePagination
            page={revocations.page}
            pageSize={revocations.pageSize}
            total={revocations.total}
            pageParam="page"
            searchParams={{ q, view }}
          />
        </div>
      )}
    </div>
  );
}
