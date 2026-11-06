import { AWAITING_COLUMNS } from "@/app/dashboard/(workflow)/training/skeleton-columns";
import { QueuePageSkeleton } from "@/components/layout/page-skeletons";

export default function Loading() {
  return <QueuePageSkeleton columns={AWAITING_COLUMNS} tabs={2} />;
}
