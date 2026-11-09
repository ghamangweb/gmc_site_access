"use client";

import { MoreVerticalIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DelegatedApprovalDialog,
  useRequestApproval,
} from "@/components/workflow/approval-request-actions";

type RejectedRowActionsProps = {
  engagementId: string;
  canManage: boolean;
};

// A rejected record is at Reception with its request cleared, so both
// requests are always open to it — no eligibility props needed.
export function RejectedRowActions({
  engagementId,
  canManage,
}: RejectedRowActionsProps) {
  const [delegateOpen, setDelegateOpen] = useState(false);
  const { requestApproval, isRequesting } = useRequestApproval(engagementId);

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
            <Link href={`/dashboard/reception/${engagementId}`}>View</Link>
          </DropdownMenuItem>
          {canManage && (
            <>
              <DropdownMenuItem
                disabled={isRequesting}
                onSelect={requestApproval}
              >
                Request Approval
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setDelegateOpen(true)}>
                Request Delegated Approval
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {canManage && (
        <DelegatedApprovalDialog
          engagementId={engagementId}
          open={delegateOpen}
          onOpenChange={setDelegateOpen}
        />
      )}
    </>
  );
}
