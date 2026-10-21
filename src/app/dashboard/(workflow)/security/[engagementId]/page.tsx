import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { AccessActivationForm } from "@/components/workflow/access-activation-form";
import { PriorLayersSummary } from "@/components/workflow/prior-layers-summary";
import { ReceptionDetailsPreview } from "@/components/workflow/reception-details-preview";
import type { ReceptionFormValues } from "@/components/workflow/reception-form";
import { requirePinConfirmed } from "@/lib/auth/guards";
import type { AccessPurpose, ReceptionData } from "@/lib/domain/types";
import { getDocumentsForEngagement } from "@/lib/services/document-service";
import {
  getAccessProvisioning,
  getEngagementDetail,
  getLatestHospitalClearance,
  getLatestInductionRecord,
} from "@/lib/services/workflow-service";

export default async function SecurityDetailPage({
  params,
}: {
  params: Promise<{ engagementId: string }>;
}) {
  const { engagementId } = await params;
  const session = await requirePinConfirmed();

  if (!session.workflowRoles.includes("SecurityStaff")) {
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

  // SAFETY: reception_data is jsonb written only from the Reception form's own
  // values; anything missing renders as "—" in the preview.
  const receptionData = engagement.receptionData as ReceptionData;

  const previewValues: Partial<ReceptionFormValues> = {
    passportNo: person.passportNo,
    fullName: person.fullName,
    dateOfBirth: person.dateOfBirth,
    gender: person.gender,
    nationality: person.nationality,
    email: person.email ?? "",
    phone: person.phone,
    emergencyContactName: person.emergencyContactName,
    emergencyContactPhone: person.emergencyContactPhone,
    // SAFETY: access_purpose is only ever written from the AccessPurpose union.
    accessPurpose: engagement.accessPurpose as AccessPurpose,
    arrivalDate: engagement.arrivalDate,
    departureDate: engagement.departureDate,
    ...receptionData,
  };

  const readOnly =
    engagement.workflowState !== "AtSecurity" || session.systemRole === "Guest";

  return (
    <div>
      <PageHeader
        title={person.fullName}
        subtitle={`Passport ${person.passportNo}`}
      />
      <div className="flex flex-col gap-6">
        <PriorLayersSummary
          approval={approvals[0]}
          clearance={clearance}
          induction={induction}
        />
        <ReceptionDetailsPreview
          values={previewValues}
          documentsTitle="Documents"
          documents={documents}
        />
        {documents.length === 0 && (
          <Card className="p-6">
            <p className="text-muted-foreground text-sm">
              No documents are attached to this record.
            </p>
          </Card>
        )}
        {/* Review first, then act: Security issues the access card itself. */}
        <AccessActivationForm
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
