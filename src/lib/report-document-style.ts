// Word and PDF files can't read CSS variables, so the downloaded reports use
// this copy of the light-theme tokens in docs/context/ui-tokens.md. Keep the
// two in step; nothing else should hold colour values.
export const REPORT_DOCUMENT_PALETTE = {
  primary: "0076BF",
  foreground: "0F172A",
  mutedForeground: "64748B",
  border: "E2E8F0",
  muted: "F1F5F9",
  primaryForeground: "FFFFFF",
} as const;

export const REPORT_ORGANISATION = "Ghana Manganese Company Limited";

export const REPORT_FOOTER = "GMC Site Access · Internal management report";

export type ReportLogo = {
  png: Uint8Array;
  /** JPEG for the PDF: pdfmake embeds JPEGs as-is but can stall decoding transparent PNGs. */
  jpegDataUrl: string;
  width: number;
  height: number;
};

const LOGO_WIDTH = 480;

/** Loads the logo scaled down, so it doesn't add megabytes to each report. Browser only. */
export async function loadReportLogo(): Promise<ReportLogo | null> {
  try {
    const response = await fetch("/logo_whitebg.png", { cache: "force-cache" });

    if (!response.ok) return null;

    const bitmap = await createImageBitmap(await response.blob());
    const width = LOGO_WIDTH;
    const height = Math.round((bitmap.height / bitmap.width) * width);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");

    if (!context) return null;

    // JPEG has no transparency, so paint the page colour behind the logo first.
    context.fillStyle = `#${REPORT_DOCUMENT_PALETTE.primaryForeground}`;
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const binary = atob(canvas.toDataURL("image/png").split(",")[1]);
    const png = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.92);

    return { png, jpegDataUrl, width, height };
  } catch {
    // The report is still useful without the logo.
    return null;
  }
}

export function saveReportFile(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
