"use client";

import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";

import { useRegistrationLanguage } from "@/components/workflow/registration-language-provider";

export function PrivacyPolicyLink() {
  const { t } = useRegistrationLanguage();

  return (
    // A new tab, so a visitor reading the policy mid-registration comes back
    // to the form as they left it: nothing typed is saved, and the invite
    // token lives only in this tab's URL.
    <Link
      href="/privacy-policy"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground underline underline-offset-2"
    >
      {t("Privacy Policy")}
      <ExternalLinkIcon aria-hidden="true" className="size-3.5" />
      <span className="sr-only">{t("(opens in a new tab)")}</span>
    </Link>
  );
}
