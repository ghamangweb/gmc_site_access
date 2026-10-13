import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { HospitalHandoff } from "@/components/workflow/hospital-handoff";
import { TrainingForm } from "@/components/workflow/training-form";
import { requirePinConfirmed } from "@/lib/auth/guards";
import { getDocumentsForEngagement } from "@/lib/services/document-service";
import {
  checkHospitalClearanceAge,
  getEngagementDetail,
  getLatestHospitalClearance,
  getLatestInductionRecord,
} from "@/lib/services/workflow-service";
import { getSignedFileUrl } from "@/lib/uploadthing/api";

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

  const [documents, clearance, hospitalClearance, latestInduction] =
    await Promise.all([
      getDocumentsForEngagement(engagementId),
      checkHospitalClearanceAge(engagementId),
      getLatestHospitalClearance(engagementId),
      getLatestInductionRecord(engagementId),
    ]);

  // The medical Hospital signed off on. A visit+mine visitor never went
  // through Hospital, so there is nothing to hand over and the card is not
  // rendered at all.
  const fitnessForms = await Promise.all(
    documents
      .filter((document) => document.docType === "hospital_fitness_form")
      .map(async (document) => {
        try {
          return {
            document,
            previewUrl: await getSignedFileUrl(document.fileKey),
          };
        } catch (error) {
          console.error("[training/:engagementId] preview url", error);

          return { document, previewUrl: null };
        }
      }),
  );

  const isTrainingStaff =
    session.workflowRoles.includes("TrainingStaff") &&
    session.systemRole !== "Guest";

  const readOnly =
    engagement.workflowState !== "AtTraining" || !isTrainingStaff;

  return (
    <div>
      {/* Identity, what Hospital handed over, then the induction form.
          Training still doesn't review the engagement — that is Reception's
          job — but it cannot sign off an induction without the medical the
          induction depends on. */}
      <PageHeader
        title={person.fullName}
        subtitle={`Passport ${person.passportNo}`}
      />
      <div className="flex flex-col gap-6">
        {hospitalClearance && (
          <HospitalHandoff
            clearance={hospitalClearance}
            documents={fitnessForms}
          />
        )}
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
