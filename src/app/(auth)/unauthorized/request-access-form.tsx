"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { requestAccessAction } from "@/actions/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GMC_LIAISON_DEPARTMENTS } from "@/lib/domain/types";

const ROLE_OPTIONS = [
  "Guest",
  "Receptionist",
  "CSO",
  "HCM",
  "GMM",
  "EM",
  "HospitalStaff",
  "TrainingStaff",
  "SecurityStaff",
  "DepartmentHead",
];

export function RequestAccessForm() {
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [requestedRole, setRequestedRole] = useState(ROLE_OPTIONS[0]);
  const [requestedDepartment, setRequestedDepartment] = useState("");

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await requestAccessAction(formData);
      if (result.success) {
        setSubmitted(true);
        if (result.warning) {
          toast.warning("Request submitted", { description: result.warning });
        }
      } else {
        toast.error("Couldn't submit request", { description: result.error });
      }
    });
  }

  if (submitted) {
    return (
      <p className="text-sm text-muted-foreground">
        Your request has been submitted.
      </p>
    );
  }

  return (
    <form
      action={handleSubmit}
      className="flex w-full flex-col items-center gap-6"
    >
      <div className="flex flex-col items-center gap-3">
        <Label id="requested-role-label">Role</Label>
        <RadioGroup
          name="requestedRole"
          value={requestedRole}
          onValueChange={setRequestedRole}
          aria-labelledby="requested-role-label"
          className="flex max-w-md flex-row flex-wrap justify-center gap-2"
        >
          {ROLE_OPTIONS.map((role) => (
            <label key={role} htmlFor={role} className="cursor-pointer">
              <Badge
                variant="outline"
                className="gap-2 border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary has-[[data-state=checked]]:text-primary-foreground"
              >
                <RadioGroupItem
                  value={role}
                  id={role}
                  className="border-muted-foreground data-[state=checked]:border-primary-foreground [&_svg]:fill-primary-foreground"
                />
                {role}
              </Badge>
            </label>
          ))}
        </RadioGroup>
      </div>
      {requestedRole === "DepartmentHead" && (
        <div className="flex w-full max-w-xs flex-col items-center gap-3">
          <Label id="requested-department-label">Department</Label>
          <Select
            name="requestedDepartment"
            value={requestedDepartment}
            onValueChange={setRequestedDepartment}
            required
          >
            <SelectTrigger
              className="w-full"
              aria-labelledby="requested-department-label"
            >
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
      <Button
        type="submit"
        loading={isPending}
        size="lg"
        className="w-full md:w-[220px]"
      >
        Request Access
      </Button>
    </form>
  );
}
