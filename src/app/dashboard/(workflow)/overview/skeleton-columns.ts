import type { SkeletonColumn } from "@/components/layout/page-skeletons";

// Column shapes for this queue's loading skeletons, shared by page.tsx (while
// a filter, search, page or tab change loads) and loading.tsx (on arrival).
// Keep in step with the real table headers.

export const RECORD_COLUMNS: SkeletonColumn[] = [
  { header: "Name", cell: "name" },
  { header: "Nature of Visit", cell: "text" },
  { header: "Stage", cell: "badge" },
  { header: "Medical", cell: "badge" },
  { header: "Induction", cell: "badge" },
  { header: "Access", cell: "badge" },
];
