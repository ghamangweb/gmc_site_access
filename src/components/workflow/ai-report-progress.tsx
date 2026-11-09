"use client";

import { Sparkles } from "lucide-react";
import { type ReactElement, useEffect, useState } from "react";

import { cn } from "@/lib/utils";

// The server does these in this order: collect the figures, have the AI
// analyse them, return the written report.
const STEPS = [
  "Collecting the recorded statistics",
  "Analysing the figures with AI",
  "Writing the report",
] as const;

const STEP_MS = 2500;

/** Text with a highlight sweeping across it while AI is working. */
export function AiShimmerText({
  children,
  className,
}: {
  children: string;
  className?: string;
}): ReactElement {
  return (
    <span
      className={cn(
        "animate-shimmer bg-linear-to-r bg-size-[200%_100%] bg-clip-text text-transparent motion-reduce:animate-none",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Shown in the report dialog while the AI writes the report. */
export function AiReportProgress(): ReactElement {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setStep((current) => Math.min(current + 1, STEPS.length - 1)),
      STEP_MS,
    );

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles
          aria-hidden="true"
          className="size-4 animate-pulse text-primary motion-reduce:animate-none"
        />
        <AiShimmerText className="from-muted-foreground via-primary to-muted-foreground">
          {`${STEPS[step]}...`}
        </AiShimmerText>
      </div>
      <div aria-hidden="true" className="space-y-2.5">
        {["w-full", "w-11/12", "w-4/5", "w-2/3"].map((width) => (
          <div
            key={width}
            className={cn(
              "h-3 animate-shimmer rounded-full bg-linear-to-r from-muted via-primary/15 to-muted bg-size-[200%_100%] motion-reduce:animate-none",
              width,
            )}
          />
        ))}
      </div>
    </div>
  );
}
