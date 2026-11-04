import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { HospitalForm } from "@/components/workflow/hospital-form";
import { WorkflowExemptionsSummary } from "@/components/workflow/workflow-exemptions-summary";
import { requirePinConfirmed } from "@/lib/auth/guards";
import type { HospitalClearanceStatus } from "@/lib/domain/types";
import {
  getEngagementDetail,
  getLatestHospitalClearance,
} from "@/lib/services/workflow-service";

export default async function HospitalDetailPage({
  params,
}: {
  params: Promise<{ engagementId: string }>;
}) {
  const { engagementId } = await params;
  const session = await requirePinConfirmed();

  if (!session.workflowRoles.includes("HospitalStaff")) {
    redirect("/dashboard");
  }

  const detail = await getEngagementDetail(engagementId);
  if (!detail) {
    notFound();
  }

  const { engagement, person, exemptions } = detail;

  const activeExemptions = exemptions.filter(
    (exemption) => exemption.archivedAt === null,
  );

  const hospitalExempted = activeExemptions.some(
    (exemption) => exemption.stage === "Hospital",
  );

  const latestClearance = await getLatestHospitalClearance(engagementId);

  const isHospitalStaff =
    session.workflowRoles.includes("HospitalStaff") &&
    session.systemRole !== "Guest";

  const readOnly =
    engagement.workflowState !== "AtHospital" ||
    !isHospitalStaff ||
    hospitalExempted;

  return (
    <div>
      {/* Identity only: Hospital records a clearance, it doesn't review the
          engagement. The full record lives with Reception. */}
      <PageHeader
        title={person.fullName}
        subtitle={`Passport ${person.passportNo}`}
      />
      <div className="flex flex-col gap-6">
        <WorkflowExemptionsSummary exemptions={activeExemptions} />
        <HospitalForm
          engagementId={engagementId}
          latestClearance={
            latestClearance && !hospitalExempted
              ? {
                  clearanceStatus:
                    latestClearance.clearanceStatus as HospitalClearanceStatus,
                  doctorComments: latestClearance.doctorComments,
                  clearanceDate: latestClearance.clearanceDate,
                }
              : undefined
          }
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}
