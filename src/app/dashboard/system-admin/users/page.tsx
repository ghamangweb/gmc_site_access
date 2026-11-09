import {
  ActiveDelegationTable,
  DelegationRequestsTable,
} from "@/app/dashboard/system-admin/delegations/delegation-tables";
import {
  ACTIVE_COLUMNS,
  REQUEST_COLUMNS,
} from "@/app/dashboard/system-admin/delegations/skeleton-columns";
import { USER_COLUMNS } from "@/app/dashboard/system-admin/users/skeleton-columns";
import { StaffUsersTable } from "@/app/dashboard/system-admin/users/staff-users-table";
import { PageHeader } from "@/components/layout/page-header";
import { TableSkeleton } from "@/components/layout/page-skeletons";
import {
  QueuePending,
  QueueTransitionProvider,
} from "@/components/layout/queue-transition";
import { QueueViewTabs } from "@/components/layout/queue-view-tabs";
import { requireSystemAdmin } from "@/lib/auth/guards";

// The System Admin dashboard: every admin table on one page, one at a time,
// chosen by `view` like the workflow queues. Staff Users is the default.
// `/dashboard/system-admin/delegations` redirects to the Delegation Requests tab.
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const session = await requireSystemAdmin();
  const { view } = await searchParams;
  const activeView = view === "requests" || view === "active" ? view : "users";

  const firstName = session.displayName?.split(" ")[0] ?? "there";

  const views = [
    {
      label: "Staff Users",
      value: "users",
      href: "/dashboard/system-admin/users",
    },
    {
      label: "Delegation Requests",
      value: "requests",
      href: "/dashboard/system-admin/users?view=requests",
    },
    {
      label: "Active Delegations",
      value: "active",
      href: "/dashboard/system-admin/users?view=active",
    },
  ];

  const fallbackColumns =
    activeView === "requests"
      ? REQUEST_COLUMNS
      : activeView === "active"
        ? ACTIVE_COLUMNS
        : USER_COLUMNS;

  return (
    <QueueTransitionProvider>
      <div>
        <PageHeader
          title={`Welcome back, ${firstName}!`}
          subtitle="Here, you'll manage staff access and delegated approvals."
        />

        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <QueueViewTabs views={views} activeView={activeView} />
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <QueuePending fallback={<TableSkeleton columns={fallbackColumns} />}>
            {activeView === "users" && <StaffUsersTable />}
            {activeView === "requests" && <DelegationRequestsTable />}
            {activeView === "active" && <ActiveDelegationTable />}
          </QueuePending>
        </div>
      </div>
    </QueueTransitionProvider>
  );
}
