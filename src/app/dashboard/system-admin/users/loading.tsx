import {
  PageHeaderSkeleton,
  type SkeletonColumn,
  TableSkeleton,
} from "@/components/layout/page-skeletons";

// Keep in step with the Staff Users table headers.
const USER_COLUMNS: SkeletonColumn[] = [
  { header: "Name", cell: "name" },
  { header: "Email", cell: "text" },
  { header: "System Role", cell: "badge" },
  { header: "Workflow Roles", cell: "text" },
  { header: "Status", cell: "badge" },
  { header: "Actions", cell: "menu", align: "right" },
];

export default function Loading() {
  return (
    <div>
      <PageHeaderSkeleton action />
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <TableSkeleton columns={USER_COLUMNS} />
      </div>
    </div>
  );
}
