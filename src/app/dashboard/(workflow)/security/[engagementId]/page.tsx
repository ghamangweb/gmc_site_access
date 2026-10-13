import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { ForwardToITButton } from "@/components/workflow/forward-to-it-button";
import { PriorLayersSummary } from "@/components/workflow/prior-layers-summary";
import { ReceptionDetailsPreview } from "@/components/workflow/reception-details-preview";
import type { ReceptionFormValues } from "@/components/workflow/reception-form";
import { requirePinConfirmed } from "@/lib/auth/guards";
import type { AccessPurpose, ReceptionData } from "@/lib/domain/types";
import { getDocumentsForEngagement } from "@/lib/services/document-service";
import {
  getEngagementDetail,
  getLatestHospitalClearance,
  getLatestInductionRecord,
} from "@/lib/services/workflow-service";
import { getSignedFileUrl } from "@/lib/uploadthing/api";

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

  const [documents, clearance, induction] = await Promise.all([
    getDocumentsForEngagement(engagementId),
    getLatestHospitalClearance(engagementId),
    getLatestInductionRecord(engagementId),
  ]);

  // Security's job is to audit what everyone else collected, so every
  // document has to be openable here — this is the last review before access
  // is switched on.
  const previewDocuments = await Promise.all(
    documents.map(async (document) => {
      try {
        return {
          document,
          previewUrl: await getSignedFileUrl(document.fileKey),
        };
      } catch (error) {
        console.error("[security/:engagementId] preview url", error);

        return { document, previewUrl: null };
      }
    }),
  );

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

  const canForward =
    engagement.workflowState === "AtSecurity" &&
    session.systemRole !== "Guest" &&
    session.workflowRoles.includes("SecurityStaff");

  return (
    <div>
      <PageHeader
        title={person.fullName}
        subtitle={`Passport ${person.passportNo}`}
        actions={
          canForward ? (
            <ForwardToITButton engagementId={engagementId} />
          ) : undefined
        }
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
          documents={previewDocuments}
        />
        {previewDocuments.length === 0 && (
          <Card className="p-6">
            <p className="text-muted-foreground text-sm">
              No documents are attached to this record.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
