"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  "system-admin": "System Admin",
  users: "Users",
  delegations: "Delegations",
  reception: "Reception",
  approvals: "Approvals",
  new: "New",
  hospital: "Hospital",
  training: "Training School",
  security: "Security",
  it: "IT",
  department: "Department",
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function labelFor(segment: string) {
  if (UUID_PATTERN.test(segment)) {
    return "Engagement";
  }
  return (
    SEGMENT_LABELS[segment] ??
    segment.charAt(0).toUpperCase() + segment.slice(1)
  );
}

export function DashboardBreadcrumbs({ homeHref }: { homeHref: string }) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const homeSegments = homeHref.split("/").filter(Boolean);
  const restSegments = segments.slice(homeSegments.length);

  const crumbs = [
    { label: "Home", href: homeHref },
    ...restSegments.map((segment, index) => ({
      label: labelFor(segment),
      href: `${homeHref}/${restSegments.slice(0, index + 1).join("/")}`,
    })),
  ];

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        {crumbs.map((crumb, index) =>
          index < crumbs.length - 1 ? (
            <Fragment key={crumb.href}>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={crumb.href}>{crumb.label}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </Fragment>
          ) : (
            <BreadcrumbItem key={crumb.href}>
              <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
            </BreadcrumbItem>
          ),
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
