import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toUpperCase(value: string): string {
  return value.toUpperCase();
}

// The one date format every queue table uses: "03 Nov 2026". Explicit
// `en-GB` rather than the viewer's locale, so a timestamp reads the same for
// everyone looking at the same record.
export function formatQueueDate(value: Date): string {
  return value.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
