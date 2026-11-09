import type { SkeletonColumn } from "@/components/layout/page-skeletons";

// Column shapes for this page's loading skeletons, shared by page.tsx (while
// a tab change loads) and loading.tsx (on arrival). Keep in step with the
// real table headers.

export const ACTIVE_COLUMNS: SkeletonColumn[] = [
  { header: "Visitor", cell: "name" },
  { header: "Delegated To", cell: "text" },
  { header: "Granted At", cell: "date" },
  { header: "Reason", cell: "long" },
  { header: "Actions", cell: "button", align: "right" },
];

export const REQUEST_COLUMNS: SkeletonColumn[] = [
  { header: "Visitor", cell: "name" },
  { header: "Reason", cell: "long" },
  { header: "Requested By", cell: "text" },
  { header: "Requested", cell: "date" },
  { header: "Actions", cell: "button", align: "right" },
];
