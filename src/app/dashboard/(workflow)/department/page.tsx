import { InboxIcon, MailIcon } from "lucide-react";
import { redirect } from "next/navigation";

import { InvitationRow } from "@/app/dashboard/(workflow)/department/invitation-row";
import { InviteForm } from "@/app/dashboard/(workflow)/department/invite-form";
import {
  INVITATION_COLUMNS,
  SUBMISSION_COLUMNS,
} from "@/app/dashboard/(workflow)/department/skeleton-columns";
import { SubmissionRow } from "@/app/dashboard/(workflow)/department/submission-row";
import { PageHeader } from "@/components/layout/page-header";
import { TableSkeleton } from "@/components/layout/page-skeletons";
import {
  QueuePending,
  QueueTransitionProvider,
} from "@/components/layout/queue-transition";
import { QueueViewTabs } from "@/components/layout/queue-view-tabs";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requirePinConfirmed } from "@/lib/auth/guards";
import { listInvitationsForIssuer } from "@/lib/services/invitation-service";
import { listRegistrationRequestsForDepartment } from "@/lib/services/registration-service";

export default async function DepartmentQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const session = await requirePinConfirmed();

  if (!session.workflowRoles.includes("DepartmentHead")) {
    redirect("/dashboard");
  }

  const canManage = session.systemRole !== "Guest";
  // Two tabs, like every other queue; only the active one is queried.
  const { view } = await searchParams;
  const activeView = view === "invitations" ? "invitations" : "submissions";
  const [invitations, submissions] = await Promise.all([
    activeView === "invitations"
      ? listInvitationsForIssuer(session.staffUserId)
      : [],
    activeView === "submissions"
      ? listRegistrationRequestsForDepartment(session.staffUserId)
      : [],
  ]);
  const views = [
    {
      label: "Submitted Registrations",
      value: "submissions",
      href: "/dashboard/department",
    },
    {
      label: "Invitations",
      value: "invitations",
      href: "/dashboard/department?view=invitations",
    },
  ];

  return (
    <QueueTransitionProvider>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Department Invitations"
          subtitle="Invite visitors to register and manage the invitation links you've sent."
        />

        {canManage && (
          <div className="bg-card border border-border rounded-xl p-6">
            <InviteForm />
          </div>
        )}

        <QueueViewTabs views={views} activeView={activeView} />

        {/* Submissions wait here for the Head's decision; only an approved one
            reaches Reception. */}
        {activeView === "submissions" && (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <QueuePending
              fallback={<TableSkeleton columns={SUBMISSION_COLUMNS} />}
            >
              {submissions.length === 0 ? (
                <EmptyState
                  icon={InboxIcon}
                  title="No submissions yet"
                  description="Registrations submitted from your invitation links will show up here for approval."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Nature of Visit</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      {canManage && (
                        <TableHead className="text-right">Actions</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((request) => (
                      <SubmissionRow
                        key={request.id}
                        request={request}
                        canManage={canManage}
                      />
                    ))}
                  </TableBody>
                </Table>
              )}
            </QueuePending>
          </div>
        )}

        {activeView === "invitations" && (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <QueuePending
              fallback={<TableSkeleton columns={INVITATION_COLUMNS} />}
            >
              {invitations.length === 0 ? (
                <EmptyState
                  icon={MailIcon}
                  title="No invitations sent yet"
                  description="Invitations you send will appear here."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Email</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Status</TableHead>
                      {canManage && (
                        <TableHead className="text-right">Actions</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map((invitation) => (
                      <InvitationRow
                        key={invitation.id}
                        invitationId={invitation.id}
                        email={invitation.email}
                        registrationType={invitation.registrationType}
                        issuedAt={invitation.issuedAt}
                        isRevoked={!!invitation.revokedAt}
                        canManage={canManage}
                      />
                    ))}
                  </TableBody>
                </Table>
              )}
            </QueuePending>
          </div>
        )}
      </div>
    </QueueTransitionProvider>
  );
}
