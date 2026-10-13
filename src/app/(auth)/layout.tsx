import { DesktopOnlyGuard } from "@/components/layout/desktop-only-guard";
import { PublicShell } from "@/components/layout/public-shell";

// The guard lives here and in the dashboard layout rather than in the root
// layout, so that `/register` — the one page a visitor opens on their own
// phone — stays reachable on any device.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PublicShell>{children}</PublicShell>
      <DesktopOnlyGuard />
    </>
  );
}
