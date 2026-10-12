import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";

// Route to each role's workflow dashboard as it ships. Roles without a
// dashboard yet (Training, Security, IT) fall through to the "coming soon"
// placeholder below.
export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }
  if (session.systemRole === "SystemAdmin") {
    redirect("/dashboard/system-admin/users");
  }
  // Stakeholders land on their own queue — approving is their job; they keep
  // access to Reception's queue, it just isn't the first thing they see.
  if (
    (["HCM", "GMM", "DMD"] as const).some((role) =>
      session.workflowRoles.includes(role),
    )
  ) {
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
