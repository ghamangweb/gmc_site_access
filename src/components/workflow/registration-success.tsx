"use client";

import { CheckIcon } from "lucide-react";

import { useRegistrationLanguage } from "@/components/workflow/registration-language-provider";

// What a visitor sees after submitting. Shared by both public forms so the
// Local and Foreign paths can't drift apart.
//
// "Registration" is GMC's internal word for this stage — the visitor just
// filled in a registration form, so that is what it is called here.
export function RegistrationSuccess() {
  const { t } = useRegistrationLanguage();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6 text-center">
      {/* Two rings: a soft halo around a solid disc, so the mark reads as a
          deliberate confirmation rather than a stray icon. */}
      <div className="flex size-24 items-center justify-center rounded-full bg-status-success-bg">
        <div className="flex size-16 items-center justify-center rounded-full bg-status-success">
          <CheckIcon
            className="size-9 text-primary-foreground"
            strokeWidth={3}
          />
        </div>
      </div>

      {/* items-center matters: without it the column defaults to `stretch`,
          and `max-w-sm` on the paragraph below pins it to the left edge of the
          block while its text is still centred — which reads as misaligned. */}
      <div className="flex flex-col items-center gap-2">
        <h2 className="max-w-md font-semibold text-2xl text-foreground">
          {t("Thank you! Your registration has been submitted")}
        </h2>
        <p className="max-w-sm text-muted-foreground text-sm">
          {t("GMC staff will be in touch with next steps.")}
        </p>
      </div>
    </div>
  );
}
