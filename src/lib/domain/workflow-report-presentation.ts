import type { AiReportWorkflow } from "@/lib/domain/ai-report";

type WorkflowReportPresentation = {
  title: string;
  totalLabel: string;
  description: string;
  dateNote: string;
};

export const WORKFLOW_REPORT_PRESENTATION = {
  Reception: {
    title: "Reception",
    totalLabel: "Total records",
    description:
      "Report on submissions and engagements from the selected dates, using their current status. Includes all dashboard tabs.",
    dateNote:
      "Dates include the whole day in Ghana time. Converted submissions count through their engagement.",
  },
  Hospital: {
    title: "Hospital",
    totalLabel: "Total report entries",
    description:
      "Summarise clearance decisions, awaiting clearances and reviews for engagements created within the selected dates. Includes all dashboard tabs.",
    dateNote:
      "Dates select engagement creation in Ghana time. Multiple decisions or reviews can count separately for one person.",
  },
  Training: {
    title: "Training School",
    totalLabel: "Total workflow cycles",
    description:
      "Summarise awaiting, completed and exempted inductions for engagements created within the selected dates. Includes all dashboard tabs.",
    dateNote:
      "Dates select engagement creation in Ghana time. Multiple workflow cycles can count separately for one person.",
  },
  Security: {
    title: "Security",
    totalLabel: "Total engagements",
    description:
      "Summarise access review, issued cards, effective access status and revocations for engagements created within the selected dates. Includes all dashboard tabs.",
    dateNote:
      "Dates select engagement creation in Ghana time. Issued cards include cards that have since expired or are awaiting revocation.",
  },
  Approvals: {
    title: "Approvals",
    totalLabel: "Total approval records",
    description:
      "Summarise pending and recorded approvals for engagements created within the selected dates. Includes the same records you can export across all dashboard tabs.",
    dateNote:
      "Dates select engagement creation in Ghana time. Delegates receive only their own assigned requests and signed approvals.",
  },
} satisfies Record<AiReportWorkflow, WorkflowReportPresentation>;
