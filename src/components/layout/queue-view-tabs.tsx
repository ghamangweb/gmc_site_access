import Link from "next/link";

import { Button } from "@/components/ui/button";

export type QueueView = {
  label: string;
  value: string;
  href: string;
  /** Outstanding work on that tab. Hidden at zero — a pill reading "0" is
   * noise, not information. */
  count?: number;
};

type QueueViewTabsProps = {
  views: QueueView[];
  activeView: string;
};

// The segmented switch Reception has always used, lifted out of that page so
// every workflow layer shows its two queues the same way: one table at a
// time, chosen by a `view` search param, rather than two stacked tables
// competing for the screen.
export function QueueViewTabs({ views, activeView }: QueueViewTabsProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border p-1">
      {views.map((view) => (
        <Button
          key={view.value}
          asChild
          size="sm"
          variant={activeView === view.value ? "default" : "ghost"}
        >
          <Link href={view.href}>
            {view.label}
            {view.count !== undefined && view.count > 0 && (
              <span className="text-xs opacity-70">{view.count}</span>
            )}
          </Link>
        </Button>
      ))}
    </div>
  );
}
