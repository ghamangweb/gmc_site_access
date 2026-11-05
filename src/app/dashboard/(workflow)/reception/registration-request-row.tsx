import { MoreVerticalIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import { NameWithAttention } from "@/components/workflow/attention-dot";
import { success } from "@/lib/domain/attention";
import { ACCESS_PURPOSE_LABELS } from "@/lib/domain/types";
import type { RegistrationRequestSummary } from "@/lib/services/registration-service";

// A Server Component: the menu links out, so there is no client state here.
// A submission not yet turned into an Engagement is Reception's next job, so
// it carries the green attention dot and a menu to review it or go straight to
// creating the engagement — both the same screen, the second scrolled to the
// form. A converted one has nothing left to do here but open what it became.
export function RegistrationRequestRow({
  request,
  canManage,
}: {
  request: RegistrationRequestSummary;
  canManage: boolean;
}) {
  const reviewHref = `/dashboard/reception/new?requestId=${request.id}`;
  const awaitingReview = !request.engagementId && canManage;

  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell>
        <NameWithAttention
          attention={
            awaitingReview ? success("Submission awaiting review") : undefined
          }
        >
          {request.fullName}
        </NameWithAttention>
      </TableCell>
      <TableCell>{request.registrationType}</TableCell>
      <TableCell>{request.department}</TableCell>
      <TableCell>{ACCESS_PURPOSE_LABELS[request.accessPurpose]}</TableCell>
      <TableCell>
        {request.submittedAt.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </TableCell>
      <TableCell className="text-right">
        {(request.engagementId || canManage) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreVerticalIcon />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {request.engagementId ? (
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/reception/${request.engagementId}`}>
                    View Engagement
                  </Link>
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem asChild>
                    <Link href={reviewHref}>Review</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`${reviewHref}#create-engagement`}>
                      Create Engagement
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TableCell>
    </TableRow>
  );
}
