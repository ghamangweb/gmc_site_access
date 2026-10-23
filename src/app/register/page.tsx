import Image from "next/image";

import { ScrollArea } from "@/components/ui/scroll-area";
import { CookieConsentBanner } from "@/components/workflow/cookie-consent-banner";
import { LocalRegistrationForm } from "@/components/workflow/local-registration-form";
import { PrivacyPolicyLink } from "@/components/workflow/privacy-policy-link";
import { ReceptionForm } from "@/components/workflow/reception-form";
import { RegistrationHeadline } from "@/components/workflow/registration-headline";
import { RegistrationInvalidLink } from "@/components/workflow/registration-invalid-link";
import { RegistrationLanguageProvider } from "@/components/workflow/registration-language-provider";
import { RegistrationLanguageToggle } from "@/components/workflow/registration-language-toggle";
import { RegistrationSuccess } from "@/components/workflow/registration-success";
import { getDocumentsForInvitation } from "@/lib/services/document-service";
import { validateInvitationToken } from "@/lib/services/invitation-service";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; preview?: string }>;
}) {
  const { token, preview } = await searchParams;

  // `?preview=success` renders the post-submit screen without filling the form
  // in. Guarded on NODE_ENV so it can never become a public surface in
  // production — it exists to review the design, not as a feature.
  const previewSuccess =
    preview === "success" && process.env.NODE_ENV !== "production";

  const invitation = token ? await validateInvitationToken(token) : null;

  const uploadedDocuments = invitation
    ? await getDocumentsForInvitation(invitation.id)
    : [];

  return (
    <RegistrationLanguageProvider>
      <div className="flex min-h-screen lg:h-screen lg:overflow-hidden">
        <aside className="relative hidden h-screen w-1/2 shrink-0 overflow-hidden lg:block">
          <Image
            src="/bg-auth.jpg"
            alt=""
            fill
            sizes="50vw"
            priority
            className="object-cover brightness-50"
          />
          {/* Logo and headline read as one block. They were previously pinned
              to opposite ends of a full-height column by `justify-between`,
              which on a tall pane left them floating unrelated to each other. */}
          <div className="relative z-10 flex h-full flex-col justify-end gap-6 p-12">
            <div className="inline-flex self-start rounded-xl bg-card p-4">
              <Image
                src="/logo_whitebg.png"
                alt="GMC logo"
                width={120}
                height={57}
                priority
              />
            </div>
            <RegistrationHeadline />
          </div>
        </aside>

        <ScrollArea className="w-full min-w-0 bg-background lg:h-screen lg:w-1/2">
          <main className="px-5 py-8 sm:px-8 lg:p-10">
            <div className="mb-6 flex items-center justify-between">
              <PrivacyPolicyLink />
              <RegistrationLanguageToggle />
            </div>

            {previewSuccess ? (
              <RegistrationSuccess />
            ) : invitation && token ? (
              invitation.registrationType === "Local" ? (
                <LocalRegistrationForm
                  token={token}
                  uploadedDocuments={uploadedDocuments}
                  defaultValues={{ gmcLiaisonPerson: invitation.issuerName }}
                />
              ) : (
                <ReceptionForm
                  publicToken={token}
                  uploadedDocuments={uploadedDocuments}
                  defaultValues={{
                    gmcLiaisonPerson: invitation.issuerName,
                    gmcLiaisonDept: invitation.department,
                  }}
                />
              )
            ) : (
              <RegistrationInvalidLink />
            )}
          </main>
        </ScrollArea>
      </div>
      <CookieConsentBanner />
    </RegistrationLanguageProvider>
  );
}
