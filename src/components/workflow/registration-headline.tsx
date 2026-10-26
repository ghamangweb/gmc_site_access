"use client";

import { useRegistrationLanguage } from "@/components/workflow/registration-language-provider";

// The page's only <h1>, rendered over the image pane. A client component
// purely so it can follow the language toggle — the page around it stays a
// Server Component.
export function RegistrationHeadline() {
  const { t } = useRegistrationLanguage();

  return (
    <h1 className="max-w-md text-2xl font-semibold xl:text-3xl leading-tight text-primary-foreground">
      {t("Ghana Manganese Company Mine Site Access Registration")}
    </h1>
  );
}
