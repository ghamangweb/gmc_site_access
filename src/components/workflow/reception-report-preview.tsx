import type { ReactElement } from "react";
import { WorkflowReportPreview } from "@/components/workflow/workflow-report-preview";
import type { GeneratedAiReport } from "@/lib/domain/ai-report";

type ReceptionReportPreviewProps = { result: GeneratedAiReport };

export function ReceptionReportPreview({
  result,
}: ReceptionReportPreviewProps): ReactElement {
  return <WorkflowReportPreview result={result} />;
}
