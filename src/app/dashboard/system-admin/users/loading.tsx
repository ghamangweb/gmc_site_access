import { USER_COLUMNS } from "@/app/dashboard/system-admin/users/skeleton-columns";
import { QueuePageSkeleton } from "@/components/layout/page-skeletons";

// The default Staff Users tab: three tabs, no toolbar, no pagination.
export default function Loading() {
  return (
    <QueuePageSkeleton
      columns={USER_COLUMNS}
      tabs={3}
      filter={false}
      search={false}
      exportButton={false}
      pagination={false}
    />
  );
}
