import { PDFDocument } from "pdf-lib";
import { UTApi } from "uploadthing/server";

// Reads UPLOADTHING_TOKEN from the environment. Server-only — never import
// this from a client component.
const utapi = new UTApi();

// Site-access documents are passports, visas and permits, so they are never
// served from a public URL. Every view goes through a short-lived signed URL,
// the same 15-minute window the Azure SAS implementation used.
const SIGNED_URL_EXPIRY_SECONDS = 15 * 60;

export async function getSignedFileUrl(fileKey: string): Promise<string> {
  const { ufsUrl } = await utapi.generateSignedURL(fileKey, {
    expiresIn: SIGNED_URL_EXPIRY_SECONDS,
  });

  return ufsUrl;
}

export async function deleteUploadedFile(fileKey: string): Promise<void> {
  await utapi.deleteFiles(fileKey);
}

// Pages in an uploaded file. Images are one page by definition; a PDF is
// downloaded through a signed URL and parsed. Returns null rather than
// throwing — an unreadable or encrypted PDF must not fail the upload that
// already succeeded, and a null count previews as a single page.
export async function countUploadedPages(
  fileKey: string,
  contentType: string,
): Promise<number | null> {
  if (contentType !== "application/pdf") {
    return 1;
  }

  try {
    const response = await fetch(await getSignedFileUrl(fileKey));

    if (!response.ok) {
      return null;
    }

    const pdf = await PDFDocument.load(await response.arrayBuffer(), {
      ignoreEncryption: true,
      updateMetadata: false,
    });

    return pdf.getPageCount();
  } catch (error) {
    console.error("[uploadthing/api] page count", error);

    return null;
  }
}
