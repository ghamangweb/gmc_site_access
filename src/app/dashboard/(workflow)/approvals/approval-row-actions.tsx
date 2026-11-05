"use client";

import { MoreVerticalIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { applyStakeholderExemptionAction } from "@/actions/engagements";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExtendStayDialog } from "@/components/workflow/extend-stay-dialog";
import { StakeholderExemptionDialog } from "@/components/workflow/stakeholder-exemption-dialog";
import type { AccessPurpose } from "@/lib/domain/types";

type ApprovalRowActionsProps = {
  engagementId: string;
  personName: string;
  accessPurpose: AccessPurpose;
  departureDate: string;
} & (
  | {
      // Awaiting Approval: open the record to review it, or approve it with an
      // exemption straight from the queue.
      view: "awaiting";
      canBypass: boolean;
    }
  | {
      // Approved: open the record, or move its departure date later.
      view: "approved";
      canExtend: boolean;
    }
);

// The approvals queue's per-row menu. Items the viewer can't use stay in the
// menu, disabled, so the same rows don't grow and shrink between viewers.
export function ApprovalRowActions(props: ApprovalRowActionsProps) {
  const router = useRouter();
  const [bypassOpen, setBypassOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const href = `/dashboard/approvals/${props.engagementId}`;

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
            <Link href={href}>
              {props.view === "awaiting" ? "Review" : "View"}
            </Link>
          </DropdownMenuItem>
          {props.view === "awaiting" ? (
            <DropdownMenuItem
              disabled={!props.canBypass}
              onSelect={() => setBypassOpen(true)}
            >
              Medical By-pass
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              disabled={!props.canExtend}
              onSelect={() => setExtendOpen(true)}
            >
              Extend Stay
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {props.view === "awaiting" && props.canBypass && (
        <StakeholderExemptionDialog
          accessPurpose={props.accessPurpose}
          open={bypassOpen}
          onOpenChange={setBypassOpen}
          onApprove={(input) =>
            applyStakeholderExemptionAction(props.engagementId, input)
          }
          onApproved={() => router.refresh()}
        />
      )}

      {props.view === "approved" && props.canExtend && (
        <ExtendStayDialog
          engagementId={props.engagementId}
          personName={props.personName}
          currentDepartureDate={props.departureDate}
          open={extendOpen}
          onOpenChange={setExtendOpen}
          onExtended={() => router.refresh()}
        />
      )}
    </>
  );
}
