import type { SkeletonColumn } from "@/components/layout/page-skeletons";

// Column shapes for this queue's loading skeletons, shared by page.tsx (while
// a filter, search, page or tab change loads) and loading.tsx (on arrival).
// Keep in step with the real table headers.

export const AWAITING_COLUMNS: SkeletonColumn[] = [
  { header: "Name", cell: "name" },
  { header: "Arrival", cell: "date" },
  { header: "Departure", cell: "date" },
  { header: "Action", cell: "button", className: "w-px" },
];

export const REVIEW_COLUMNS: SkeletonColumn[] = [
  { header: "Name", cell: "name" },
  { header: "Recorded", cell: "date" },
  { header: "Cleared By", cell: "text" },
  { header: "Next Review Date", cell: "date" },
  { header: "Action", cell: "button" },
];

export const RECORDED_COLUMNS: SkeletonColumn[] = [
  { header: "Name", cell: "name" },
  { header: "Outcome", cell: "badge" },
  { header: "Recorded", cell: "date" },
  { header: "Cleared By", cell: "text" },
  { header: "Next Review Date", cell: "date" },
  { header: "Action", cell: "menu", align: "right" },
];
