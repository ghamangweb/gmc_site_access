"use client";

import { MoreVerticalIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { revokeInvitationAction } from "@/actions/registration";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";

type InvitationRowProps = {
  invitationId: string;
  email: string;
  registrationType: string;
  issuedAt: Date;
  isRevoked: boolean;
  canManage: boolean;
};

export function InvitationRow({
  invitationId,
  email,
  registrationType,
  issuedAt,
  isRevoked,
  canManage,
}: InvitationRowProps) {
  const [isPending, startTransition] = useTransition();

  function handleRevoke() {
    const confirmed = window.confirm(
      `Revoke the invitation sent to ${email}? This cannot be undone.`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await revokeInvitationAction(invitationId);
      if (result.success) {
        toast.success("Invitation revoked");
      } else {
        toast.error("Couldn't revoke invitation", {
          description: result.error,
        });
      }
    });
  }

  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell>{email}</TableCell>
      <TableCell>{registrationType}</TableCell>
      <TableCell>{issuedAt.toLocaleDateString()}</TableCell>
      <TableCell>
        <Badge
          className={
            isRevoked
              ? "bg-status-danger-bg text-status-danger-fg"
              : "bg-status-success-bg text-status-success-fg"
          }
        >
          {isRevoked ? "Revoked" : "Active"}
        </Badge>
      </TableCell>
      {canManage && (
        <TableCell className="text-right">
          {/* Same row menu as every other queue; a revoked link has nothing
              left to revoke. */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={isPending}
              >
                <MoreVerticalIcon />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={isRevoked} onSelect={handleRevoke}>
                Revoke
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      )}
    </TableRow>
  );
}
