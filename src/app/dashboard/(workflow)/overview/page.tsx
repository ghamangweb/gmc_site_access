import { UsersRound } from "lucide-react";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { QueuePagination } from "@/components/layout/queue-pagination";
import { QueueSearch } from "@/components/layout/queue-search";
import { Badge } from "@/components/ui/badge";
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
import { danger, pickAttention } from "@/lib/domain/attention";
import { toPageRequest } from "@/lib/domain/pagination";
import {
  ACCESS_PURPOSE_LABELS,
  ACCESS_STATE_LABELS,
  type AccessPurpose,
  type AccessState,
  canViewRecords,
  getEffectiveAccessState,
  HOSPITAL_CLEARANCE_LABELS,
  type HospitalClearanceStatus,
  WORKFLOW_STATE_LABELS,
  type WorkflowState,
} from "@/lib/domain/types";
import {
  listRecordsOverview,
  type RecordOverviewRow,
} from "@/lib/services/workflow-service";

// Per ui-tokens.md's state → bucket mapping, same classes as the layer
// queues. An exemption is a warning: the stage was skipped on a stakeholder's
// say-so, not passed.
const WORKFLOW_STATE_BADGE: Record<WorkflowState, string> = {
  Draft: "bg-status-neutral-bg text-status-neutral-fg",
  AtReception: "bg-status-info-bg text-status-info-fg",
  AtHospital: "bg-status-info-bg text-status-info-fg",
  AtTraining: "bg-status-info-bg text-status-info-fg",
  AtSecurity: "bg-status-info-bg text-status-info-fg",
  Completed: "bg-status-success-bg text-status-success-fg",
  Cancelled: "bg-status-danger-bg text-status-danger-fg",
};

const CLEARANCE_BADGE: Record<HospitalClearanceStatus, string> = {
  Fit: "bg-status-success-bg text-status-success-fg",
  FitWithConditions: "bg-status-warning-bg text-status-warning-fg",
  Unfit: "bg-status-danger-bg text-status-danger-fg",
};

const ACCESS_STATE_BADGE: Record<AccessState, string> = {
  Pending: "bg-status-neutral-bg text-status-neutral-fg",
  Active: "bg-status-success-bg text-status-success-fg",
  TerminationRequested: "bg-status-warning-bg text-status-warning-fg",
  Expired: "bg-status-danger-bg text-status-danger-fg",
  Terminated: "bg-status-danger-bg text-status-danger-fg",
};

const EXEMPTED_BADGE = "bg-status-warning-bg text-status-warning-fg";

// Which layers a nature of visit goes through: work paths see Hospital and
// Training, a mine tour only Training, a familiarization visit neither. The
// paths through Training are also the ones that end with Security issuing a
// card. A stage a visit never goes through is left empty, not marked.
const HOSPITAL_PATHS: AccessPurpose[] = ["Work", "WorkMine"];
const TRAINING_PATHS: AccessPurpose[] = ["Work", "WorkMine", "VisitMine"];
const CARD_PATHS = TRAINING_PATHS;

// A stage the visit does go through, with nothing recorded yet. The same
// neutral badge as the Access column's Pending, so every column reads alike.
function Pending() {
  return <Badge className={ACCESS_STATE_BADGE.Pending}>Pending</Badge>;
}

function MedicalCell({
  row,
  purpose,
}: {
  row: RecordOverviewRow;
  purpose: AccessPurpose;
}) {
  if (row.exemptedStages.includes("Hospital")) {
    return <Badge className={EXEMPTED_BADGE}>Exempted</Badge>;
  }
  if (row.clearanceStatus) {
    return (
      <Badge className={CLEARANCE_BADGE[row.clearanceStatus]}>
        {HOSPITAL_CLEARANCE_LABELS[row.clearanceStatus]}
      </Badge>
    );
  }
  return HOSPITAL_PATHS.includes(purpose) ? <Pending /> : null;
}

function InductionCell({
  row,
  purpose,
}: {
  row: RecordOverviewRow;
  purpose: AccessPurpose;
}) {
  if (row.exemptedStages.includes("Training")) {
    return <Badge className={EXEMPTED_BADGE}>Exempted</Badge>;
  }
  if (row.inductionCompleted) {
    return (
      <Badge className="bg-status-success-bg text-status-success-fg">
        Completed
      </Badge>
    );
  }
  return TRAINING_PATHS.includes(purpose) ? <Pending /> : null;
}

// HSE and plain Guests: one read-only table of every record. No row opens a
// record page and nothing here acts on anything — they are notified as the
// layers finish, and this is where they see where each record stands.
export default async function RecordsOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await requirePinConfirmed();

  if (!canViewRecords(session)) {
    redirect("/dashboard");
  }

  const { q, page } = await searchParams;
  const records = await listRecordsOverview(toPageRequest(q, page));

  return (
    <div>
      <PageHeader
        title="Site Access Records"
        subtitle="Where every record stands, and what each stage has recorded."
      />

      <div className="mb-4 flex flex-wrap items-center justify-end gap-4">
        <QueueSearch
          searchParam="q"
          pageParam="page"
          placeholder="Search records"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {records.rows.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title="No records yet"
            description="Records appear here once Reception registers a visitor."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Nature of Visit</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Medical</TableHead>
                <TableHead>Induction</TableHead>
                <TableHead>Access</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.rows.map((row) => {
                const { engagement, person } = row;
                // SAFETY: access_purpose, workflow_state and access_state are
                // text columns written only from their unions.
                const purpose = engagement.accessPurpose as AccessPurpose;
                const workflowState = engagement.workflowState as WorkflowState;
                const accessState = getEffectiveAccessState(
                  engagement.accessState as AccessState,
                  row.accessCardExpiry,
                );

                return (
                  <TableRow key={engagement.id}>
                    <TableCell>
                      <NameWithAttention
                        attention={pickAttention(
                          accessState === "TerminationRequested" &&
                            danger("Revocation requested"),
                          row.clearanceStatus === "Unfit" &&
                            !row.exemptedStages.includes("Hospital") &&
                            danger("Marked Unfit"),
                          accessState === "Expired" && danger("Access expired"),
                        )}
                      >
                        {person.fullName}
                      </NameWithAttention>
                    </TableCell>
                    <TableCell>
                      {ACCESS_PURPOSE_LABELS[purpose] ??
                        engagement.accessPurpose}
                    </TableCell>
                    <TableCell>
                      <Badge className={WORKFLOW_STATE_BADGE[workflowState]}>
                        {WORKFLOW_STATE_LABELS[workflowState]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <MedicalCell row={row} purpose={purpose} />
                    </TableCell>
                    <TableCell>
                      <InductionCell row={row} purpose={purpose} />
                    </TableCell>
                    <TableCell>
                      {/* A familiarization visit never gets a card, so its
                          access stays empty rather than reading Pending. */}
                      {CARD_PATHS.includes(purpose) && (
                        <Badge className={ACCESS_STATE_BADGE[accessState]}>
                          {ACCESS_STATE_LABELS[accessState]}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        <QueuePagination
          page={records.page}
          pageSize={records.pageSize}
          total={records.total}
          pageParam="page"
          searchParams={{ q }}
        />
      </div>
    </div>
  );
}
