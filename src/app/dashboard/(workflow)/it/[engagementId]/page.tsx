import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { ItForm } from "@/components/workflow/it-form";
import { PriorLayersSummary } from "@/components/workflow/prior-layers-summary";
import { requirePinConfirmed } from "@/lib/auth/guards";
import { getDocumentsForEngagement } from "@/lib/services/document-service";
import {
  getAccessProvisioning,
  getEngagementDetail,
  getLatestHospitalClearance,
  getLatestInductionRecord,
} from "@/lib/services/workflow-service";

export default async function ItDetailPage({
  params,
}: {
  params: Promise<{ engagementId: string }>;
}) {
  const { engagementId } = await params;
  const session = await requirePinConfirmed();

  if (!session.workflowRoles.includes("ITStaff")) {
    redirect("/dashboard");
  }

  const detail = await getEngagementDetail(engagementId);

  if (!detail) {
    notFound();
  }

  const { engagement, person, approvals } = detail;

  const [documents, clearance, induction, provisioning] = await Promise.all([
    getDocumentsForEngagement(engagementId),
    getLatestHospitalClearance(engagementId),
    getLatestInductionRecord(engagementId),
    getAccessProvisioning(engagementId),
  ]);

  const isItStaff =
    session.workflowRoles.includes("ITStaff") && session.systemRole !== "Guest";

  const readOnly =
    engagement.workflowState !== "AwaitingProvisioning" || !isItStaff;

  return (
    <div>
      <PageHeader
        title={person.fullName}
        subtitle={`Passport ${person.passportNo}`}
      />
      <div className="flex flex-col gap-6">
        {/* IT is switching access on off the back of other people's sign-offs,
            so those are shown before the form rather than taken on trust. */}
        <PriorLayersSummary
          approval={approvals[0]}
          clearance={clearance}
          induction={induction}
        />
        <ItForm
          engagementId={engagementId}
          uploadedDocuments={documents}
          departureDate={engagement.departureDate}
          provisioning={provisioning}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}
