import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { STAKEHOLDER_ROLES } from "@/lib/domain/types";

// Route to each role's workflow dashboard. Every workflow role now has one,
// so the placeholder below is only reached by a provisioned user with no
// workflow role at all.
export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }
  if (session.systemRole === "SystemAdmin") {
    redirect("/dashboard/system-admin/users");
  }
  // Stakeholders land on their own queue — approving is their job. Reception's
  // queue is Receptionist-only (the proxy shows them "No access" there).
  if (STAKEHOLDER_ROLES.some((role) => session.workflowRoles.includes(role))) {
    redirect("/dashboard/approvals");
  }

  if (session.workflowRoles.includes("Receptionist")) {
    redirect("/dashboard/reception");
  }
  if (session.workflowRoles.includes("HospitalStaff")) {
    redirect("/dashboard/hospital");
  }

  if (session.workflowRoles.includes("TrainingStaff")) {
    redirect("/dashboard/training");
  }

  if (session.workflowRoles.includes("SecurityStaff")) {
    redirect("/dashboard/security");
  }

  if (session.workflowRoles.includes("DepartmentHead")) {
    redirect("/dashboard/department");
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
      <h1 className="text-2xl font-semibold text-foreground">
        Dashboard coming soon
      </h1>
      <p className="text-sm text-muted-foreground">
        Your workflow dashboard hasn&apos;t been built yet for this role. Check
        back once it ships.
      </p>
    </div>
  );
}
