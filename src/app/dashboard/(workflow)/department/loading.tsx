import { SUBMISSION_COLUMNS } from "@/app/dashboard/(workflow)/department/skeleton-columns";
import {
  PageHeaderSkeleton,
  TableSkeleton,
  ViewTabsSkeleton,
} from "@/components/layout/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

// Header, the invite form card, the view tabs, then the table card.
export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton />
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6">
        <div className="flex items-end gap-4">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-4">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
      </div>
      <div>
        <ViewTabsSkeleton tabs={2} />
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <TableSkeleton columns={SUBMISSION_COLUMNS} />
      </div>
    </div>
  );
}
