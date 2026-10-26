"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { setupPinAction } from "@/actions/auth";
import { PinInput } from "@/components/auth/pin-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { safeNextPath } from "@/lib/auth/next-path";

export default function PinSetupPage() {
  const router = useRouter();
  const [pin, setPin] = useState<string[]>(["", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState<string[]>(["", "", "", ""]);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    const pinValue = pin.join("");
    const confirmValue = confirmPin.join("");

    if (pinValue.length !== 4 || confirmValue.length !== 4) {
      toast.error("Incomplete PIN", {
        description: "Enter both PIN fields to continue.",
      });
      return;
    }

    startTransition(async () => {
      const result = await setupPinAction(pinValue, confirmValue);
      if (result.success) {
        // Back to the page they originally asked for, if the proxy sent
        // them here from one. Read at submit time, so the page stays static.
        const next = safeNextPath(
          new URLSearchParams(window.location.search).get("next"),
        );
        router.push(next ?? "/dashboard");
      } else {
        toast.error("Couldn't set PIN", { description: result.error });
        setPin(["", "", "", ""]);
        setConfirmPin(["", "", "", ""]);
      }
    });
  }

  return (
    <>
      <div className="flex flex-col items-center gap-6 text-center">
        <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-foreground">
          Set up your PIN
        </h1>
        <p className="max-w-md text-lg leading-8 text-muted-foreground">
          Choose a 4-digit PIN to protect your account.
        </p>
      </div>
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <Label>Set PIN</Label>
          <PinInput
            value={pin}
            onChange={setPin}
            disabled={isPending}
            autoFocus
          />
        </div>
        <div className="flex flex-col items-center gap-2">
          <Label>Confirm PIN</Label>
          <PinInput
            value={confirmPin}
            onChange={setConfirmPin}
            disabled={isPending}
          />
        </div>
        <Button
          onClick={handleSubmit}
          loading={isPending}
          size="lg"
          className="w-full"
        >
          Set PIN
        </Button>
      </div>
    </>
  );
}
