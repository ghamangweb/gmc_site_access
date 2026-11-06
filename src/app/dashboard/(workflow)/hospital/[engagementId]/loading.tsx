import {
  DetailPageSkeleton,
  FormCardSkeleton,
} from "@/components/layout/page-skeletons";

// Name header, then the clearance form.
export default function Loading() {
  return (
    <DetailPageSkeleton>
      <FormCardSkeleton fields={3} />
    </DetailPageSkeleton>
  );
}
