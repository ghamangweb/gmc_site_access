import type { SkeletonColumn } from "@/components/layout/page-skeletons";

// Column shapes for this queue's loading skeletons, shared by page.tsx (while
// a filter, search, page or tab change loads) and loading.tsx (on arrival).
// Keep in step with the real table headers.

export const AWAITING_COLUMNS: SkeletonColumn[] = [
  { header: "Name", cell: "name" },
  { header: "Nature of Visit", cell: "text" },
  { header: "Arrival", cell: "date" },
  { header: "Requested", cell: "date" },
  { header: "Actions", cell: "menu", align: "right" },
];

export const APPROVED_COLUMNS: SkeletonColumn[] = [
  { header: "Name", cell: "name" },
  { header: "Approved By", cell: "text" },
  { header: "Approved On", cell: "date" },
  { header: "Stage", cell: "badge" },
  { header: "Departure", cell: "date" },
  { header: "Actions", cell: "menu", align: "right" },
];
