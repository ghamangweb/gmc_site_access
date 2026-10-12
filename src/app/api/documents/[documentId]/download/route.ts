import { NextResponse } from "next/server";

import { requirePinConfirmed } from "@/lib/auth/guards";
import {
  getDocumentById,
  getDocumentViewUrl,
} from "@/lib/services/document-service";

// Streams the file back through this origin with an attachment disposition.
// A signed UploadThing URL can't do this itself: `generateSignedURL` only
// takes an expiry, and a cross-origin `download` attribute is ignored by the
// browser — so without this route "Download" would just navigate to the file.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    await requirePinConfirmed();
  } catch {
    return NextResponse.json(
      { success: false, error: "Not authorized" },
      { status: 403 },
    );
  }

  try {
    const { documentId } = await params;

    const document = await getDocumentById(documentId);

    if (!document) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 },
      );
    }

    const signedUrl = await getDocumentViewUrl(documentId);
    const upstream = await fetch(signedUrl);

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { success: false, error: "Internal server error" },
        { status: 500 },
      );
    }

    const fileName = document.fileName ?? document.docType;

    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type":
          document.contentType ??
          upstream.headers.get("content-type") ??
          "application/octet-stream",
        // Quoted and escaped: a filename can legitimately contain spaces.
        "Content-Disposition": `attachment; filename="${fileName.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[api/documents/:documentId/download]", error);

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
