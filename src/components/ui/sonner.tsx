"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={
        resolvedTheme === "light" || resolvedTheme === "dark"
          ? resolvedTheme
          : "system"
      }
      position="top-center"
      className="toaster group"
      icons={{
        success: (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-status-success-bg text-status-success-fg">
            <CircleCheckIcon className="size-3.5" />
          </span>
        ),
        info: (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-status-info-bg text-status-info-fg">
            <InfoIcon className="size-3.5" />
          </span>
        ),
        warning: (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-status-warning-bg text-status-warning-fg">
            <TriangleAlertIcon className="size-3.5" />
          </span>
        ),
        error: (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-status-danger-bg text-status-danger-fg">
            <OctagonXIcon className="size-3.5" />
          </span>
        ),
        loading: (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-status-neutral-bg text-status-neutral-fg">
            <Loader2Icon className="size-3.5 animate-spin" />
          </span>
        ),
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-fit max-w-[90vw] flex-row items-center gap-3 rounded-[var(--radius)] border border-border bg-card p-4 text-card-foreground",
          icon: "m-0 flex size-6 shrink-0 items-center justify-center",
          content: "flex min-w-0 flex-col gap-0.5",
          title:
            "text-sm font-medium leading-normal whitespace-normal break-words text-foreground",
          description:
            "text-sm leading-normal whitespace-normal break-words text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
