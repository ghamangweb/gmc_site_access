import { NextResponse } from "next/server";

import { requirePinConfirmed } from "@/lib/auth/guards";
import {
  getDocumentById,
  getDocumentViewUrl,
} from "@/lib/services/document-service";

// The bytes behind the in-app document viewer. The signed UploadThing URL
// never leaves the server: the page only ever sees this same-origin route,
// which the viewer calls with fetch() and draws onto a canvas.
//
// A browser asked to *navigate* here (typing the URL, opening it in a tab or
// an iframe) is refused, so this cannot become a way to open the raw file in
// the browser's own PDF/image viewer, which has a save button. Sec-Fetch-Dest
// is set by the browser and cannot be forged from page script; a client that
// does not send it (curl with a stolen cookie) is not something this header
// check can stop, and nothing on the web fully can.
const NAVIGATION_DESTINATIONS = new Set([
  "document",
  "iframe",
  "frame",
  "embed",
  "object",
]);

export async function GET(
  req: Request,
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

  if (NAVIGATION_DESTINATIONS.has(req.headers.get("sec-fetch-dest") ?? "")) {
    return NextResponse.json(
      { success: false, error: "Open documents from within the app" },
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

    const upstream = await fetch(await getDocumentViewUrl(documentId));

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { success: false, error: "Internal server error" },
        { status: 500 },
      );
    }

    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type":
          document.contentType ??
          upstream.headers.get("content-type") ??
          "application/octet-stream",
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[api/documents/:documentId/file]", error);

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
