"use client";

import { MoreVerticalIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UpdateCardExpiryDialog } from "@/components/workflow/update-card-expiry-dialog";

// Security's "Site Access Granted" row menu, the same vertical-ellipsis shape
// as the approvals queue. The item stays visible, disabled, on cards that
// can't be re-dated (an earlier cycle's card, revoked or awaiting revocation,
// or a read-only viewer).
export function GrantedRowActions({
  engagementId,
  accessProvisioningId,
  personName,
  currentExpiry,
  departureDate,
  canUpdate,
}: {
  engagementId: string;
  accessProvisioningId: string;
  personName: string;
  currentExpiry: string;
  departureDate: string;
  canUpdate: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8">
            <MoreVerticalIcon />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/security/${engagementId}`}>View</Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canUpdate}
            onSelect={() => setOpen(true)}
          >
            Update Card Expiry
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {canUpdate && (
        <UpdateCardExpiryDialog
          engagementId={engagementId}
          accessProvisioningId={accessProvisioningId}
          personName={personName}
          currentExpiry={currentExpiry}
          departureDate={departureDate}
          open={open}
          onOpenChange={setOpen}
          onUpdated={() => router.refresh()}
        />
      )}
    </>
  );
}
