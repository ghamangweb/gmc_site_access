import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SessionRefresher } from "@/app/(auth)/unauthorized/session-refresher";
import { Button } from "@/components/ui/button";
import { safeNextPath } from "@/lib/auth/next-path";
import { getSession } from "@/lib/auth/session";
import { getStaffUserById } from "@/lib/services/auth-service";

export const metadata: Metadata = {
  title: "No Access | GMC Site Access",
};

function sameRoles(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((role) => b.includes(role));
}

// Where the proxy sends a signed-in user who opens a page their role does not
// cover, e.g. a link meant for another layer. It replaced a bare "Forbidden"
// response that gave no explanation and no way back (issue #25).
//
// Roles live in the session, copied at sign-in, so a role an admin grants
// while someone is signed in would be refused here until they signed out and
// in again (issue #19). The database is checked first: if the roles have
// changed, the session is refreshed (which asks for the PIN again) and the
// user is sent on to the page they asked for.
export default async function NoAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  const next = safeNextPath((await searchParams).next) ?? "/dashboard";
  const user = await getStaffUserById(session.staffUserId);

  if (
    user &&
    !user.deactivatedAt &&
    (user.systemRole !== session.systemRole ||
      !sameRoles(user.workflowRoles, session.workflowRoles))
  ) {
    return <SessionRefresher next={next} />;
  }

  return (
    <>
      <div className="flex flex-col items-center gap-6 text-center">
        <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-foreground">
          No access
        </h1>
        <p className="max-w-md text-lg leading-8 text-muted-foreground">
          You don&apos;t have access to this page. If you think you should, ask
          a System Administrator to check your role.
        </p>
      </div>
      <Button asChild size="lg">
        <Link href="/dashboard">Return to dashboard</Link>
      </Button>
    </>
  );
}
