import { MailIcon } from "lucide-react";
import { redirect } from "next/navigation";

import { InvitationRow } from "@/app/dashboard/(workflow)/department/invitation-row";
import { InviteForm } from "@/app/dashboard/(workflow)/department/invite-form";
import { PageHeader } from "@/components/layout/page-header";
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

export default async function DepartmentQueuePage() {
  const session = await requirePinConfirmed();

  if (!session.workflowRoles.includes("DepartmentHead")) {
    redirect("/dashboard");
  }

  const canManage = session.systemRole !== "Guest";
  const invitations = await listInvitationsForIssuer(session.staffUserId);

  return (
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

      <div className="overflow-x-auto bg-card">
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
      </div>
    </div>
  );
}
