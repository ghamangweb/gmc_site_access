import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { TrainingForm } from "@/components/workflow/training-form";
import { requirePinConfirmed } from "@/lib/auth/guards";
import { getDocumentsForEngagement } from "@/lib/services/document-service";
import {
  checkHospitalClearanceAge,
  getEngagementDetail,
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

  const { engagement, person } = detail;

  const [documents, clearance, latestInduction] = await Promise.all([
    getDocumentsForEngagement(engagementId),
    checkHospitalClearanceAge(engagementId),
    getLatestInductionRecord(engagementId),
  ]);

  const isTrainingStaff =
    session.workflowRoles.includes("TrainingStaff") &&
    session.systemRole !== "Guest";

  const readOnly =
    engagement.workflowState !== "AtTraining" || !isTrainingStaff;

  return (
    <div>
      {/* Identity only, as at Hospital: Training records an induction, it
          doesn't review the engagement. */}
      <PageHeader
        title={person.fullName}
        subtitle={`Passport ${person.passportNo}`}
      />
      <div className="flex flex-col gap-6">
        <TrainingForm
          engagementId={engagementId}
          uploadedDocuments={documents}
          clearance={clearance}
          latestInduction={latestInduction}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}
