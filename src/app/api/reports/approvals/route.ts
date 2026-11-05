import { requirePinConfirmed } from "@/lib/auth/guards";
import { STAKEHOLDER_ROLES } from "@/lib/domain/types";
import {
  countEngagementsAwaitingApproval,
  countStakeholderApprovalsBy,
  exportApprovalsCsv,
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
    const csv = await exportApprovalsCsv(delegatedTo);
    const date = new Date().toISOString().slice(0, 10);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="approvals-report-${date}.csv"`,
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
