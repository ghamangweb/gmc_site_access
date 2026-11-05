"use client";

import { Download } from "lucide-react";
import { type ReactElement, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ApprovalsExportButton(): ReactElement {
  const [exporting, setExporting] = useState(false);

  async function handleExport(): Promise<void> {
    setExporting(true);

    try {
      const response = await fetch("/api/reports/approvals", {
        cache: "no-store",
      });

      if (
        !response.ok ||
        !response.headers.get("content-type")?.includes("spreadsheetml.sheet")
      ) {
        toast.error("Couldn't export approval records. Please try again.");

        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `approvals-data-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error("[approvals-export]", error);
      toast.error("Couldn't export approval records. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      loading={exporting}
      onClick={handleExport}
    >
      {!exporting && <Download aria-hidden="true" />}
      {exporting ? "Exporting..." : "Export Approvals Data"}
    </Button>
  );
}
