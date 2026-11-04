import { Card } from "@/components/ui/card";
import { WorkflowExemptionNotice } from "@/components/workflow/workflow-exemption-notice";
import { WORKFLOW_EXEMPTION_STAGE_LABELS } from "@/lib/domain/types";
import type { WorkflowExemptionDetails } from "@/lib/services/workflow-service";

type WorkflowExemptionsSummaryProps = {
  exemptions: WorkflowExemptionDetails[];
};

export function WorkflowExemptionsSummary({
  exemptions,
}: WorkflowExemptionsSummaryProps) {
  if (exemptions.length === 0) return null;

  return (
    <Card className="flex flex-col gap-5 p-6">
      <h2 className="text-lg font-semibold text-foreground">
        Workflow Exemptions
      </h2>
      {exemptions.map((exemption) => (
        <div
          key={exemption.id}
          className="flex flex-col gap-2 border-b border-border pb-4 last:border-0 last:pb-0"
        >
          <h3 className="text-sm font-medium text-foreground">
            {WORKFLOW_EXEMPTION_STAGE_LABELS[exemption.stage]}
          </h3>
          <p className="text-xs text-muted-foreground">
            Cycle {exemption.cycleNumber} ·{" "}
            {exemption.archivedAt ? "Previous cycle" : "Current cycle"}
          </p>
          <WorkflowExemptionNotice exemption={exemption} />
        </div>
      ))}
    </Card>
  );
}
