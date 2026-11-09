import { requirePinConfirmed, requireWriteAccess } from "@/lib/auth/guards";
import {
  type AiReportPeriod,
  type AiReportWorkflow,
  aiReportDataSchema,
} from "@/lib/domain/ai-report";
import { AiReportTimeoutError } from "@/lib/domain/ai-report-error";
import { STAKEHOLDER_ROLES, type WorkflowRole } from "@/lib/domain/types";
import { generateReceptionAiReport } from "@/lib/services/reception-ai-report-service";
import { generateWorkflowAiReport } from "@/lib/services/workflow-ai-report-service";
import {
  countEngagementsAwaitingApproval,
  countStakeholderApprovalsBy,
} from "@/lib/services/workflow-service";

const REPORT_ROLES = {
  Reception: "Receptionist",
  Hospital: "HospitalStaff",
  Training: "TrainingStaff",
  Security: "SecurityStaff",
} satisfies Record<Exclude<AiReportWorkflow, "Approvals">, WorkflowRole>;

export async function handleAiReportRequest(
  request: Request,
  workflow: AiReportWorkflow,
): Promise<Response> {
  const headers = {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };

  let delegatedApproverId: string | undefined;

  try {
    if (workflow === "Approvals") {
      const session = await requirePinConfirmed();

      if (session.systemRole === "Guest" || session.systemRole === "User") {
        throw new Error("Write access required");
      }

      if (
        !STAKEHOLDER_ROLES.some((role) => session.workflowRoles.includes(role))
      ) {
        delegatedApproverId = session.staffUserId;

        const [pending, signed] = await Promise.all([
          countEngagementsAwaitingApproval(delegatedApproverId),
          countStakeholderApprovalsBy(delegatedApproverId),
        ]);

        if (pending === 0 && signed === 0)
          throw new Error("Approval access required");
      }
    } else {
      await requireWriteAccess(REPORT_ROLES[workflow]);
    }
  } catch {
    return Response.json(
      { success: false, error: "Not authorized" },
      { status: 403, headers },
    );
  }

  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return Response.json(
      {
        success: false,
        error: "Report requests must come from this application.",
      },
      { status: 403, headers },
    );
  }

  const contentType = request.headers
    .get("content-type")
    ?.split(";")[0]
    .trim()
    .toLowerCase();

  if (contentType !== "application/json") {
    return Response.json(
      { success: false, error: "Send the report dates as JSON." },
      { status: 415, headers },
    );
  }

  let period: AiReportPeriod;

  try {
    const parsed = aiReportDataSchema.shape.period.safeParse(
      await request.json(),
    );

    if (!parsed.success) {
      return Response.json(
        {
          success: false,
          error:
            "Choose valid start and end dates, with the end on or after the start.",
        },
        { status: 400, headers },
      );
    }

    period = parsed.data;
  } catch {
    return Response.json(
      { success: false, error: "The report request contains invalid JSON." },
      { status: 400, headers },
    );
  }

  try {
    const data =
      workflow === "Reception"
        ? await generateReceptionAiReport(period)
        : await generateWorkflowAiReport(workflow, period, delegatedApproverId);

    return Response.json({ success: true, data }, { headers });
  } catch (error) {
    if (error instanceof AiReportTimeoutError) {
      return Response.json(
        { success: false, error: error.message },
        { status: 504, headers },
      );
    }

    // Export/SDK errors may contain personal data or credentials; never log their payloads.
    console.error(
      `[api/reports/${workflow.toLowerCase()}] AI generation failed`,
      error instanceof Error ? error.name : "Unknown error",
    );

    return Response.json(
      {
        success: false,
        error: `Couldn't generate the ${workflow.toLowerCase()} report. Please try again.`,
      },
      { status: 500, headers },
    );
  }
}
