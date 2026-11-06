import type { SkeletonColumn } from "@/components/layout/page-skeletons";

// Column shapes for this queue's loading skeletons, shared by page.tsx (while
// a filter, search, page or tab change loads) and loading.tsx (on arrival).
// Keep in step with the real table headers.

export const SUBMISSION_COLUMNS: SkeletonColumn[] = [
  { header: "Name", cell: "name" },
  { header: "Type", cell: "short" },
  { header: "Department", cell: "text" },
  { header: "Nature of Visit", cell: "text" },
  { header: "Submitted", cell: "date" },
  { header: "Actions", cell: "menu", align: "right" },
];

export const ENGAGEMENT_COLUMNS: SkeletonColumn[] = [
  { header: "Name", cell: "name" },
  { header: "Nature of Visit", cell: "text" },
  { header: "Status", cell: "badge" },
  { header: "Actions", cell: "menu", align: "right" },
];

export const REJECTED_COLUMNS: SkeletonColumn[] = [
  { header: "Name", cell: "name" },
  { header: "Nature of Visit", cell: "text" },
  { header: "Rejected By", cell: "text" },
  { header: "Reason", cell: "long" },
  { header: "Rejected", cell: "date" },
  { header: "Action", cell: "button", align: "right" },
];
