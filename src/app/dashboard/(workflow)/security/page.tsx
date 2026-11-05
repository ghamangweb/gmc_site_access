import { BanIcon, IdCardIcon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { GrantedRowActions } from "@/app/dashboard/(workflow)/security/granted-row-actions";
import { PageHeader } from "@/components/layout/page-header";
import { QueueFilters } from "@/components/layout/queue-filter";
import { QueuePagination } from "@/components/layout/queue-pagination";
import { QueueSearch } from "@/components/layout/queue-search";
import { QueueViewTabs } from "@/components/layout/queue-view-tabs";
import { SecurityExportButton } from "@/components/layout/security-export-button";
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
import { NameWithAttention } from "@/components/workflow/attention-dot";
import { RevokeAccessButton } from "@/components/workflow/revoke-access-button";
import { requirePinConfirmed } from "@/lib/auth/guards";
import { danger, pickAttention, success } from "@/lib/domain/attention";
import {
  hasPendingStayExtension,
  isCardExpiryUpdatable,
} from "@/lib/domain/card-expiry";
import { toPageRequest } from "@/lib/domain/pagination";
import {
  accessPurposeOptions,
  accessStateOptions,
  parseFilter,
} from "@/lib/domain/queue-filters";
import {
  ACCESS_PURPOSE_LABELS,
  ACCESS_STATE_LABELS,
  type AccessPurpose,
  type AccessState,
  getEffectiveAccessState,
  type WorkflowState,
} from "@/lib/domain/types";
import {
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

const SECURITY_PURPOSES: AccessPurpose[] = ["Work", "WorkMine", "VisitMine"];

// A granted card is never Pending, so the Granted tab does not offer it.
const GRANTED_ACCESS_STATES: AccessState[] = [
  "Active",
  "Expired",
  "TerminationRequested",
  "Terminated",
];

export default async function SecurityQueuePage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    q?: string;
    page?: string;
    access?: string;
    purpose?: string;
  }>;
}) {
  const session = await requirePinConfirmed();

  if (!session.workflowRoles.includes("SecurityStaff")) {
    redirect("/dashboard");
  }

  const { view, q, page, access, purpose } = await searchParams;

  // Guests see Security's register read-only.
  const canWrite = session.systemRole !== "Guest";

  const activeView =
    view === "granted" || view === "revocations" ? view : "awaiting";

  const request = toPageRequest(q, page);
  const accessPurpose = parseFilter(purpose, SECURITY_PURPOSES);
  const grantedAccessState = parseFilter(access, GRANTED_ACCESS_STATES);

  // Bring the stored state up to date before the register reads it.
  if (activeView === "granted") {
    await expireLapsedAccess();
  }

  // Visit-only records never reach Security — they finish at Reception.
  const [awaiting, granted, revocations] = await Promise.all([
    activeView === "awaiting"
      ? listEngagementsForLayer("AtSecurity", SECURITY_PURPOSES, {
          ...request,
          accessPurpose,
        })
      : undefined,
    // The end of the line: Security has issued a card, so the visitor is
    // through every stage — one row per card issued.
    activeView === "granted"
      ? listRecentProvisionings({
          ...request,
          accessState: grantedAccessState,
          accessPurpose,
        })
      : undefined,
    // Access Reception has asked to switch off. Security carries it out; there
    // is no approval step in between.
    activeView === "revocations" ? listPendingRevocations(request) : undefined,
  ]);

  const views = [
    {
      label: "Awaiting Review",
      value: "awaiting",
      href: "/dashboard/security",
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
    },
  ];

  return (
    <div>
      <PageHeader
        title="Security"
        subtitle="Review completed requirements, issue site access and revoke it when asked."
        actions={
          session.systemRole !== "Guest" ? <SecurityExportButton /> : undefined
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <QueueViewTabs views={views} activeView={activeView} />
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {activeView !== "revocations" && (
            <QueueFilters
              pageParam="page"
              fields={[
                ...(activeView === "granted"
                  ? [
                      {
                        param: "access",
                        label: "Access",
                        options: accessStateOptions(GRANTED_ACCESS_STATES),
                      },
                    ]
                  : []),
                {
                  param: "purpose",
                  label: "Nature of Visit",
                  options: accessPurposeOptions(SECURITY_PURPOSES),
                },
              ]}
            />
          )}
          <QueueSearch searchParam="q" pageParam="page" />
        </div>
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
            searchParams={{ q, purpose }}
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
                  <TableHead>Nature of Visit</TableHead>
                  <TableHead>Card No.</TableHead>
                  <TableHead>Access From</TableHead>
                  <TableHead>Access Until</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Access</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {granted.rows.map(
                  ({
                    provisioning,
                    engagement,
                    person,
                    cycleArchivedAt,
                    latestExtensionAt,
                    latestCardUpdateAt,
                  }) => {
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
                        <TableCell>
                          <NameWithAttention
                            attention={
                              // The card the record holds now; an earlier
                              // cycle's card is history.
                              cycleArchivedAt === null
                                ? pickAttention(
                                    accessState === "TerminationRequested" &&
                                      danger("Revocation requested"),
                                    accessState === "Expired" &&
                                      danger("Access expired"),
                                    hasPendingStayExtension({
                                      cardActivatedAt: provisioning.activatedAt,
                                      latestExtensionAt,
                                      latestCardUpdateAt,
                                    }) &&
                                      success(
                                        "Stay extended — update the card expiry",
                                      ),
                                  )
                                : undefined
                            }
                          >
                            {person.fullName}
                          </NameWithAttention>
                        </TableCell>
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
                        <TableCell className="text-right">
                          <GrantedRowActions
                            engagementId={engagement.id}
                            accessProvisioningId={provisioning.id}
                            personName={person.fullName}
                            currentExpiry={provisioning.accessCardExpiry}
                            departureDate={engagement.departureDate}
                            // The card the record holds now, live or lapsed,
                            // a viewer who can write, and only once a
                            // stakeholder has extended the stay since the card
                            // was issued or last updated.
                            canUpdate={
                              canWrite &&
                              cycleArchivedAt === null &&
                              hasPendingStayExtension({
                                cardActivatedAt: provisioning.activatedAt,
                                latestExtensionAt,
                                latestCardUpdateAt,
                              }) &&
                              isCardExpiryUpdatable({
                                workflowState:
                                  engagement.workflowState as WorkflowState,
                                accessState,
                              })
                            }
                          />
                        </TableCell>
                      </TableRow>
                    );
                  },
                )}
              </TableBody>
            </Table>
          )}
          <QueuePagination
            page={granted.page}
            pageSize={granted.pageSize}
            total={granted.total}
            pageParam="page"
            searchParams={{ q, view, access, purpose }}
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
