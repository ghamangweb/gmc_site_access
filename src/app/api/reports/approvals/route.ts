import { handleAiReportRequest } from "@/lib/ai-report-request";
import { requirePinConfirmed } from "@/lib/auth/guards";
import { APPROVALS_REPORT_HEADERS } from "@/lib/domain/approvals-report";
import {
  APPROVALS_SHEETS,
  buildReportSheets,
} from "@/lib/domain/report-sheets";
import { STAKEHOLDER_ROLES } from "@/lib/domain/types";
import { buildReportWorkbook, XLSX_CONTENT_TYPE } from "@/lib/report-workbook";
import {
  countEngagementsAwaitingApproval,
  countStakeholderApprovalsBy,
  exportApprovalsRows,
} from "@/lib/services/workflow-service";

export async function GET(_request: Request): Promise<Response> {
  let delegatedTo: string | undefined;

  try {
    const session = await requirePinConfirmed();

    if (session.systemRole === "Guest" || session.systemRole === "User")
      throw new Error("Write access required");

    const isStakeholder = STAKEHOLDER_ROLES.some((role) =>
      session.workflowRoles.includes(role),
    );

    if (!isStakeholder) {
      delegatedTo = session.staffUserId;

      const [pending, signed] = await Promise.all([
        countEngagementsAwaitingApproval(delegatedTo),
        countStakeholderApprovalsBy(delegatedTo),
      ]);

      if (pending === 0 && signed === 0)
        throw new Error("Approval access required");
    }
  } catch {
    return Response.json(
      { success: false, error: "Not authorized" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const workbook = await buildReportWorkbook(
      buildReportSheets(
        APPROVALS_REPORT_HEADERS,
        await exportApprovalsRows(delegatedTo),
        APPROVALS_SHEETS,
      ),
    );
    const date = new Date().toISOString().slice(0, 10);

    return new Response(new Uint8Array(workbook), {
      headers: {
        "Content-Type": XLSX_CONTENT_TYPE,
        "Content-Disposition": `attachment; filename="approvals-data-${date}.xlsx"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[api/reports/approvals]", error);

    return Response.json(
      {
        success: false,
        error: "Couldn't export approval records. Please try again.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export function POST(request: Request): Promise<Response> {
  return handleAiReportRequest(request, "Approvals");
}
