import type { SkeletonColumn } from "@/components/layout/page-skeletons";

// Column shapes for this queue's loading skeletons, shared by page.tsx (while
// a filter, search, page or tab change loads) and loading.tsx (on arrival).
// Keep in step with the real table headers.

export const SUBMISSION_COLUMNS: SkeletonColumn[] = [
  { header: "Name", cell: "name" },
  { header: "Type", cell: "short" },
  { header: "Nature of Visit", cell: "text" },
  { header: "Submitted", cell: "date" },
  { header: "Status", cell: "badge" },
  { header: "Actions", cell: "menu", align: "right" },
];

export const INVITATION_COLUMNS: SkeletonColumn[] = [
  { header: "Email", cell: "name" },
  { header: "Type", cell: "short" },
  { header: "Sent", cell: "date" },
  { header: "Status", cell: "badge" },
  { header: "Actions", cell: "menu", align: "right" },
];
