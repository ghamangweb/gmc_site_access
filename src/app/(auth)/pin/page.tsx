"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { verifyPinAction } from "@/actions/auth";
import { PinInput } from "@/components/auth/pin-input";
import { safeNextPath } from "@/lib/auth/next-path";

export default function PinPage() {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(["", "", "", ""]);
  const [isPending, startTransition] = useTransition();

  function handleComplete(pin: string) {
    startTransition(async () => {
      const result = await verifyPinAction(pin);
      if (result.success) {
        // Back to the page they originally asked for, if the proxy sent
        // them here from one. Read at submit time, so the page stays static.
        const next = safeNextPath(
          new URLSearchParams(window.location.search).get("next"),
        );
        router.push(next ?? "/dashboard");
      } else {
        toast.error("Incorrect PIN", { description: result.error });
        setDigits(["", "", "", ""]);
      }
    });
  }

  return (
    <>
      <div className="flex flex-col items-center gap-6 text-center">
        <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-foreground">
          Enter your PIN
        </h1>
        <p className="max-w-md text-lg leading-8 text-muted-foreground">
          Enter your 4-digit PIN to continue.
        </p>
      </div>
      <div className="flex flex-col items-center gap-4">
        <PinInput
          value={digits}
          onChange={setDigits}
          onComplete={handleComplete}
          disabled={isPending}
          autoFocus
        />
        {isPending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Verifying…
          </div>
        )}
      </div>
    </>
  );
}
