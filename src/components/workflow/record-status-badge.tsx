import { Badge } from "@/components/ui/badge";
import type { RecordStatus } from "@/lib/domain/record-status";
import {
  ACCESS_STATE_LABELS,
  type AccessState,
  WORKFLOW_STATE_LABELS,
  type WorkflowState,
} from "@/lib/domain/types";

// Per ui-tokens.md's state → bucket mapping, the same classes the layer
// queues and the Site Access Records overview use.
const WORKFLOW_STATE_BADGE: Record<WorkflowState, string> = {
  Draft: "bg-status-neutral-bg text-status-neutral-fg",
  AtReception: "bg-status-info-bg text-status-info-fg",
  AtHospital: "bg-status-info-bg text-status-info-fg",
  AtTraining: "bg-status-info-bg text-status-info-fg",
  AtSecurity: "bg-status-info-bg text-status-info-fg",
  Completed: "bg-status-success-bg text-status-success-fg",
  Cancelled: "bg-status-danger-bg text-status-danger-fg",
};

const ACCESS_STATE_BADGE: Record<AccessState, string> = {
  Pending: "bg-status-neutral-bg text-status-neutral-fg",
  Active: "bg-status-success-bg text-status-success-fg",
  TerminationRequested: "bg-status-warning-bg text-status-warning-fg",
  Expired: "bg-status-danger-bg text-status-danger-fg",
  Terminated: "bg-status-danger-bg text-status-danger-fg",
};

// A record's stage while it is in progress, its card's state once completed.
export function RecordStatusBadge({ status }: { status: RecordStatus }) {
  return status.kind === "access" ? (
    <Badge className={ACCESS_STATE_BADGE[status.state]}>
      {ACCESS_STATE_LABELS[status.state]}
    </Badge>
  ) : (
    <Badge className={WORKFLOW_STATE_BADGE[status.state]}>
      {WORKFLOW_STATE_LABELS[status.state]}
    </Badge>
  );
}
