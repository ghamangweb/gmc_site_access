import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { z } from "zod";

import { requireWriteAccess } from "@/lib/auth/guards";
import { DOC_TYPES, getRegistrationDocTypes } from "@/lib/domain/types";
import {
  getDocTypeOwnerRole,
  getDocumentsForInvitation,
  recordUploadedDocument,
} from "@/lib/services/document-service";
import { validateInvitationToken } from "@/lib/services/invitation-service";

const f = createUploadthing();

// Mirrors the limits the Azure-era routes enforced by hand. Declaring them
// here means the browser rejects an oversized or wrong-typed file before a
// byte leaves the machine, and UploadThing enforces the same server-side.
const DOCUMENT_FILE_CONFIG = {
  "application/pdf": { maxFileSize: "16MB", maxFileCount: 1 },
  "image/jpeg": { maxFileSize: "16MB", maxFileCount: 1 },
  "image/png": { maxFileSize: "16MB", maxFileCount: 1 },
  "image/webp": { maxFileSize: "16MB", maxFileCount: 1 },
} as const;

export const uploadRouter = {
  // Public, unauthenticated: authorization is the invitation token itself. A
  // valid, unrevoked, unconsumed token may attach documents to its own
  // invitation and nothing else — the same contract the old
  // /api/register/documents POST enforced.
  registrationDocument: f(DOCUMENT_FILE_CONFIG)
    .input(z.object({ token: z.string().min(1), docType: z.enum(DOC_TYPES) }))
    .middleware(async ({ input }) => {
      const invitation = await validateInvitationToken(input.token);

      if (!invitation) {
        throw new UploadThingError(
          "This invitation link is invalid, already used, or revoked",
        );
      }

      // Only the types this registration type asks for, so a token can't be
      // used to push arbitrary documents (e.g. a hospital form) into storage.
      if (
        !getRegistrationDocTypes(invitation.registrationType).includes(
          input.docType,
        )
      ) {
        throw new UploadThingError("Invalid document type");
      }

      const existing = await getDocumentsForInvitation(invitation.id);

      if (existing.some((doc) => doc.docType === input.docType)) {
        throw new UploadThingError(
          "That document is already uploaded. Remove it first",
        );
      }

      return { invitationId: invitation.id, docType: input.docType };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const document = await recordUploadedDocument({
        invitationId: metadata.invitationId,
        docType: metadata.docType,
        fileKey: file.key,
        fileUrl: file.ufsUrl,
        fileName: file.name,
        contentType: file.type,
      });

      return { documentId: document.id };
    }),

  // Staff uploads against a real Engagement. The role that may upload is
  // derived from the doc type, exactly as the old route did, so a new
  // layer's doc type needs no change here.
  engagementDocument: f(DOCUMENT_FILE_CONFIG)
    .input(
      z.object({
        engagementId: z.string().min(1),
        docType: z.enum(DOC_TYPES),
      }),
    )
    .middleware(async ({ input }) => {
      const ownerRole = getDocTypeOwnerRole(input.docType);

      if (!ownerRole) {
        throw new UploadThingError("Invalid document type");
      }

      try {
        const session = await requireWriteAccess(ownerRole);

        return {
          engagementId: input.engagementId,
          docType: input.docType,
          staffUserId: session.staffUserId,
        };
      } catch {
        throw new UploadThingError("Not authorized");
      }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const document = await recordUploadedDocument({
        engagementId: metadata.engagementId,
        docType: metadata.docType,
        fileKey: file.key,
        fileUrl: file.ufsUrl,
        fileName: file.name,
        contentType: file.type,
        uploadedBy: metadata.staffUserId,
      });

      return { documentId: document.id };
    }),
} satisfies FileRouter;

export type GmcFileRouter = typeof uploadRouter;
