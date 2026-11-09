import type { SkeletonColumn } from "@/components/layout/page-skeletons";

// Keep in step with the Staff Users table headers. Shared by the dashboard
// page (while a tab change loads) and loading.tsx (on arrival).
export const USER_COLUMNS: SkeletonColumn[] = [
  { header: "Name", cell: "name" },
  { header: "Email", cell: "text" },
  { header: "System Role", cell: "badge" },
  { header: "Workflow Roles", cell: "text" },
  { header: "Status", cell: "badge" },
  { header: "Actions", cell: "menu", align: "right" },
];
