"use client";

import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useRegistrationLanguage } from "@/components/workflow/registration-language-provider";
import { readConsent, writeConsent } from "@/lib/consent";

export function CookieConsentBanner() {
  const { locale, setLocale, t } = useRegistrationLanguage();
  // Hidden on the server and first client render: whether a choice exists is
  // only knowable from localStorage, and rendering it earlier would mismatch
  // the server HTML for a returning visitor.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(readConsent() === null);
  }, []);

  if (!visible) {
    return null;
  }

  function accept() {
    writeConsent("accepted");
    // The language chosen before accepting is now allowed to be remembered.
    setLocale(locale);
    setVisible(false);
  }

  function deny() {
    writeConsent("denied");
    setVisible(false);
  }

  return (
    <section
      aria-label={t("Your cookie choices")}
      className="fixed inset-x-4 bottom-4 z-50 flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-lg sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm"
    >
      <h2 className="text-sm font-semibold text-foreground">
        {t("Your cookie choices")}
      </h2>
      <p className="text-xs text-muted-foreground">
        {t(
          "By clicking “Accept”, you agree to this site remembering your language choice on your device. We do not use cookies for analytics or marketing. The details you submit are used only to process your site-access request.",
        )}{" "}
        {/* New tab, as with PrivacyPolicyLink: leaving /register would lose the form. */}
        <Link
          href="/privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-foreground underline underline-offset-2"
        >
          {t("Privacy Policy")}
          <ExternalLinkIcon aria-hidden="true" className="size-3" />
          <span className="sr-only">{t("(opens in a new tab)")}</span>
        </Link>
      </p>
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={deny}
        >
          {t("Deny")}
        </Button>
        <Button type="button" className="flex-1" onClick={accept}>
          {t("Accept")}
        </Button>
      </div>
    </section>
  );
}
