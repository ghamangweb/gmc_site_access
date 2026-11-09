import { handleAiReportRequest } from "@/lib/ai-report-request";
import { requireWriteAccess } from "@/lib/auth/guards";
import { buildReportSheets, SECURITY_SHEETS } from "@/lib/domain/report-sheets";
import { SECURITY_REPORT_HEADERS } from "@/lib/domain/security-report";
import { buildReportWorkbook, XLSX_CONTENT_TYPE } from "@/lib/report-workbook";
import { exportSecurityRows } from "@/lib/services/workflow-service";

export async function GET(_request: Request): Promise<Response> {
  try {
    await requireWriteAccess("SecurityStaff");
  } catch {
    return Response.json(
      { success: false, error: "Not authorized" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const workbook = await buildReportWorkbook(
      buildReportSheets(
        SECURITY_REPORT_HEADERS,
        await exportSecurityRows(),
        SECURITY_SHEETS,
      ),
    );
    const date = new Date().toISOString().slice(0, 10);
    return new Response(new Uint8Array(workbook), {
      headers: {
        "Content-Type": XLSX_CONTENT_TYPE,
        "Content-Disposition": `attachment; filename="security-data-${date}.xlsx"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[api/reports/security]", error);
    return Response.json(
      {
        success: false,
        error: "Couldn't export security records. Please try again.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export function POST(request: Request): Promise<Response> {
  return handleAiReportRequest(request, "Security");
}
