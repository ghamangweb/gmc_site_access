import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { HospitalHandoff } from "@/components/workflow/hospital-handoff";
import { TrainingForm } from "@/components/workflow/training-form";
import { WorkflowExemptionsSummary } from "@/components/workflow/workflow-exemptions-summary";
import { requirePinConfirmed } from "@/lib/auth/guards";
import { getDocumentsForEngagement } from "@/lib/services/document-service";
import {
  checkHospitalClearanceAge,
  getActiveWorkflowCycle,
  getEngagementDetail,
  getLatestHospitalClearance,
  getLatestInductionRecord,
} from "@/lib/services/workflow-service";

export default async function TrainingDetailPage({
  params,
}: {
  params: Promise<{ engagementId: string }>;
}) {
  const { engagementId } = await params;
  const session = await requirePinConfirmed();

  if (!session.workflowRoles.includes("TrainingStaff")) {
    redirect("/dashboard");
  }

  const detail = await getEngagementDetail(engagementId);

  if (!detail) {
    notFound();
  }

  const { engagement, person, exemptions } = detail;

  const [
    clearance,
    hospitalClearance,
    latestInduction,
    documents,
    activeCycle,
  ] = await Promise.all([
    checkHospitalClearanceAge(engagementId),
    getLatestHospitalClearance(engagementId),
    getLatestInductionRecord(engagementId),
    getDocumentsForEngagement(engagementId),
    getActiveWorkflowCycle(engagementId),
  ]);

  const isTrainingStaff =
    session.workflowRoles.includes("TrainingStaff") &&
    session.systemRole !== "Guest";

  const activeExemptions = exemptions.filter(
    (exemption) => exemption.workflowCycleId === activeCycle?.id,
  );

  const hospitalExempted = activeExemptions.some(
    (exemption) => exemption.stage === "Hospital",
  );

  const readOnly =
    engagement.workflowState !== "AtTraining" ||
    !isTrainingStaff ||
    activeExemptions.some((exemption) => exemption.stage === "Training");

  return (
    <div>
      {/* Identity, what Hospital handed over, then the induction form.
          Training still doesn't review the engagement — that is Reception's
          job — but it cannot sign off an induction without the medical the
          induction depends on. */}
      <PageHeader title={person.fullName} />
      <div className="flex flex-col gap-6">
        {/* A visit+mine visitor never went through Hospital, so there is
            nothing to hand over and the card is not rendered at all. */}
        <WorkflowExemptionsSummary exemptions={activeExemptions} />
        {hospitalClearance && !hospitalExempted && (
          <HospitalHandoff clearance={hospitalClearance} />
        )}
        <TrainingForm
          engagementId={engagementId}
          clearance={clearance}
          latestInduction={latestInduction}
          uploadedDocuments={documents.filter(
            (document) => document.workflowCycleId === activeCycle?.id,
          )}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}
