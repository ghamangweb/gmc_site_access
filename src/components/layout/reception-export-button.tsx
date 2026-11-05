"use client";

import { Download } from "lucide-react";
import { type ReactElement, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ReceptionExportButton(): ReactElement {
  const [exporting, setExporting] = useState(false);

  async function handleExport(): Promise<void> {
    setExporting(true);

    try {
      const response = await fetch("/api/reports/reception", {
        cache: "no-store",
      });

      if (
        !response.ok ||
        !response.headers.get("content-type")?.startsWith("text/csv")
      ) {
        toast.error("Couldn't export reception records. Please try again.");

        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `reception-report-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error("[reception-export]", error);
      toast.error("Couldn't export reception records. Please try again.");
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
      {exporting ? "Exporting..." : "Export Reception Report"}
    </Button>
  );
}
