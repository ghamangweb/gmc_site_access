import type { SkeletonColumn } from "@/components/layout/page-skeletons";

// Column shapes for this queue's loading skeletons, shared by page.tsx (while
// a filter, search, page or tab change loads) and loading.tsx (on arrival).
// Keep in step with the real table headers.

export const AWAITING_COLUMNS: SkeletonColumn[] = [
  { header: "Name", cell: "name" },
  { header: "Nature of Visit", cell: "text" },
  { header: "Arrival", cell: "date" },
  { header: "Departure", cell: "date" },
  { header: "Action", cell: "button", align: "right" },
];

export const GRANTED_COLUMNS: SkeletonColumn[] = [
  { header: "Name", cell: "name" },
  { header: "Nature of Visit", cell: "text" },
  { header: "Card No.", cell: "short" },
  { header: "Access From", cell: "date" },
  { header: "Access Until", cell: "date" },
  { header: "Duration", cell: "short" },
  { header: "Access", cell: "badge" },
  { header: "Actions", cell: "menu", align: "right" },
];

export const REVOCATION_COLUMNS: SkeletonColumn[] = [
  { header: "Name", cell: "name" },
  { header: "Card No.", cell: "short" },
  { header: "Reason", cell: "long" },
  { header: "Requested By", cell: "text" },
  { header: "Requested", cell: "date" },
  { header: "Action", cell: "button", align: "right" },
];
