import Link from "next/link";

import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { ACCESS_PURPOSE_LABELS } from "@/lib/domain/types";
import type { RegistrationRequestSummary } from "@/lib/services/registration-service";

// A Server Component: unlike ReceptionRow there is no dialog or client state
// here, just a link out to the prefilled form or to the Engagement it already
// produced.
export function RegistrationRequestRow({
  request,
  canManage,
}: {
  request: RegistrationRequestSummary;
  canManage: boolean;
}) {
  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell>{request.fullName}</TableCell>
      <TableCell>{request.identityNo}</TableCell>
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
        {request.engagementId ? (
          // Already turned into an Engagement, so there is nothing to create —
          // the only useful action left is opening what it became. "Converted"
          // described the database's view of it, not the Receptionist's.
          <Button asChild variant="ghost" size="sm">
            <Link href={`/dashboard/reception/${request.engagementId}`}>
              View Engagement
            </Link>
          </Button>
        ) : (
          canManage && (
            <Button asChild size="sm">
              <Link href={`/dashboard/reception/new?requestId=${request.id}`}>
                Create Engagement
              </Link>
            </Button>
          )
        )}
      </TableCell>
    </TableRow>
  );
}
