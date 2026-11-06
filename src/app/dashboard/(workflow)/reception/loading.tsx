import { SUBMISSION_COLUMNS } from "@/app/dashboard/(workflow)/reception/skeleton-columns";
import { QueuePageSkeleton } from "@/components/layout/page-skeletons";

export default function Loading() {
  return (
    <QueuePageSkeleton columns={SUBMISSION_COLUMNS} tabs={3} headerAction />
  );
}
