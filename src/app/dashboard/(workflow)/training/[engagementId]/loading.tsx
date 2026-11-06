import {
  DetailPageSkeleton,
  FieldsCardSkeleton,
  FormCardSkeleton,
} from "@/components/layout/page-skeletons";

// Name header, what Hospital handed over, then the induction form.
export default function Loading() {
  return (
    <DetailPageSkeleton>
      <FieldsCardSkeleton fields={3} />
      <FormCardSkeleton fields={3} />
    </DetailPageSkeleton>
  );
}
