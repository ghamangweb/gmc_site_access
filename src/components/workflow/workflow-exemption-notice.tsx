import { Badge } from "@/components/ui/badge";
import type { WorkflowExemptionDetails } from "@/lib/services/workflow-service";

type WorkflowExemptionNoticeProps = {
  exemption: WorkflowExemptionDetails;
};

export function WorkflowExemptionNotice({
  exemption,
}: WorkflowExemptionNoticeProps) {
  return (
    <div className="flex flex-col gap-2">
      <Badge className="w-fit bg-status-warning-bg text-status-warning-fg">
        Exempted
      </Badge>
      <p className="whitespace-pre-wrap text-sm text-foreground">
        {exemption.reason}
      </p>
      <p className="text-xs text-muted-foreground">
        Approved by {exemption.approverName} ({exemption.approverRole}) on{" "}
        <time dateTime={exemption.approvedAt.toISOString()}>
          {exemption.approvedAt.toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "UTC",
          })}{" "}
          UTC
        </time>
      </p>
    </div>
  );
}
