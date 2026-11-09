"use client";

import { FileText } from "lucide-react";
import { type ReactElement, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { WorkflowReportPreview } from "@/components/workflow/workflow-report-preview";
import {
  type AiReportWorkflow,
  aiReportDataSchema,
  aiReportResponseSchema,
  type GeneratedAiReport,
} from "@/lib/domain/ai-report";
import { AI_REPORT_TIMEOUT_MESSAGE } from "@/lib/domain/ai-report-error";
import { isoToday } from "@/lib/domain/types";
import { WORKFLOW_REPORT_PRESENTATION } from "@/lib/domain/workflow-report-presentation";

type WorkflowReportButtonProps = { workflow: AiReportWorkflow };

export function WorkflowReportButton({
  workflow,
}: WorkflowReportButtonProps): ReactElement {
  const presentation = WORKFLOW_REPORT_PRESENTATION[workflow];
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(() => `${isoToday().slice(0, 8)}01`);
  const [end, setEnd] = useState(isoToday);
  const [generating, setGenerating] = useState(false);

  const [generatedReport, setGeneratedReport] =
    useState<GeneratedAiReport | null>(null);

  const requestPending = useRef(false);
  const today = isoToday();

  const validPeriod = aiReportDataSchema.shape.period.safeParse({
    start,
    end,
  }).success;

  function handleOpenChange(value: boolean): void {
    if (!requestPending.current) setOpen(value);
  }

  async function handleGenerate(): Promise<void> {
    if (requestPending.current) return;

    const period = aiReportDataSchema.shape.period.safeParse({ start, end });

    if (!period.success) {
      toast.error(
        "Choose valid start and end dates, with the end on or after the start.",
      );

      return;
    }

    requestPending.current = true;
    setGenerating(true);

    try {
      const response = await fetch(`/api/reports/${workflow.toLowerCase()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify(period.data),
        signal: AbortSignal.timeout(90_000),
      });

      const parsed = aiReportResponseSchema.safeParse(await response.json());

      if (!parsed.success) {
        throw new Error("Invalid report response");
      }

      if (!parsed.data.success) {
        toast.error(parsed.data.error);

        return;
      }

      if (!response.ok) {
        throw new Error("Report request failed");
      }

      const statistics = parsed.data.data.statistics;

      if (
        statistics.workflow !== workflow ||
        statistics.period.start !== period.data.start ||
        statistics.period.end !== period.data.end
      ) {
        throw new Error(
          "The report does not match the requested workflow or dates",
        );
      }

      setGeneratedReport(parsed.data.data);
      toast.success(`${presentation.title} report generated.`);
    } catch (error) {
      toast.error(
        error instanceof Error &&
          (error.name === "TimeoutError" || error.name === "AbortError")
          ? AI_REPORT_TIMEOUT_MESSAGE
          : `Couldn't generate the ${presentation.title.toLowerCase()} report. Please try again.`,
      );
    } finally {
      requestPending.current = false;
      setGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="h-11">
          <FileText aria-hidden="true" />
          Generate Report
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"
        showCloseButton={!generating}
      >
        <DialogHeader>
          <DialogTitle>Generate {presentation.title} Report</DialogTitle>
          <DialogDescription>{presentation.description}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <fieldset disabled={generating}>
            <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Start date
            </legend>
            <DatePicker
              value={start}
              onChange={(value) => {
                setStart(value);
                setGeneratedReport(null);
              }}
              disabled={generating}
              maxDate={end || today}
              captionLayout="dropdown"
              placeholder="Pick a start date"
            />
          </fieldset>
          <fieldset disabled={generating}>
            <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              End date
            </legend>
            <DatePicker
              value={end}
              onChange={(value) => {
                setEnd(value);
                setGeneratedReport(null);
              }}
              disabled={generating}
              minDate={start}
              maxDate={today}
              captionLayout="dropdown"
              placeholder="Pick an end date"
            />
          </fieldset>
        </div>

        <output className="block text-sm text-muted-foreground">
          {generating
            ? "Generating your report. Please wait."
            : generatedReport
              ? "Report generated. Review the summary alongside the recorded statistics."
              : presentation.dateNote}
        </output>

        {generatedReport && <WorkflowReportPreview result={generatedReport} />}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={generating}
            onClick={() => handleOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            loading={generating}
            disabled={!validPeriod}
            onClick={handleGenerate}
          >
            {generating ? "Generating..." : "Generate Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
