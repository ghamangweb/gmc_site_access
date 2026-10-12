import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/entra";
import type { WorkflowRole } from "@/lib/domain/types";

const LAYER_ROLES: Record<string, WorkflowRole[]> = {
  reception: ["Receptionist"],
  // No entry for `approvals`: a delegated approver holds no workflow role at
  // all, so the page itself does the checking (stakeholder role, or the grant
  // on that engagement).
  hospital: ["HospitalStaff"],
  training: ["TrainingStaff"],
  security: ["SecurityStaff"],
  it: ["ITStaff"],
};

export default auth((req) => {
  const session = req.auth;
  const { pathname } = req.nextUrl;

  if (!session?.user) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  if (session.user.systemRole === "User") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  if (!session.user.pinConfirmed) {
    const pinPath = session.user.hasPinSet ? "/pin" : "/pin/setup";
    return NextResponse.redirect(new URL(pinPath, req.url));
  }

  if (pathname.startsWith("/dashboard/system-admin")) {
    if (session.user.systemRole !== "SystemAdmin") {
      return new NextResponse("Forbidden", { status: 403 });
    }
    return NextResponse.next();
  }

  const layer = pathname.split("/")[2];
  const requiredRoles = layer ? LAYER_ROLES[layer] : undefined;
  if (
    requiredRoles &&
    !requiredRoles.some((role) => session.user.workflowRoles.includes(role))
  ) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
