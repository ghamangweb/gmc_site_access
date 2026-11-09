"use client";

import { Download, Sparkles } from "lucide-react";
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
import {
  AiReportProgress,
  AiShimmerText,
} from "@/components/workflow/ai-report-progress";
import { WorkflowReportPreview } from "@/components/workflow/workflow-report-preview";
import {
  type AiReportWorkflow,
  aiReportDataSchema,
  aiReportResponseSchema,
  type GeneratedAiReport,
} from "@/lib/domain/ai-report";
import { AI_REPORT_TIMEOUT_MESSAGE } from "@/lib/domain/ai-report-error";
import { reportDocument, reportFileName } from "@/lib/domain/report-document";
import { isoToday } from "@/lib/domain/types";
import { WORKFLOW_REPORT_PRESENTATION } from "@/lib/domain/workflow-report-presentation";

type WorkflowReportButtonProps = { workflow: AiReportWorkflow };

type ReportFormat = "docx" | "pdf";

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

  const [downloading, setDownloading] = useState<ReportFormat | null>(null);

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

  async function handleDownload(format: ReportFormat): Promise<void> {
    if (!generatedReport || downloading) return;

    setDownloading(format);

    try {
      // Loaded on demand so the document libraries stay out of the dashboard bundle.
      const [{ loadReportLogo, saveReportFile }, builder] = await Promise.all([
        import("@/lib/report-document-style"),
        format === "docx"
          ? import("@/lib/report-docx").then((module) => module.buildReportDocx)
          : import("@/lib/report-pdf").then((module) => module.buildReportPdf),
      ]);

      const blob = await builder(
        reportDocument(generatedReport),
        await loadReportLogo(),
      );

      saveReportFile(blob, reportFileName(generatedReport.statistics, format));
    } catch (error) {
      console.error("[workflow-report-download]", error);
      toast.error(
        `Couldn't create the ${format.toUpperCase()} file. Please try again.`,
      );
    } finally {
      setDownloading(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="h-11">
          <Sparkles aria-hidden="true" className="text-primary" />
          Generate Report
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"
        showCloseButton={!generating}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles aria-hidden="true" className="size-5 text-primary" />
            Generate {presentation.title} Report
          </DialogTitle>
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

        <output
          className={
            generating ? "sr-only" : "block text-sm text-muted-foreground"
          }
        >
          {generating
            ? "AI is generating your report. Please wait."
            : generatedReport
              ? "Report generated with AI. Review the summary alongside the recorded statistics."
              : presentation.dateNote}
        </output>

        {generating && <AiReportProgress />}

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
          {generatedReport ? (
            <>
              <Button
                type="button"
                variant="outline"
                loading={downloading === "docx"}
                disabled={downloading !== null}
                onClick={() => handleDownload("docx")}
              >
                {downloading !== "docx" && <Download aria-hidden="true" />}
                Download DOCX
              </Button>
              <Button
                type="button"
                loading={downloading === "pdf"}
                disabled={downloading !== null}
                onClick={() => handleDownload("pdf")}
              >
                {downloading !== "pdf" && <Download aria-hidden="true" />}
                Download PDF
              </Button>
            </>
          ) : (
            // No spinner while generating: the sparkles pulse and the label
            // shimmers, so it reads as the AI working. handleGenerate already
            // ignores repeat clicks; `disabled` would dim it to half opacity.
            <Button
              type="button"
              disabled={!validPeriod}
              aria-busy={generating || undefined}
              aria-disabled={generating || undefined}
              className={generating ? "pointer-events-none" : undefined}
              onClick={handleGenerate}
            >
              <Sparkles
                aria-hidden="true"
                className={
                  generating
                    ? "animate-pulse motion-reduce:animate-none"
                    : undefined
                }
              />
              {generating ? (
                <AiShimmerText className="from-primary-foreground/60 via-primary-foreground to-primary-foreground/60">
                  Generating...
                </AiShimmerText>
              ) : (
                "Generate Report"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
