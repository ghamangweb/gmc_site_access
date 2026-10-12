import { UsersRound } from "lucide-react";
import Link from "next/link";

import { UserRow } from "@/app/dashboard/system-admin/users/user-row";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listStaffUsersWithPendingRequests } from "@/lib/services/auth-service";

export default async function AdminUsersPage() {
  const { users, pendingRequests } = await listStaffUsersWithPendingRequests();

  const isPending = (staffUserId: string) =>
    pendingRequests.some((n) => n.requesterStaffUserId === staffUserId);

  const getRequestedRole = (staffUserId: string) =>
    pendingRequests.find((n) => n.requesterStaffUserId === staffUserId)
      ?.requestedRole ?? null;

  const getRequestedDepartment = (staffUserId: string) =>
    pendingRequests.find((n) => n.requesterStaffUserId === staffUserId)
      ?.requestedDepartment ?? null;

  const sortedUsers = [...users].sort((a, b) => {
    const pendingA = isPending(a.id) ? 1 : 0;
    const pendingB = isPending(b.id) ? 1 : 0;
    return pendingB - pendingA;
  });

  return (
    <div>
      <PageHeader
        title="Staff Users"
        subtitle="Provision access and manage PINs for GMC staff."
        actions={
          <Button variant="outline" asChild>
            <Link href="/dashboard/system-admin/delegations">
              Delegated Approvals
            </Link>
          </Button>
        }
      />
      <div className="overflow-x-auto bg-card">
        {sortedUsers.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title="No staff users yet"
            description="Provisioned GMC staff will appear here."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>System Role</TableHead>
                <TableHead>Workflow Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  isPending={isPending(user.id)}
                  requestedRole={getRequestedRole(user.id)}
                  requestedDepartment={getRequestedDepartment(user.id)}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
