import {
  PageHeaderSkeleton,
  type SkeletonColumn,
  TableSkeleton,
} from "@/components/layout/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

// Keep in step with the two Delegated Approvals tables.
const ACTIVE_COLUMNS: SkeletonColumn[] = [
  { header: "Visitor", cell: "name" },
  { header: "Delegated To", cell: "text" },
  { header: "Granted At", cell: "date" },
  { header: "Reason", cell: "long" },
  { header: "Actions", cell: "button", align: "right" },
];

const CANDIDATE_COLUMNS: SkeletonColumn[] = [
  { header: "Visitor", cell: "name" },
  { header: "Actions", cell: "button", align: "right" },
];

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-44" />
        <div className="overflow-x-auto bg-card">
          <TableSkeleton columns={ACTIVE_COLUMNS} rows={3} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-64" />
        <div className="overflow-x-auto bg-card">
          <TableSkeleton columns={CANDIDATE_COLUMNS} rows={5} />
        </div>
      </div>
    </div>
  );
}
