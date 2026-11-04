import { format, parseISO } from "date-fns";

import { Card } from "@/components/ui/card";
import type { StayExtension } from "@/lib/services/workflow-service";

function formatDate(value: string): string {
  return format(parseISO(value), "dd MMM yyyy");
}

// Every time a stakeholder moved this record's departure date, newest first.
// Read-only history; renders nothing when the stay was never extended.
export function StayExtensionsCard({
  extensions,
}: {
  extensions: StayExtension[];
}) {
  if (extensions.length === 0) return null;

  return (
    <Card className="flex flex-col gap-4 p-6">
      <h2 className="font-semibold text-foreground text-lg">Stay Extensions</h2>
      {extensions.map((extension) => (
        <div
          key={extension.id}
          className="flex flex-col gap-1 border-border border-b pb-4 last:border-0 last:pb-0"
        >
          <span className="text-foreground text-sm">
            {formatDate(extension.previousDepartureDate)} →{" "}
            {formatDate(extension.newDepartureDate)}
          </span>
          <span className="text-muted-foreground text-xs">
            Extended by {extension.extendedByName} ({extension.extendedByRole}),{" "}
            {format(extension.extendedAt, "dd MMM yyyy")}
          </span>
          <span className="whitespace-pre-wrap text-muted-foreground text-sm">
            {extension.reason}
          </span>
        </div>
      ))}
    </Card>
  );
}
