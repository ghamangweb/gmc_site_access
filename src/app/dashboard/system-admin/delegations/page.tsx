import { UserCheck, UserCog } from "lucide-react";

import { ActiveDelegationRow } from "@/app/dashboard/system-admin/delegations/active-delegation-row";
import { GrantDelegationRow } from "@/app/dashboard/system-admin/delegations/grant-delegation-row";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getStaffByWorkflowRoles,
  listAllEngagementsWithPerson,
} from "@/lib/services/workflow-service";

export default async function DelegationsPage() {
  const [rows, receptionists] = await Promise.all([
    listAllEngagementsWithPerson(),
    getStaffByWorkflowRoles(["Receptionist"]),
  ]);

  const pendingReception = rows.filter(
    ({ engagement }) => engagement.workflowState === "AtReception",
  );
  const activeGrants = pendingReception.filter(
    ({ engagement }) => engagement.delegatedApproverId !== null,
  );
  const candidates = pendingReception.filter(
    ({ engagement }) => engagement.delegatedApproverId === null,
  );

  const receptionistOptions = receptionists.map((r) => ({
    id: r.id,
    displayName: r.displayName,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Delegated Approvals"
        subtitle="Grant a one-off stakeholder approval privilege when CSO, HCM, GMM and EM are all unavailable."
      />

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-foreground">
          Active Delegations
        </h2>
        <div className="overflow-x-auto bg-card">
          {activeGrants.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title="No active delegated approvals"
              description="Grants you make below will show up here while they're in effect."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Visitor</TableHead>
                  <TableHead>Delegated To</TableHead>
                  <TableHead>Granted At</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeGrants.map(({ engagement, person }) => (
                  <ActiveDelegationRow
                    key={engagement.id}
                    engagementId={engagement.id}
                    personName={person.fullName}
                    delegatedApproverName={
                      receptionists.find(
                        (r) => r.id === engagement.delegatedApproverId,
                      )?.displayName ?? "Unknown"
                    }
                    grantedAt={engagement.delegationGrantedAt ?? new Date()}
                    reason={engagement.delegationReason ?? ""}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-foreground">
          Awaiting Stakeholder Approval
        </h2>
        <div className="overflow-x-auto bg-card">
          {candidates.length === 0 ? (
            <EmptyState
              icon={UserCog}
              title="No engagements awaiting approval"
              description="Engagements at Reception without a delegated approver will appear here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Visitor</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map(({ engagement, person }) => (
                  <GrantDelegationRow
                    key={engagement.id}
                    engagementId={engagement.id}
                    personName={person.fullName}
                    receptionists={receptionistOptions}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
