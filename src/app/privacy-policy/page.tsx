import type { Metadata } from "next";
import Image from "next/image";

import { CookieConsentBanner } from "@/components/workflow/cookie-consent-banner";
import { PrivacyPolicyContent } from "@/components/workflow/privacy-policy-content";
import { RegistrationLanguageProvider } from "@/components/workflow/registration-language-provider";
import { RegistrationLanguageToggle } from "@/components/workflow/registration-language-toggle";

export const metadata: Metadata = {
  title: "Privacy Policy | GMC Site Access",
};

export default function PrivacyPolicyPage() {
  return (
    <RegistrationLanguageProvider>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-8 sm:px-8 lg:py-12">
        <div className="flex items-center justify-between">
          <Image
            src="/logo_whitebg.png"
            alt="GMC logo"
            width={120}
            height={57}
            priority
          />
          <RegistrationLanguageToggle />
        </div>
        <PrivacyPolicyContent />
      </main>
      <CookieConsentBanner />
    </RegistrationLanguageProvider>
  );
}
