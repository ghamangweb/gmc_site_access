import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DocumentPreview } from "@/components/workflow/document-preview";
import {
  HOSPITAL_CLEARANCE_LABELS,
  type HospitalClearanceStatus,
} from "@/lib/domain/types";
import type { Document } from "@/lib/services/document-service";
import type { HospitalClearance } from "@/lib/services/workflow-service";
import { formatQueueDate } from "@/lib/utils";

// Per ui-tokens.md's state → bucket mapping.
const CLEARANCE_BADGE: Record<HospitalClearanceStatus, string> = {
  Fit: "bg-status-success-bg text-status-success-fg",
  FitWithConditions: "bg-status-warning-bg text-status-warning-fg",
  Unfit: "bg-status-danger-bg text-status-danger-fg",
};

// What Hospital hands Training: the decision, the doctor's comments, and the
// fitness form itself. Training was signing off inductions without ever
// seeing the medical it depends on — "Fit with Conditions" in particular is
// meaningless without the conditions.
export function HospitalHandoff({
  clearance,
  documents,
}: {
  clearance: HospitalClearance;
  documents: { document: Document; previewUrl: string | null }[];
}) {
  // SAFETY: clearance_status is a text column written only from the
  // HospitalClearanceStatus union by `recordHospitalClearance`, and the
  // table's check constraint allows nothing else.
  const status = clearance.clearanceStatus as HospitalClearanceStatus;

  return (
    <Card className="flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-foreground text-lg">From Hospital</h2>
        <div className="flex items-center gap-2">
          <Badge className={CLEARANCE_BADGE[status]}>
            {HOSPITAL_CLEARANCE_LABELS[status]}
          </Badge>
          <span className="text-muted-foreground text-xs">
            {formatQueueDate(clearance.clearanceDate)}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1 border-border border-b pb-4">
        <span className="font-medium text-muted-foreground text-xs">
          Doctor&apos;s Comments
        </span>
        <span className="text-foreground text-sm">
          {clearance.doctorComments || "—"}
        </span>
      </div>

      <div className="flex flex-col gap-4">
        <span className="font-medium text-muted-foreground text-xs">
          Fitness Form
        </span>
        {documents.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Hospital recorded the clearance but the fitness form is not attached
            to this record.
          </p>
        ) : (
          <div className="flex flex-wrap gap-6">
            {documents.map(({ document, previewUrl }) => (
              <DocumentPreview
                key={document.id}
                document={document}
                previewUrl={previewUrl}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
