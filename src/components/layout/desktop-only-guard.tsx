import { MonitorX } from "lucide-react";

export function DesktopOnlyGuard() {
  return (
    <div className="fixed inset-0 z-50 hidden flex-col items-center justify-center gap-4 bg-background p-6 text-center max-lg:flex">
      <MonitorX className="size-12 text-muted-foreground" />
      <h1 className="text-lg font-semibold text-foreground">
        Desktop Required
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        This application needs a wider screen. If you are using a desktop or
        laptop, maximize your browser window. If you are on a phone or tablet,
        switch to a desktop or laptop to continue.
      </p>
    </div>
  );
}
