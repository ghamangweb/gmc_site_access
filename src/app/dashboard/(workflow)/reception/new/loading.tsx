import {
  DetailPageSkeleton,
  FormCardSkeleton,
} from "@/components/layout/page-skeletons";

// The Reception form: visitor, engagement and document sections.
export default function Loading() {
  return (
    <DetailPageSkeleton subtitle>
      <FormCardSkeleton fields={6} />
      <FormCardSkeleton fields={4} />
      <FormCardSkeleton fields={2} />
    </DetailPageSkeleton>
  );
}
