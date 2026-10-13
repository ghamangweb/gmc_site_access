import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { HospitalClearanceStatus } from "@/lib/domain/types";
import type {
  HospitalClearance,
  InductionRecord,
  StakeholderApproval,
} from "@/lib/services/workflow-service";

// What the earlier layers decided, read-only. Security audits this before
// forwarding, and IT sees it before switching access on — both are signing off
// on work they did not do, so they need to see it rather than take it on faith.
const CLEARANCE_BADGE: Record<HospitalClearanceStatus, string> = {
  Fit: "bg-status-success-bg text-status-success-fg",
  FitWithConditions: "bg-status-warning-bg text-status-warning-fg",
  Unfit: "bg-status-danger-bg text-status-danger-fg",
};

const CLEARANCE_LABEL: Record<HospitalClearanceStatus, string> = {
  Fit: "Fit",
  FitWithConditions: "Fit with Conditions",
  Unfit: "Unfit",
};

function formatDate(value: Date): string {
  return value.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function PriorLayersSummary({
  approval,
  clearance,
  induction,
}: {
  approval: StakeholderApproval | undefined;
  // Absent for a visit+mine visitor: they never went through Hospital.
  clearance: HospitalClearance | undefined;
  induction: InductionRecord | undefined;
}) {
  // SAFETY: clearance_status is a text column written only from the
  // HospitalClearanceStatus union by `recordHospitalClearance`.
  const clearanceStatus = clearance?.clearanceStatus as
    | HospitalClearanceStatus
    | undefined;

  return (
    <Card className="flex flex-col gap-5 p-6">
      <h2 className="font-semibold text-foreground text-lg">
        Prior Layer Sign-Offs
      </h2>

      <Row label="Stakeholder Approval">
        {approval ? (
          <span className="text-foreground text-sm">
            {approval.approverName}{" "}
            <span className="text-muted-foreground">
              ({approval.approverRole}
              {approval.isDelegated ? ", delegated" : ""}) —{" "}
              {formatDate(approval.approvedAt)}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">Not recorded</span>
        )}
      </Row>

      <Row label="Hospital Clearance">
        {clearance ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Badge
                className={
                  clearanceStatus ? CLEARANCE_BADGE[clearanceStatus] : ""
                }
              >
                {(clearanceStatus && CLEARANCE_LABEL[clearanceStatus]) ??
                  clearance.clearanceStatus}
              </Badge>
              <span className="text-muted-foreground text-xs">
                {formatDate(clearance.clearanceDate)}
              </span>
            </div>
            {clearance.doctorComments && (
              <span className="text-muted-foreground text-sm">
                {clearance.doctorComments}
              </span>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">
            Not applicable — this visitor did not go through Hospital
          </span>
        )}
      </Row>

      <Row label="Induction">
        {induction ? (
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-status-success-bg text-status-success-fg">
                Completed
              </Badge>
              <span className="text-muted-foreground text-xs">
                {formatDate(induction.completedAt)}
              </span>
              {induction.generalSiteInduction && (
                <span className="text-muted-foreground text-xs">
                  · General site induction
                </span>
              )}
              {induction.otherInductions && (
                <span className="text-muted-foreground text-xs">
                  · Other training
                </span>
              )}
            </div>
            {induction.trainerComments && (
              <span className="text-muted-foreground text-sm">
                {induction.trainerComments}
              </span>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">Not recorded</span>
        )}
      </Row>
    </Card>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 border-border border-b pb-4 last:border-0 last:pb-0">
      <span className="font-medium text-muted-foreground text-xs">{label}</span>
      {children}
    </div>
  );
}
