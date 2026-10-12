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
