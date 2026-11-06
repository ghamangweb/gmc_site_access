import { RECORD_COLUMNS } from "@/app/dashboard/(workflow)/overview/skeleton-columns";
import { QueuePageSkeleton } from "@/components/layout/page-skeletons";

export default function Loading() {
  return <QueuePageSkeleton columns={RECORD_COLUMNS} exportButton={false} />;
}
