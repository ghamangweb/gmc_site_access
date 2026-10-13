import { redirect } from "next/navigation";

import { DashboardBreadcrumbs } from "@/components/layout/dashboard-breadcrumbs";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { DesktopOnlyGuard } from "@/components/layout/desktop-only-guard";
import { getSession } from "@/lib/auth/session";
import {
  getRecentNotifications,
  getUnreadNotificationCount,
  type NotificationRow,
} from "@/lib/services/notification-service";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  let unreadCount = 0;
  let recentNotifications: NotificationRow[] = [];
  try {
    [unreadCount, recentNotifications] = await Promise.all([
      getUnreadNotificationCount(session.staffUserId),
      getRecentNotifications(session.staffUserId),
    ]);
  } catch (error) {
    console.error("[dashboard/layout]", error);
  }

  return (
    <DashboardShell
      homeHref="/dashboard"
      userName={session.displayName ?? session.email ?? "Account"}
      userEmail={session.email ?? ""}
      userImage={session.image}
      unreadCount={unreadCount}
      notifications={recentNotifications}
    >
      <DashboardBreadcrumbs homeHref="/dashboard" />
      {children}
      {/* Staff screens genuinely need a desktop; the public /register page
          deliberately has no guard. */}
      <DesktopOnlyGuard />
    </DashboardShell>
  );
}
