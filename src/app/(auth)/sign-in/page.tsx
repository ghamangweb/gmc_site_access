import Image from "next/image";
import { redirect } from "next/navigation";

import { SubmitButton } from "@/components/ui/submit-button";
import { signIn } from "@/lib/auth/entra";
import { safeNextPath } from "@/lib/auth/next-path";
import { getSession } from "@/lib/auth/session";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // The page that sent them here, if any. After Microsoft sign-in they go
  // straight to it; the proxy then asks for the PIN and keeps it along.
  const next = safeNextPath((await searchParams).next);

  const session = await getSession();
  if (session) {
    redirect(next ?? "/");
  }

  return (
    <>
      <div className="flex flex-col items-center gap-6 text-center">
        <h1 className="uppercase text-2xl font-bold leading-10 tracking-tight text-foreground">
          Ghana Manganese Company Limited
        </h1>
        <p className="max-w-sm text-xl leading-8 text-muted-foreground">
          Site Access Workflow Management System
        </p>
      </div>
      <form
        action={async () => {
          "use server";
          await signIn("microsoft-entra-id", { redirectTo: next ?? "/" });
        }}
      >
        <SubmitButton size="lg" className="w-full md:w-[220px]">
          <Image
            src="/entra_id_logo.svg"
            alt=""
            width={22}
            height={22}
            className="invert"
          />
          Sign in with Microsoft
        </SubmitButton>
      </form>
      <p className="text-xs text-muted-foreground">
        Sign in with your Microsoft account to continue.
      </p>
    </>
  );
}
