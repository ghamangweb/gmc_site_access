"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { forwardToITAction } from "@/actions/engagements";
import { Button } from "@/components/ui/button";

export function ForwardToITButton({ engagementId }: { engagementId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleForward() {
    const confirmed = window.confirm(
      "Forward this record to IT for access setup? Security's review is complete once you do.",
    );

    if (!confirmed) return;

    startTransition(async () => {
      const result = await forwardToITAction(engagementId);

      if (!result.success) {
        toast.error(result.error);

        return;
      }

      if (result.warning) {
        toast.warning(result.warning);
      } else {
        toast.success("Forwarded to IT");
      }

      router.push("/dashboard/security");
    });
  }

  return (
    <Button type="button" onClick={handleForward} loading={isPending}>
      Forward to IT
    </Button>
  );
}
