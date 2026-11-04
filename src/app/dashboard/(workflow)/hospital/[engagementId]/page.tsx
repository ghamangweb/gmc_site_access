import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { HospitalForm } from "@/components/workflow/hospital-form";
import { HospitalHandoff } from "@/components/workflow/hospital-handoff";
import { WorkflowExemptionsSummary } from "@/components/workflow/workflow-exemptions-summary";
import { requirePinConfirmed } from "@/lib/auth/guards";
import type { HospitalClearanceStatus } from "@/lib/domain/types";
import {
  getEngagementDetail,
  getHospitalClearanceForEngagement,
  getLatestHospitalClearance,
} from "@/lib/services/workflow-service";

export default async function HospitalDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ engagementId: string }>;
  searchParams: Promise<{ clearance?: string; review?: string }>;
}) {
  const { engagementId } = await params;
  const { clearance: clearanceId, review: reviewId } = await searchParams;
  const session = await requirePinConfirmed();

  if (!session.workflowRoles.includes("HospitalStaff")) {
    redirect("/dashboard");
  }

  const detail = await getEngagementDetail(engagementId);
  if (!detail) {
    notFound();
  }

  const { engagement, person, exemptions } = detail;

  const activeExemptions = exemptions.filter(
    (exemption) => exemption.archivedAt === null,
  );

  const hospitalExempted = activeExemptions.some(
    (exemption) => exemption.stage === "Hospital",
  );

  const isHospitalStaff =
    session.workflowRoles.includes("HospitalStaff") &&
    session.systemRole !== "Guest";

  // Review from the recorded tab: the Fit with Conditions clearance being
  // reviewed, then the form in review mode. The form only shows while the
  // clearance can still be reviewed — the latest one, record past Hospital —
  // which `recordHospitalReview` enforces again on submit.
  if (reviewId) {
    const [reviewed, latest] = await Promise.all([
      getHospitalClearanceForEngagement(engagementId, reviewId),
      getLatestHospitalClearance(engagementId),
    ]);

    if (!reviewed) {
      notFound();
    }

    const reviewable =
      reviewed.clearanceStatus === "FitWithConditions" &&
      latest?.id === reviewed.id &&
      engagement.workflowState !== "AtHospital";

    return (
      <div>
        <PageHeader
          title={person.fullName}
          subtitle={`Passport ${person.passportNo}`}
        />
        <div className="flex flex-col gap-6">
          <HospitalHandoff
            clearance={reviewed}
            title="Clearance Under Review"
          />
          {reviewable ? (
            <HospitalForm
              engagementId={engagementId}
              readOnly={!isHospitalStaff}
              reviewOfClearanceId={reviewed.id}
            />
          ) : (
            <p className="text-muted-foreground text-sm">
              This clearance can no longer be reviewed.
            </p>
          )}
        </div>
      </div>
    );
  }

  // View from the recorded tab: that one clearance, read-only, and no form —
  // even while an Unfit record is still at Hospital. Re-examination is
  // reached from the awaiting tab.
  if (clearanceId) {
    const clearance = await getHospitalClearanceForEngagement(
      engagementId,
      clearanceId,
    );

    if (!clearance) {
      notFound();
    }

    return (
      <div>
        <PageHeader
          title={person.fullName}
          subtitle={`Passport ${person.passportNo}`}
        />
        <HospitalHandoff clearance={clearance} title="Recorded Clearance" />
      </div>
    );
  }

  const latestClearance = await getLatestHospitalClearance(engagementId);

  const readOnly =
    engagement.workflowState !== "AtHospital" ||
    !isHospitalStaff ||
    hospitalExempted;

  return (
    <div>
      {/* Identity only: Hospital records a clearance, it doesn't review the
          engagement. The full record lives with Reception. */}
      <PageHeader
        title={person.fullName}
        subtitle={`Passport ${person.passportNo}`}
      />
      <div className="flex flex-col gap-6">
        <WorkflowExemptionsSummary exemptions={activeExemptions} />
        <HospitalForm
          engagementId={engagementId}
          latestClearance={
            latestClearance && !hospitalExempted
              ? {
                  clearanceStatus:
                    latestClearance.clearanceStatus as HospitalClearanceStatus,
                  doctorComments: latestClearance.doctorComments,
                  clearanceDate: latestClearance.clearanceDate,
                }
              : undefined
          }
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}
