"use client";

import { useRegistrationLanguage } from "@/components/workflow/registration-language-provider";

// Shown when /register is opened without a token, or with one that has been
// revoked or already used. Translated because a Chinese visitor hitting a
// dead link needs to understand what to do next.
export function RegistrationInvalidLink() {
  const { t } = useRegistrationLanguage();

  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card py-16 text-center">
      <h2 className="text-lg font-semibold text-foreground">
        {t("This invitation link is invalid")}
      </h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        {t(
          "It may have been revoked, already used, or copied incorrectly. Contact the Department Head who invited you for a new link.",
        )}
      </p>
    </div>
  );
}
