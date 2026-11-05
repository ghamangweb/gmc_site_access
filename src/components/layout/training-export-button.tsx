"use client";

import { Download } from "lucide-react";
import { type ReactElement, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function TrainingExportButton(): ReactElement {
  const [exporting, setExporting] = useState(false);

  async function handleExport(): Promise<void> {
    setExporting(true);

    try {
      const response = await fetch("/api/reports/training", {
        cache: "no-store",
      });

      if (
        !response.ok ||
        !response.headers.get("content-type")?.includes("spreadsheetml.sheet")
      ) {
        toast.error("Couldn't export training records. Please try again.");

        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `training-data-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error("[training-export]", error);
      toast.error("Couldn't export training records. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      // Matches the filter button and search box it sits beside.
      className="h-11"
      loading={exporting}
      onClick={handleExport}
    >
      {!exporting && <Download aria-hidden="true" />}
      {exporting ? "Exporting..." : "Export Data"}
    </Button>
  );
}
