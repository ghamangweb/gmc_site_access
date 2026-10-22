"use client";

import { Loader2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type PdfjsModule = typeof import("pdfjs-dist");

// pdf.js touches the DOM on import, so it is loaded on demand in the browser
// and never during server rendering. The worker is bundled as an asset.
let pdfjsPromise: Promise<PdfjsModule> | undefined;

function loadPdfjs(): Promise<PdfjsModule> {
  pdfjsPromise ??= import("pdfjs-dist").then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();

    return pdfjs;
  });

  return pdfjsPromise;
}

function newCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const ratio = window.devicePixelRatio || 1;

  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  // Sized by CSS so it scales with its container; the backing store is what
  // keeps it sharp.
  canvas.className = "block h-auto w-full";
  canvas.draggable = false;

  return canvas;
}

type Status = "loading" | "ready" | "error";

// A document drawn onto canvases instead of handed to the browser's own
// viewer: no PDF toolbar, no save button, no file URL in the page, and no
// <img> to "save image as". Right-click and drag are suppressed and the
// content is hidden when printing. This raises the effort of taking a copy —
// it cannot stop a screenshot, and nothing on the web can.
export function ProtectedDocumentPages({
  documentId,
  contentType,
  firstPageOnly = false,
  className,
}: {
  documentId: string;
  contentType: string | null;
  firstPageOnly?: boolean;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    let cancelled = false;
    let destroy: (() => void) | undefined;

    async function draw(target: HTMLDivElement) {
      const response = await fetch(`/api/documents/${documentId}/file`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Document request failed (${response.status})`);
      }

      const bytes = await response.arrayBuffer();

      if (cancelled) {
        return;
      }

      const canvases: HTMLCanvasElement[] = [];

      if (contentType?.startsWith("image/")) {
        const bitmap = await createImageBitmap(
          new Blob([bytes], { type: contentType }),
        );
        const canvas = newCanvas(bitmap.width, bitmap.height);

        canvas
          .getContext("2d")
          ?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        canvases.push(canvas);
      } else {
        const pdfjs = await loadPdfjs();
        const task = pdfjs.getDocument({ data: new Uint8Array(bytes) });

        destroy = () => {
          void task.destroy();
        };

        const pdf = await task.promise;

        const pageCount = firstPageOnly ? 1 : pdf.numPages;

        for (let number = 1; number <= pageCount; number += 1) {
          const page = await pdf.getPage(number);

          if (cancelled) {
            return;
          }

          // 1.5x of the PDF's own size keeps text crisp in the large viewer
          // and is plenty for the thumbnail, which CSS scales down.
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = newCanvas(viewport.width, viewport.height);
          const context = canvas.getContext("2d");

          if (!context) {
            throw new Error("Canvas is unavailable");
          }

          const ratio = window.devicePixelRatio || 1;

          await page.render({
            canvas,
            canvasContext: context,
            viewport,
            transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
          }).promise;

          canvases.push(canvas);
        }
      }

      if (cancelled) {
        return;
      }

      target.replaceChildren(...canvases);
      setStatus("ready");
    }

    draw(container).catch((error) => {
      if (!cancelled) {
        console.error("[protected-document-pages]", error);
        setStatus("error");
      }
    });

    return () => {
      cancelled = true;
      destroy?.();
    };
  }, [documentId, contentType, firstPageOnly]);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: suppressing the context menu and drag is the point, not an interaction
    <div
      className={cn("relative select-none print:hidden", className)}
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
    >
      {/* Centred in the fixed area the pages will fill, so nothing resizes
          or jumps when they arrive. */}
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <Loader2Icon className="size-5 shrink-0 animate-spin" />
        </div>
      )}
      <div
        ref={containerRef}
        className={cn(
          "flex-col gap-3",
          status === "ready"
            ? "fade-in-0 flex animate-in duration-300"
            : "hidden",
        )}
      />
      {status === "error" && (
        <div className="flex items-center justify-center p-2 text-center text-muted-foreground text-xs">
          Preview unavailable
        </div>
      )}
    </div>
  );
}
