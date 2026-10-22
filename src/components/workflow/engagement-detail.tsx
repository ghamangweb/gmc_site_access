import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { CancelEngagementButton } from "@/components/workflow/cancel-engagement-button";
import { PreviewEditPanel } from "@/components/workflow/preview-edit-panel";
import { ReceptionDetailsPreview } from "@/components/workflow/reception-details-preview";
import type { ReceptionFormValues } from "@/components/workflow/reception-form";
import { ReceptionForm } from "@/components/workflow/reception-form";
import { StakeholderPanel } from "@/components/workflow/stakeholder-panel";
import { requirePinConfirmed } from "@/lib/auth/guards";
import type {
  AccessPurpose,
  ApproverRole,
  ReceptionData,
} from "@/lib/domain/types";
import { getDocumentsForEngagement } from "@/lib/services/document-service";
import { getEngagementDetail } from "@/lib/services/workflow-service";

// transportTo/transportFrom/otherInductions were free-text strings before
// 2026-07-23's switch to Yes/No — records created before that change still
// have non-boolean values in the jsonb column. Coerce on read so legacy
// engagements load correctly instead of feeding a stray string into a
// boolean-typed form field.
function normalizeReceptionData(raw: unknown): ReceptionData {
  const data = raw as Record<string, unknown>;
  const toBoolean = (value: unknown) =>
    typeof value === "boolean" ? value : !!value;
  return {
    ...(raw as ReceptionData),
    transportTo: toBoolean(data.transportTo),
    transportFrom: toBoolean(data.transportFrom),
    otherInductions: toBoolean(data.otherInductions),
  };
}

// The engagement record, rendered identically wherever it is opened from.
// Reception reaches it under /dashboard/reception/:id and a stakeholder under
// /dashboard/approvals/:id — same screen, different breadcrumb trail, because
// a stakeholder has no business in Reception's route.
export async function EngagementDetail({
  engagementId,
  queueHref,
}: {
  engagementId: string;
  /** The queue this was opened from: where approval returns to, and the
   * route whose access is required to be here. */
  queueHref: "/dashboard/reception" | "/dashboard/approvals";
}) {
  const session = await requirePinConfirmed();

  const detail = await getEngagementDetail(engagementId);

  if (!detail) {
    notFound();
  }

  const { engagement, person, approvals } = detail;

  // Reception's record is Reception's. The approvals route is for whoever
  // signs off: a stakeholder, or the delegate this one engagement was granted
  // to — a delegate holds no workflow role at all, so the grant is the check.
  const canOpen =
    queueHref === "/dashboard/reception"
      ? session.workflowRoles.includes("Receptionist")
      : (["HCM", "GMM", "DMD"] as const).some((role) =>
          session.workflowRoles.includes(role),
        ) || engagement.delegatedApproverId === session.staffUserId;

  if (!canOpen) {
    redirect("/dashboard");
  }

  const documents = await getDocumentsForEngagement(engagementId);
  const receptionData = normalizeReceptionData(engagement.receptionData);

  const isReceptionist =
    session.workflowRoles.includes("Receptionist") &&
    session.systemRole !== "Guest";
  const noApprovalYet =
    engagement.workflowState === "AtReception" && approvals.length === 0;
  const formReadOnly =
    engagement.workflowState !== "AtReception" || !isReceptionist;

  const isGuest = session.systemRole === "Guest";
  const directRole = isGuest
    ? undefined
    : (["HCM", "GMM", "DMD"] as const).find((role) =>
        session.workflowRoles.includes(role),
      );
  const isDelegatedApprover =
    !isGuest &&
    engagement.delegatedApproverId !== null &&
    engagement.delegatedApproverId === session.staffUserId;
  const approveAs: ApproverRole | null = noApprovalYet
    ? (directRole ?? (isDelegatedApprover ? "Delegated" : null))
    : null;
  const canRequestApproval = noApprovalYet && isReceptionist;

  const defaultValues: Partial<ReceptionFormValues> = {
    passportNo: person.passportNo,
    fullName: person.fullName,
    dateOfBirth: person.dateOfBirth,
    gender: person.gender,
    nationality: person.nationality,
    email: person.email ?? "",
    phone: person.phone,
    emergencyContactName: person.emergencyContactName,
    emergencyContactPhone: person.emergencyContactPhone,
    accessPurpose: engagement.accessPurpose as AccessPurpose,
    arrivalDate: engagement.arrivalDate,
    departureDate: engagement.departureDate,
    ...receptionData,
  };

  const preview = (
    <ReceptionDetailsPreview
      values={defaultValues}
      showAdministration
      documentsTitle="Documents"
      documents={documents}
    />
  );

  return (
    <div>
      <PageHeader
        title={person.fullName}
        actions={
          canRequestApproval ? (
            <CancelEngagementButton engagementId={engagementId} />
          ) : undefined
        }
      />
      <div className="flex flex-col gap-6">
        {formReadOnly ? (
          // Nothing to toggle: this engagement has moved past Reception, or
          // the viewer can't write to it.
          preview
        ) : (
          <PreviewEditPanel
            previewHint="What Reception recorded for this engagement."
            editHint="Editing the engagement. Changes save to the record."
            editLabel="Edit engagement"
            preview={preview}
            editForm={
              <ReceptionForm
                engagementId={engagementId}
                defaultValues={defaultValues}
                uploadedDocuments={documents}
              />
            }
          />
        )}
        <StakeholderPanel
          engagementId={engagementId}
          approvals={approvals}
          approveAs={approveAs}
          canRequestApproval={canRequestApproval}
          // A stakeholder opened this from their own queue and belongs back
          // there; a Receptionist belongs in Reception's.
          returnHref={queueHref}
        />
      </div>
    </div>
  );
}
