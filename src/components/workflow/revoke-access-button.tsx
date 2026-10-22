"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { revokeAccessAction } from "@/actions/engagements";
import { Button } from "@/components/ui/button";

export function RevokeAccessButton({
  engagementId,
  personName,
}: {
  engagementId: string;
  personName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRevoke() {
    const confirmed = window.confirm(
      `Revoke site access for ${personName}? Their access card stops working and this cannot be undone.`,
    );

    if (!confirmed) return;

    startTransition(async () => {
      const result = await revokeAccessAction(engagementId);

      if (!result.success) {
        toast.error(result.error);

        return;
      }

      if (result.warning) {
        toast.warning(result.warning);
      } else {
        toast.success("Access revoked");
      }

      router.refresh();
    });
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      loading={isPending}
      onClick={handleRevoke}
    >
      Revoke Access
    </Button>
  );
}
