import { EngagementDetail } from "@/components/workflow/engagement-detail";

// The same record a Receptionist sees, reached from the approvals queue — so
// the breadcrumb reads Home › Dashboard › Approvals › Engagement and a
// stakeholder is never routed through Reception.
export default async function ApprovalDetailPage({
  params,
}: {
  params: Promise<{ engagementId: string }>;
}) {
  const { engagementId } = await params;

  return (
    <EngagementDetail
      engagementId={engagementId}
      queueHref="/dashboard/approvals"
    />
  );
}
