"use client";

import { MoreHorizontalIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  deactivateUserAction,
  provisionUserAction,
  reactivateUserAction,
  resetPinAction,
  revokeAccessAction,
} from "@/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  GMC_LIAISON_DEPARTMENTS,
  type GmcLiaisonDepartment,
  type SystemRole,
  type WorkflowRole,
} from "@/lib/domain/types";

const SYSTEM_ROLES: SystemRole[] = ["Guest", "Admin", "SystemAdmin"];
const WORKFLOW_ROLES: WorkflowRole[] = [
  "Receptionist",
  "HCM",
  "GMM",
  "DMD",
  "HospitalStaff",
  "TrainingStaff",
  "SecurityStaff",
  "ITStaff",
  "DepartmentHead",
];
const NO_WORKFLOW_ROLE = "none";

type StaffUserRow = {
  id: string;
  displayName: string;
  email: string;
  systemRole: string;
  workflowRoles: string[];
  department: string | null;
  provisionedAt: Date | null;
  deactivatedAt: Date | null;
};

function roleBadge(key: string, value: string, htmlId: string, label: string) {
  return (
    <label key={key} htmlFor={htmlId} className="cursor-pointer">
      <Badge
        variant="outline"
        className="gap-2 border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary has-[[data-state=checked]]:text-primary-foreground"
      >
        <RadioGroupItem
          value={value}
          id={htmlId}
          className="border-muted-foreground data-[state=checked]:border-primary-foreground [&_svg]:fill-primary-foreground"
        />
        {label}
      </Badge>
    </label>
  );
}

export function UserRow({
  user,
  isPending,
  requestedRole,
  requestedDepartment,
}: {
  user: StaffUserRow;
  isPending: boolean;
  requestedRole: string | null;
  requestedDepartment: string | null;
}) {
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [systemRole, setSystemRole] = useState<SystemRole>(
    user.systemRole === "User" ? "Guest" : (user.systemRole as SystemRole),
  );
  const [workflowRole, setWorkflowRole] = useState<string>(
    (user.workflowRoles[0] as WorkflowRole | undefined) ?? NO_WORKFLOW_ROLE,
  );
  const [department, setDepartment] = useState<GmcLiaisonDepartment | "">(
    (user.department as GmcLiaisonDepartment | null) ?? "",
  );
  const [isSubmitting, startTransition] = useTransition();

  function handleProvision() {
    const finalSystemRole: SystemRole = requestedRole
      ? requestedRole === "Guest"
        ? "Guest"
        : "Admin"
      : systemRole;
    const finalWorkflowRoles: WorkflowRole[] = requestedRole
      ? requestedRole === "Guest"
        ? []
        : [requestedRole as WorkflowRole]
      : workflowRole !== NO_WORKFLOW_ROLE
        ? [workflowRole as WorkflowRole]
        : [];
    const finalDepartment: GmcLiaisonDepartment | null = requestedRole
      ? (requestedDepartment as GmcLiaisonDepartment | null)
      : department || null;

    startTransition(async () => {
      const result = await provisionUserAction(
        user.id,
        finalSystemRole,
        finalWorkflowRoles,
        finalDepartment,
      );
      if (result.success) {
        setProvisionOpen(false);
        if (result.warning) {
          toast.warning("User provisioned", { description: result.warning });
        } else {
          toast.success("User provisioned", {
            description: `${user.displayName} can now sign in and set up their PIN.`,
          });
        }
      } else {
        toast.error("Couldn't provision user", { description: result.error });
      }
    });
  }

  function handleRevokeAccess() {
    const confirmed = window.confirm(
      `Revoke ${user.displayName}'s access? Their roles are cleared and they can sign in but reach nothing. You can provision them again at any time.`,
    );

    if (!confirmed) return;

    startTransition(async () => {
      const result = await revokeAccessAction(user.id);

      if (result.success) {
        toast.success("Access revoked", {
          description: `${user.displayName} is now unprovisioned.`,
        });
      } else {
        toast.error("Couldn't revoke access", { description: result.error });
      }
    });
  }

  function handleDeactivate() {
    const confirmed = window.confirm(
      `Deactivate ${user.displayName}? They can no longer sign in and their PIN is cleared. Everything they did stays on the record, and you can reactivate them later.`,
    );

    if (!confirmed) return;

    startTransition(async () => {
      const result = await deactivateUserAction(user.id);

      if (result.success) {
        toast.success("User deactivated", {
          description: `${user.displayName} can no longer sign in.`,
        });
      } else {
        toast.error("Couldn't deactivate user", { description: result.error });
      }
    });
  }

  function handleReactivate() {
    startTransition(async () => {
      const result = await reactivateUserAction(user.id);

      if (result.success) {
        toast.success("User reactivated", {
          description: `${user.displayName} can sign in again — provision them to restore roles.`,
        });
      } else {
        toast.error("Couldn't reactivate user", { description: result.error });
      }
    });
  }

  function handleResetPin() {
    const confirmed = window.confirm(
      `Reset PIN for ${user.displayName}? They will need to set a new PIN on next login.`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await resetPinAction(user.id);
      if (result.success) {
        if (result.warning) {
          toast.warning("PIN reset", { description: result.warning });
        } else {
          toast.success("PIN reset", {
            description: `${user.displayName} will need to set a new PIN on next login.`,
          });
        }
      } else {
        toast.error("Couldn't reset PIN", { description: result.error });
      }
    });
  }

  return (
    <>
      <TableRow
        className={
          user.deactivatedAt
            ? "opacity-60"
            : isPending
              ? "bg-accent"
              : undefined
        }
      >
        <TableCell>{user.displayName}</TableCell>
        <TableCell>{user.email}</TableCell>
        <TableCell>{user.systemRole}</TableCell>
        <TableCell>{user.workflowRoles.join(", ") || "—"}</TableCell>
        <TableCell>
          {user.deactivatedAt ? (
            <Badge className="bg-status-danger-bg text-status-danger-fg">
              Deactivated
            </Badge>
          ) : user.provisionedAt ? (
            "Provisioned"
          ) : isPending ? (
            "Pending"
          ) : (
            "Unprovisioned"
          )}
        </TableCell>
        <TableCell className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={isSubmitting}
              >
                <MoreHorizontalIcon />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {user.deactivatedAt ? (
                <DropdownMenuItem onSelect={handleReactivate}>
                  Reactivate
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem onSelect={() => setProvisionOpen(true)}>
                    Provision
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={handleResetPin}>
                    Reset PIN
                  </DropdownMenuItem>
                  {user.provisionedAt && (
                    <DropdownMenuItem onSelect={handleRevokeAccess}>
                      Revoke access
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={handleDeactivate}
                  >
                    Deactivate
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      <Dialog open={provisionOpen} onOpenChange={setProvisionOpen}>
        <DialogContent>
          {requestedRole ? (
            <>
              <DialogHeader>
                <DialogTitle>Provision {user.displayName}</DialogTitle>
                <DialogDescription>
                  {user.displayName} requested the role &ldquo;{requestedRole}
                  &rdquo;
                  {requestedRole === "DepartmentHead" && requestedDepartment
                    ? ` for the ${requestedDepartment} department`
                    : ""}
                  . Confirm to grant dashboard access.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setProvisionOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button onClick={handleProvision} loading={isSubmitting}>
                  Confirm
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Provision {user.displayName}</DialogTitle>
                <DialogDescription>
                  Set the system role and workflow role for this user.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    System Role
                  </Label>
                  <RadioGroup
                    value={systemRole}
                    onValueChange={(value) =>
                      setSystemRole(value as SystemRole)
                    }
                    className="flex flex-row flex-wrap gap-2"
                  >
                    {SYSTEM_ROLES.map((role) =>
                      roleBadge(
                        role,
                        role,
                        `${user.id}-system-role-${role}`,
                        role,
                      ),
                    )}
                  </RadioGroup>
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Workflow Role
                  </Label>
                  <RadioGroup
                    value={workflowRole}
                    onValueChange={setWorkflowRole}
                    className="flex flex-row flex-wrap gap-2"
                  >
                    {roleBadge(
                      NO_WORKFLOW_ROLE,
                      NO_WORKFLOW_ROLE,
                      `${user.id}-workflow-role-none`,
                      "None",
                    )}
                    {WORKFLOW_ROLES.map((role) =>
                      roleBadge(
                        role,
                        role,
                        `${user.id}-workflow-role-${role}`,
                        role,
                      ),
                    )}
                  </RadioGroup>
                </div>

                {workflowRole === "DepartmentHead" && (
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Department
                    </Label>
                    <Select
                      value={department}
                      onValueChange={(value) =>
                        setDepartment(value as GmcLiaisonDepartment)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a department" />
                      </SelectTrigger>
                      <SelectContent>
                        {GMC_LIAISON_DEPARTMENTS.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setProvisionOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleProvision}
                  loading={isSubmitting}
                  disabled={workflowRole === "DepartmentHead" && !department}
                >
                  Save
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
