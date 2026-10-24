import type { Metadata } from "next";
import Link from "next/link";

import { PublicShell } from "@/components/layout/public-shell";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page Not Found | GMC Site Access",
};

// No DesktopOnlyGuard: a mistyped or stale `/register` link lands here on a
// visitor's phone, and they must be able to read it.
export default function NotFound() {
  return (
    <PublicShell>
      <div className="flex flex-col items-center gap-6 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Error 404
        </p>
        <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-foreground">
          Page not found
        </h1>
        <p className="max-w-md text-lg leading-8 text-muted-foreground">
          The page you are looking for does not exist or has been moved.
        </p>
      </div>
      <Button asChild size="lg">
        <Link href="/">Return home</Link>
      </Button>
    </PublicShell>
  );
}
