"use client";

import { EyeIcon } from "lucide-react";
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProtectedDocumentPages } from "@/components/workflow/protected-document-pages";
import { DOCUMENT_LABELS, type DocType } from "@/lib/domain/types";
import type { Document } from "@/lib/services/document-service";

// The document as a page, not a thumbnail in a card: a small A4-proportioned
// sheet with its name underneath. There are no buttons: the whole tile is
// clickable (pointer cursor) and opens the document in an in-app dialog. On
// hover the name swaps to an eye icon and "Preview"; the sheet stays untouched.
// The file is drawn onto canvases from a same-origin route, so the raw file
// never opens in a browser tab and there is no save button to reach. See
// `protected-document-pages.tsx` for what that does and does not prevent.
// Downloading is deliberately not offered.
//
// The pile is honest: it only appears for a file with several pages, one
// extra leaf per additional page (capped), piled on the right edge only. On
// hover the leaves fan out. A single-page file — every image, most one-page
// PDFs — is just the sheet, with nothing to animate.
//
// The reference this follows uses a drop shadow for the stack. `ui-rules.md`
// forbids `shadow-*` outright ("flat surfaces, separation via border-border"),
// so the leaves are offset bordered sheets instead — same read, no elevation.
//
// Back leaves, nearest first. Fixed class strings, not built at runtime, so
// Tailwind can see them.
const LEAVES = [
  "translate-x-[5px] group-hover:translate-x-[7px] group-hover:rotate-[2deg]",
  "translate-x-[10px] delay-75 group-hover:translate-x-[13px] group-hover:rotate-[4deg]",
  "translate-x-[15px] delay-150 group-hover:translate-x-[19px] group-hover:rotate-[6deg]",
] as const;

export function DocumentPreview({ document }: { document: Document }) {
  const [open, setOpen] = useState(false);

  // SAFETY: `doc_type` is a text column, but every row is written by the file
  // router, which only accepts a DOC_TYPES member; the `??` covers any row
  // that somehow isn't one.
  const label =
    DOCUMENT_LABELS[document.docType as DocType] ?? document.docType;

  // One leaf behind the sheet per extra page, at most three. Null (unknown)
  // counts as a single page.
  const leaves = LEAVES.slice(
    0,
    Math.min(Math.max((document.pageCount ?? 1) - 1, 0), LEAVES.length),
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Preview ${label}`}
        className="group flex w-[140px] cursor-pointer flex-col items-center gap-3"
      >
        <div
          className="relative w-[120px] shrink-0"
          style={{ marginRight: leaves.length * 5 }}
        >
          {/* Farthest leaf first, so the nearer ones sit on top of it. */}
          {leaves
            .map((leaf, index) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed, ordered leaves with no identity of their own
                key={index}
                className={`absolute inset-0 origin-bottom-left rounded-md border border-border bg-card transition-transform duration-300 ease-out motion-reduce:transition-none ${leaf}`}
              />
            ))
            .reverse()}

          <div className="pointer-events-none relative aspect-[1/1.414] overflow-hidden rounded-md border border-border bg-card">
            <ProtectedDocumentPages
              documentId={document.id}
              contentType={document.contentType}
              firstPageOnly
              className="h-full [&>div]:h-full [&_canvas]:h-full [&_canvas]:object-contain"
            />
          </div>
        </div>

        <div className="relative flex flex-col items-center">
          <span className="text-center font-medium text-foreground text-xs transition-opacity duration-200 group-hover:opacity-0 group-focus-visible:opacity-0 motion-reduce:transition-none">
            {label}
          </span>
          <span className="absolute inset-0 flex items-center justify-center gap-1 font-medium text-foreground text-xs opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none">
            <EyeIcon className="size-3.5 shrink-0" />
            Preview
          </span>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        {/* A fixed size, not content-driven: the dialog is centred with a
            translate, so a height that changed as pages loaded made it jump. */}
        <DialogContent className="flex h-[90vh] w-[calc(100vw-2rem)] flex-col gap-3 sm:max-w-4xl print:hidden">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
          </DialogHeader>
          {/* Mounted only while open, so a closed dialog fetches nothing. */}
          {open && (
            <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-border bg-muted/30 p-3 [scrollbar-gutter:stable]">
              <ProtectedDocumentPages
                documentId={document.id}
                contentType={document.contentType}
                className="min-h-full"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
