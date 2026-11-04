import { format, parseISO } from "date-fns";

import { Card } from "@/components/ui/card";
import type { CardExpiryUpdate } from "@/lib/services/workflow-service";

function formatDate(value: string): string {
  return format(parseISO(value), "dd MMM yyyy");
}

// Every time Security re-dated this record's card, newest first. Read-only
// history beside `StayExtensionsCard`; renders nothing when there is none.
export function CardExpiryUpdatesCard({
  updates,
}: {
  updates: CardExpiryUpdate[];
}) {
  if (updates.length === 0) return null;

  return (
    <Card className="flex flex-col gap-4 p-6">
      <h2 className="font-semibold text-foreground text-lg">
        Card Expiry Updates
      </h2>
      {updates.map((update) => (
        <div
          key={update.id}
          className="flex flex-col gap-1 border-border border-b pb-4 last:border-0 last:pb-0"
        >
          <span className="text-foreground text-sm">
            {formatDate(update.previousExpiry)} → {formatDate(update.newExpiry)}
          </span>
          <span className="text-muted-foreground text-xs">
            Updated {format(update.updatedAt, "dd MMM yyyy")}
          </span>
          <span className="whitespace-pre-wrap text-muted-foreground text-sm">
            {update.comments}
          </span>
        </div>
      ))}
    </Card>
  );
}
