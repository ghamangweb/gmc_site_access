import { type NextRequest, NextResponse } from "next/server";

import {
  deleteDocument,
  getDocumentsForInvitation,
  getDocumentViewUrl,
} from "@/lib/services/document-service";
import { validateInvitationToken } from "@/lib/services/invitation-service";

// Uploads are no longer handled here: the browser sends bytes straight to
// UploadThing via the `registrationDocument` file route
// (`src/app/api/uploadthing/core.ts`), which re-checks the invitation token,
// the allowed doc types and the duplicate rule in its middleware. This file
// keeps the token-scoped view and delete surfaces.

// Short-lived signed URL so a visitor can re-open what they just uploaded.
// Same invitation-scoping as DELETE: the token only reaches its own documents.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    const documentId = searchParams.get("documentId");

    if (!token || !documentId) {
      return NextResponse.json(
        { success: false, error: "Missing token or documentId" },
        { status: 400 },
      );
    }

    const invitation = await validateInvitationToken(token);
    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "Not authorized" },
        { status: 403 },
      );
    }

    const owned = await getDocumentsForInvitation(invitation.id);
    if (!owned.some((doc) => doc.id === documentId)) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 },
      );
    }

    const url = await getDocumentViewUrl(documentId);
    return NextResponse.json({ success: true, data: { url } });
  } catch (error) {
    console.error("[api/register/documents]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    const documentId = searchParams.get("documentId");

    if (!token || !documentId) {
      return NextResponse.json(
        { success: false, error: "Missing token or documentId" },
        { status: 400 },
      );
    }

    const invitation = await validateInvitationToken(token);
    if (!invitation) {
      return NextResponse.json(
        {
          success: false,
          error: "This invitation link is invalid, already used, or revoked",
        },
        { status: 403 },
      );
    }

    // Scoped to this invitation's own documents, so a token can't delete
    // anything it didn't upload.
    const owned = await getDocumentsForInvitation(invitation.id);
    if (!owned.some((doc) => doc.id === documentId)) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 },
      );
    }

    await deleteDocument(documentId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/register/documents]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
