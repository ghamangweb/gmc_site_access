import { AWAITING_COLUMNS } from "@/app/dashboard/(workflow)/hospital/skeleton-columns";
import { QueuePageSkeleton } from "@/components/layout/page-skeletons";

// The default Awaiting view has no Filter button.
export default function Loading() {
  return (
    <QueuePageSkeleton columns={AWAITING_COLUMNS} tabs={3} filter={false} />
  );
}
