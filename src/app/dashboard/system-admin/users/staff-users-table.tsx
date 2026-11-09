import { UsersRound } from "lucide-react";

import { UserRow } from "@/app/dashboard/system-admin/users/user-row";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listStaffUsersWithPendingRequests } from "@/lib/services/auth-service";

// The System Admin dashboard's Staff Users tab.
export async function StaffUsersTable() {
  const { users, pendingRequests } = await listStaffUsersWithPendingRequests();

  const isPending = (staffUserId: string) =>
    pendingRequests.some((n) => n.requesterStaffUserId === staffUserId);

  const getRequestedRole = (staffUserId: string) =>
    pendingRequests.find((n) => n.requesterStaffUserId === staffUserId)
      ?.requestedRole ?? null;

  const getRequestedDepartment = (staffUserId: string) =>
    pendingRequests.find((n) => n.requesterStaffUserId === staffUserId)
      ?.requestedDepartment ?? null;

  // Pending requests first (they need action), deactivated users last (they
  // need none).
  const sortedUsers = [...users].sort((a, b) => {
    const deactivatedA = a.deactivatedAt ? 1 : 0;
    const deactivatedB = b.deactivatedAt ? 1 : 0;

    if (deactivatedA !== deactivatedB) {
      return deactivatedA - deactivatedB;
    }

    return (isPending(b.id) ? 1 : 0) - (isPending(a.id) ? 1 : 0);
  });

  return sortedUsers.length === 0 ? (
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
  );
}
