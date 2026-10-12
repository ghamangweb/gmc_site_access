import { DownloadIcon, ExternalLinkIcon, FileTextIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DOCUMENT_LABELS, type DocType } from "@/lib/domain/types";
import type { Document } from "@/lib/services/document-service";

// The document as a page, not a thumbnail in a card: an A4-proportioned sheet
// with two offset sheets behind it, then the actions underneath.
//
// The reference this follows uses a drop shadow for the stack. `ui-rules.md`
// forbids `shadow-*` outright ("flat surfaces, separation via border-border"),
// so the stack is built from offset bordered sheets instead — same read,
// no elevation.
export function DocumentPreview({
  document,
  previewUrl,
}: {
  document: Document;
  previewUrl: string | null;
}) {
  // SAFETY: `doc_type` is a text column, but every row is written by the file
  // router, which only accepts a DOC_TYPES member; the `??` covers any row
  // that somehow isn't one.
  const label =
    DOCUMENT_LABELS[document.docType as DocType] ?? document.docType;

  const isImage = document.contentType?.startsWith("image/") ?? false;
  const isPdf = document.contentType === "application/pdf";

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full max-w-[260px]">
        {/* The sheets behind, peeking out at the top-right. */}
        <div className="absolute -top-2 -right-2 h-full w-full rounded-lg border border-border bg-card" />
        <div className="absolute -top-1 -right-1 h-full w-full rounded-lg border border-border bg-card" />

        <div className="relative aspect-[1/1.414] overflow-hidden rounded-lg border border-border bg-card">
          {previewUrl && isImage && (
            // Not next/image: a short-lived signed URL is nothing the
            // optimizer can cache, and its host would need allow-listing.
            // biome-ignore lint/performance/noImgElement: short-lived signed URL, not an optimizable asset
            <img
              src={previewUrl}
              alt={label}
              className="h-full w-full object-contain"
            />
          )}
          {previewUrl && isPdf && (
            // `pointer-events-none` keeps it a preview — scrolling and the
            // built-in PDF toolbar belong in the View tab.
            <iframe
              src={`${previewUrl}#toolbar=0&navpanes=0&view=FitH`}
              title={label}
              className="pointer-events-none h-full w-full border-0"
            />
          )}
          {(!previewUrl || (!isImage && !isPdf)) && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <FileTextIcon className="h-8 w-8" />
              <span className="text-xs">No preview</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-1">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <div className="flex items-center">
          {previewUrl && (
            <Button asChild variant="ghost" size="sm">
              <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLinkIcon />
                View
              </a>
            </Button>
          )}
          <Button asChild variant="ghost" size="sm">
            <a href={`/api/documents/${document.id}/download`}>
              <DownloadIcon />
              Download
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
