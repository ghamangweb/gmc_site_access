import { redirect } from "next/navigation";

// Delegations are now tabs on the System Admin dashboard. This route stays so
// the delegated-approval email's "Review request" link still lands on them.
export default async function DelegationsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;

  redirect(
    `/dashboard/system-admin/users?view=${view === "active" ? "active" : "requests"}`,
  );
}
