import { EngagementDetail } from "@/components/workflow/engagement-detail";

export default async function ReceptionDetailPage({
  params,
}: {
  params: Promise<{ engagementId: string }>;
}) {
  const { engagementId } = await params;

  return (
    <EngagementDetail
      engagementId={engagementId}
      queueHref="/dashboard/reception"
    />
  );
}
