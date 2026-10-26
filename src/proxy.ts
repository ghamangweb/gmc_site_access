import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/entra";
import { withNext } from "@/lib/auth/next-path";
import type { WorkflowRole } from "@/lib/domain/types";

const LAYER_ROLES: Record<string, WorkflowRole[]> = {
  reception: ["Receptionist"],
  // No entry for `approvals`: a delegated approver holds no workflow role at
  // all, so the page itself does the checking (stakeholder role, or the grant
  // on that engagement).
  hospital: ["HospitalStaff"],
  training: ["TrainingStaff"],
  security: ["SecurityStaff"],
};

export default auth((req) => {
  const session = req.auth;
  const { pathname, search } = req.nextUrl;
  // The page asked for, e.g. a record opened from an email. Carried through
  // sign-in and PIN so the user lands on it, not on their default dashboard.
  const requested = `${pathname}${search}`;

  if (!session?.user) {
    return NextResponse.redirect(
      new URL(withNext("/sign-in", requested), req.url),
    );
  }

  if (session.user.systemRole === "User") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  if (!session.user.pinConfirmed) {
    const pinPath = session.user.hasPinSet ? "/pin" : "/pin/setup";
    return NextResponse.redirect(
      new URL(withNext(pinPath, requested), req.url),
    );
  }

  if (pathname.startsWith("/dashboard/system-admin")) {
    if (session.user.systemRole !== "SystemAdmin") {
      return NextResponse.redirect(
        new URL(withNext("/no-access", requested), req.url),
      );
    }
    return NextResponse.next();
  }

  const layer = pathname.split("/")[2];
  const requiredRoles = layer ? LAYER_ROLES[layer] : undefined;
  if (
    requiredRoles &&
    !requiredRoles.some((role) => session.user.workflowRoles.includes(role))
  ) {
    // A page, not a bare "Forbidden": the user is told what happened and
    // given a way back (issue #25).
    return NextResponse.redirect(
      new URL(withNext("/no-access", requested), req.url),
    );
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
