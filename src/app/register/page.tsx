import Image from "next/image";

import { ScrollArea } from "@/components/ui/scroll-area";
import { LocalRegistrationForm } from "@/components/workflow/local-registration-form";
import { ReceptionForm } from "@/components/workflow/reception-form";
import { RegistrationHeadline } from "@/components/workflow/registration-headline";
import { RegistrationInvalidLink } from "@/components/workflow/registration-invalid-link";
import { RegistrationLanguageProvider } from "@/components/workflow/registration-language-provider";
import { RegistrationLanguageToggle } from "@/components/workflow/registration-language-toggle";
import { getDocumentsForInvitation } from "@/lib/services/document-service";
import { validateInvitationToken } from "@/lib/services/invitation-service";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  const invitation = token ? await validateInvitationToken(token) : null;

  const uploadedDocuments = invitation
    ? await getDocumentsForInvitation(invitation.id)
    : [];

  return (
    <RegistrationLanguageProvider>
      <div className="flex h-screen overflow-hidden">
        <aside className="relative hidden h-screen w-1/2 shrink-0 overflow-hidden lg:block">
          <Image
            src="/bg-auth.jpg"
            alt=""
            fill
            sizes="50vw"
            priority
            className="object-cover brightness-50"
          />
          <div className="relative z-10 flex h-full flex-col justify-between p-12">
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

        <ScrollArea className="h-screen w-full min-w-0 bg-background lg:w-1/2">
          <main className="p-10">
            <div className="mb-6 flex justify-end">
              <RegistrationLanguageToggle />
            </div>

            {invitation && token ? (
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
    </RegistrationLanguageProvider>
  );
}
