import { requireWriteAccess } from "@/lib/auth/guards";
import { exportTrainingCsv } from "@/lib/services/workflow-service";

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
    const csv = await exportTrainingCsv();
    const date = new Date().toISOString().slice(0, 10);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="training-report-${date}.csv"`,
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
