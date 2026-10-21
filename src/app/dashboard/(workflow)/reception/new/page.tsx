import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { PreviewEditPanel } from "@/components/workflow/preview-edit-panel";
import { ReceptionDetailsPreview } from "@/components/workflow/reception-details-preview";
import { ReceptionForm } from "@/components/workflow/reception-form";
import { RegistrationCompletionForm } from "@/components/workflow/registration-completion-form";
import { requireWriteAccess } from "@/lib/auth/guards";
import { registrationRequestToFormValues } from "@/lib/domain/registration-prefill";
import { type ApplicableDocType, DOC_TYPES } from "@/lib/domain/types";
import { getDocumentsForInvitation } from "@/lib/services/document-service";
import { getRegistrationRequest } from "@/lib/services/registration-service";

function isApplicableDocType(docType: string): docType is ApplicableDocType {
  // SAFETY: widening the readonly tuple to `string[]` only to ask whether an
  // arbitrary `documents.doc_type` (a plain text column) is one of its
  // members — the predicate is what narrows, to the tuple's own member type
  // minus the hospital form, which is never a registration upload.
  const known: readonly string[] = DOC_TYPES;

  return docType !== "hospital_fitness_form" && known.includes(docType);
}

export default async function NewReceptionPage({
  searchParams,
}: {
  searchParams: Promise<{ requestId?: string }>;
}) {
  try {
    await requireWriteAccess("Receptionist");
  } catch {
    redirect("/dashboard/reception");
  }

  const { requestId } = await searchParams;

  const request = requestId
    ? await getRegistrationRequest(requestId)
    : undefined;

  // An already-converted submission must not open a second time — send the
  // Receptionist to the Engagement it produced instead.
  if (request?.engagementId) {
    redirect(`/dashboard/reception/${request.engagementId}`);
  }

  // What the visitor already attached to their invitation. Shown here so the
  // Receptionist can see and open it before creating the Engagement — these
  // rows are re-pointed onto the Engagement the moment it is created.
  const uploadedDocuments = request
    ? await getDocumentsForInvitation(request.invitationId)
    : [];

  // Tick the boxes for whatever actually arrived, so the slots render instead
  // of the Receptionist having to guess what the visitor supplied.
  const applicableDocuments = uploadedDocuments
    .map((document) => document.docType)
    .filter(isApplicableDocType);

  // Parsed once and used twice: the preview renders it, the edit form is
  // prefilled with it, so the two can never show different data.
  const submittedValues = request
    ? registrationRequestToFormValues(request.formData)
    : {};

  return (
    <div>
      <PageHeader
        title={request ? "Create Engagement" : "New Registration"}
        subtitle={
          request
            ? "Review what the visitor submitted, correct anything that needs it, then create the engagement."
            : "Look up an existing visitor by passport number, or register a new one."
        }
      />
      {request ? (
        <PreviewEditPanel
          previewHint="Submitted by the visitor. Review it, then complete the fields below."
          editHint="Changes here replace what the visitor sent."
          editLabel="Edit submission"
          preview={
            <ReceptionDetailsPreview
              values={submittedValues}
              registrationType={request.registrationType}
              department={request.department}
              documents={uploadedDocuments}
            />
          }
          belowPreview={
            <RegistrationCompletionForm
              registrationRequestId={request.id}
              isLocal={request.registrationType === "Local"}
              documents={uploadedDocuments}
              defaultApplicableDocuments={applicableDocuments}
            />
          }
          editForm={
            <ReceptionForm
              registrationRequestId={request.id}
              uploadedDocuments={uploadedDocuments}
              defaultValues={{ ...submittedValues, applicableDocuments }}
            />
          }
        />
      ) : (
        <ReceptionForm allowLookup />
      )}
    </div>
  );
}
