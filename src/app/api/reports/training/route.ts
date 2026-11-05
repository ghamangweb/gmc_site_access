import { requireWriteAccess } from "@/lib/auth/guards";
import { buildReportSheets, TRAINING_SHEETS } from "@/lib/domain/report-sheets";
import { TRAINING_REPORT_HEADERS } from "@/lib/domain/training-report";
import { buildReportWorkbook, XLSX_CONTENT_TYPE } from "@/lib/report-workbook";
import { exportTrainingRows } from "@/lib/services/workflow-service";

export async function GET(_request: Request): Promise<Response> {
  try {
    await requireWriteAccess("TrainingStaff");
  } catch {
    return Response.json(
      { success: false, error: "Not authorized" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const workbook = await buildReportWorkbook(
      buildReportSheets(
        TRAINING_REPORT_HEADERS,
        await exportTrainingRows(),
        TRAINING_SHEETS,
      ),
    );
    const date = new Date().toISOString().slice(0, 10);

    return new Response(new Uint8Array(workbook), {
      headers: {
        "Content-Type": XLSX_CONTENT_TYPE,
        "Content-Disposition": `attachment; filename="training-data-${date}.xlsx"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[api/reports/training]", error);

    return Response.json(
      {
        success: false,
        error: "Couldn't export training records. Please try again.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
