import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { documents, engagements, workflowCycles } from "@/lib/db/schema";
import {
  type DocType,
  getRequiredRegistrationDocTypes,
  type ReceptionData,
  type RegistrationType,
  type VisaType,
  type WorkflowRole,
} from "@/lib/domain/types";
import { deleteUploadedFile, getSignedFileUrl } from "@/lib/uploadthing/api";

export type Document = typeof documents.$inferSelect;

// Single source of truth for which workflow role owns each doc type — the
// API route uses this to authorize uploads/deletes instead of hardcoding a
// role, so a new layer's doc type (e.g. Slice 4's induction forms) only
// needs an entry here, not a change to the route itself.
const DOC_TYPE_OWNERS: Record<DocType, WorkflowRole> = {
  passport_biodata: "Receptionist",
  valid_visa: "Receptionist",
  mincom_letter: "Receptionist",
  work_residence_permit: "Receptionist",
  ghana_card: "Receptionist",
  assignment_letter: "Receptionist",
  insurance_proof: "Receptionist",
  hospital_fitness_form: "HospitalStaff",
  induction_declaration_form: "TrainingStaff",
  induction_registration_form: "TrainingStaff",
  biometric_image: "ITStaff",
  passport_photo: "ITStaff",
};

export function getDocTypeOwnerRole(docType: string): WorkflowRole | undefined {
  return (DOC_TYPE_OWNERS as Record<string, WorkflowRole>)[docType];
}

// The file itself never passes through this server any more: the browser
// uploads straight to UploadThing, and this records the result. Called from
// the file router's `onUploadComplete`, which is the only place that knows
// the upload actually succeeded.
export type RecordUploadedDocumentInput = {
  docType: DocType;
  fileKey: string;
  fileUrl: string;
  fileName: string;
  contentType: string;
} & (
  | { engagementId: string; uploadedBy: string; invitationId?: never }
  | { invitationId: string; engagementId?: never; uploadedBy?: never }
);

export async function recordUploadedDocument(
  input: RecordUploadedDocumentInput,
): Promise<Document> {
  let workflowCycleId: string | undefined;

  if (input.engagementId) {
    const [engagement] = await db
      .select()
      .from(engagements)
      .where(eq(engagements.id, input.engagementId));

    if (!engagement) {
      throw new Error("Engagement not found");
    }

    const [cycle] = await db
      .select()
      .from(workflowCycles)
      .where(
        and(
          eq(workflowCycles.engagementId, input.engagementId),
          isNull(workflowCycles.archivedAt),
        ),
      )
      .orderBy(desc(workflowCycles.cycleNumber))
      .limit(1);

    workflowCycleId = cycle?.id;
  }

  const [document] = await db
    .insert(documents)
    .values({
      engagementId: input.engagementId,
      invitationId: input.invitationId,
      workflowCycleId,
      docType: input.docType,
      fileKey: input.fileKey,
      fileUrl: input.fileUrl,
      fileName: input.fileName,
      contentType: input.contentType,
      uploadedBy: input.uploadedBy,
    })
    .returning();

  return document;
}

// Reception's hand-off. A visitor's registration uploads belong to the
// Engagement the moment it exists, so the row's parent is re-pointed rather
// than the file being re-uploaded — the blob is keyed by the document's own
// id, so nothing in storage has to move. The single-parent check constraint
// means `invitationId` must be cleared in the same statement.
export async function attachInvitationDocumentsToEngagement(
  invitationId: string,
  engagementId: string,
): Promise<number> {
  const [cycle] = await db
    .select()
    .from(workflowCycles)
    .where(
      and(
        eq(workflowCycles.engagementId, engagementId),
        isNull(workflowCycles.archivedAt),
      ),
    )
    .orderBy(desc(workflowCycles.cycleNumber))
    .limit(1);

  const moved = await db
    .update(documents)
    .set({ engagementId, invitationId: null, workflowCycleId: cycle?.id })
    .where(eq(documents.invitationId, invitationId))
    .returning();

  return moved.length;
}

export async function getDocumentsForInvitation(
  invitationId: string,
): Promise<Document[]> {
  return db
    .select()
    .from(documents)
    .where(eq(documents.invitationId, invitationId));
}

export async function getMissingRegistrationDocTypes(
  invitationId: string,
  registrationType: RegistrationType,
  visaType?: VisaType,
): Promise<DocType[]> {
  const uploaded = await getDocumentsForInvitation(invitationId);
  const uploadedTypes = new Set(uploaded.map((doc) => doc.docType));

  return getRequiredRegistrationDocTypes(registrationType, visaType).filter(
    (docType) => !uploadedTypes.has(docType),
  );
}

export async function getDocumentsForEngagement(
  engagementId: string,
): Promise<Document[]> {
  return db
    .select()
    .from(documents)
    .where(eq(documents.engagementId, engagementId));
}

export async function getDocumentById(
  documentId: string,
): Promise<Document | undefined> {
  const [document] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId));
  return document;
}

export async function getDocumentViewUrl(documentId: string): Promise<string> {
  const [document] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId));
  if (!document) {
    throw new Error("Document not found");
  }
  return getSignedFileUrl(document.fileKey);
}

export async function deleteDocument(documentId: string): Promise<void> {
  const [document] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId));
  if (!document) {
    throw new Error("Document not found");
  }

  await db.delete(documents).where(eq(documents.id, documentId));
  await deleteUploadedFile(document.fileKey);
}

export async function getMissingRequiredDocTypes(
  engagementId: string,
): Promise<DocType[]> {
  const [engagement] = await db
    .select()
    .from(engagements)
    .where(eq(engagements.id, engagementId));
  if (!engagement) {
    throw new Error("Engagement not found");
  }

  const receptionData = engagement.receptionData as ReceptionData;
  const applicable = receptionData.applicableDocuments ?? [];
  if (applicable.length === 0) {
    return [];
  }

  const uploaded = await getDocumentsForEngagement(engagementId);
  const uploadedTypes = new Set(uploaded.map((doc) => doc.docType));

  return applicable.filter((docType) => !uploadedTypes.has(docType));
}
