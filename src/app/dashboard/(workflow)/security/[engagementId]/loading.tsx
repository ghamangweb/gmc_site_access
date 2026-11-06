import {
  DetailPageSkeleton,
  FieldsCardSkeleton,
  FormCardSkeleton,
} from "@/components/layout/page-skeletons";

// Name header, the prior layers, the record's details, then the card form.
export default function Loading() {
  return (
    <DetailPageSkeleton>
      <FieldsCardSkeleton fields={6} />
      <FieldsCardSkeleton fields={12} />
      <FormCardSkeleton fields={2} />
    </DetailPageSkeleton>
  );
}
