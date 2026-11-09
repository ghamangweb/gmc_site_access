import { UserCheck, UserCog } from "lucide-react";

import { ActiveDelegationRow } from "@/app/dashboard/system-admin/delegations/active-delegation-row";
import { GrantDelegationRow } from "@/app/dashboard/system-admin/delegations/grant-delegation-row";
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

// The System Admin dashboard's two delegation tabs. Each fetches only what its
// own table needs, so the Staff Users tab never pays for either.

async function receptionEngagements() {
  const rows = await listAllEngagementsWithPerson();

  return rows.filter(
    ({ engagement }) => engagement.workflowState === "AtReception",
  );
}

// Only records Reception asked a delegate for, not yet granted. A grant moves
// it to Active Delegations; leaving Reception (approved, cancelled) drops it.
export async function DelegationRequestsTable() {
  const [pendingReception, receptionists] = await Promise.all([
    receptionEngagements(),
    getStaffByWorkflowRoles(["Receptionist"]),
  ]);

  const requests = pendingReception
    .filter(
      ({ engagement }) =>
        engagement.delegationRequestedAt !== null &&
        engagement.delegatedApproverId === null,
    )
    .sort(
      (a, b) =>
        (b.engagement.delegationRequestedAt?.getTime() ?? 0) -
        (a.engagement.delegationRequestedAt?.getTime() ?? 0),
    );

  const receptionistOptions = receptionists.map((r) => ({
    id: r.id,
    displayName: r.displayName,
  }));

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={UserCog}
        title="No delegation requests"
        description="When Reception requests a delegated approval, the record appears here until you grant it."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Visitor</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Requested By</TableHead>
          <TableHead>Requested</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map(({ engagement, person }) => (
          <GrantDelegationRow
            key={engagement.id}
            engagementId={engagement.id}
            personName={person.fullName}
            receptionists={receptionistOptions}
            requestReason={engagement.delegationRequestReason ?? ""}
            requestedById={engagement.delegationRequestedBy}
            requestedByName={
              receptionists.find(
                (r) => r.id === engagement.delegationRequestedBy,
              )?.displayName ?? "-"
            }
            requestedAt={engagement.delegationRequestedAt ?? new Date()}
          />
        ))}
      </TableBody>
    </Table>
  );
}

export async function ActiveDelegationTable() {
  const [pendingReception, receptionists] = await Promise.all([
    receptionEngagements(),
    getStaffByWorkflowRoles(["Receptionist"]),
  ]);

  const activeGrants = pendingReception.filter(
    ({ engagement }) => engagement.delegatedApproverId !== null,
  );

  if (activeGrants.length === 0) {
    return (
      <EmptyState
        icon={UserCheck}
        title="No active delegated approvals"
        description="Grants you make from Delegation Requests will show up here while they're in effect."
      />
    );
  }

  return (
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
              receptionists.find((r) => r.id === engagement.delegatedApproverId)
                ?.displayName ?? "Unknown"
            }
            grantedAt={engagement.delegationGrantedAt ?? new Date()}
            reason={engagement.delegationReason ?? ""}
          />
        ))}
      </TableBody>
    </Table>
  );
}
