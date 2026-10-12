import {
  DashboardTopbar,
  type NotificationItem,
} from "@/components/layout/dashboard-topbar";

export function DashboardShell({
  homeHref,
  userName,
  userEmail,
  userImage,
  unreadCount,
  notifications,
  children,
}: {
  homeHref: string;
  userName: string;
  userEmail: string;
  userImage: string | null;
  unreadCount: number;
  notifications: NotificationItem[];
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <DashboardTopbar
        homeHref={homeHref}
        userName={userName}
        userEmail={userEmail}
        userImage={userImage}
        unreadCount={unreadCount}
        notifications={notifications}
      />
      <main className="mx-auto w-full max-w-7xl p-6">{children}</main>
    </div>
  );
}
