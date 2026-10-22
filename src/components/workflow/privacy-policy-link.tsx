"use client";

import Link from "next/link";

import { useRegistrationLanguage } from "@/components/workflow/registration-language-provider";

export function PrivacyPolicyLink() {
  const { t } = useRegistrationLanguage();

  return (
    <Link
      href="/privacy-policy"
      className="text-sm text-muted-foreground underline underline-offset-2"
    >
      {t("Privacy Policy")}
    </Link>
  );
}
