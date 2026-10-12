"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { issueInvitationAction } from "@/actions/registration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function InviteForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [registrationType, setRegistrationType] = useState<"Local" | "Foreign">(
    "Foreign",
  );
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await issueInvitationAction(formData);
      if (result.success) {
        formRef.current?.reset();
        setRegistrationType("Foreign");
        if (result.warning) {
          toast.warning("Invitation sent", { description: result.warning });
        } else {
          toast.success("Invitation sent");
        }
      } else {
        toast.error("Couldn't send invitation", {
          description: result.error,
        });
      }
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-col gap-4">
      <div className="flex items-end gap-4">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="email">Visitor Email *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="visitor@example.com"
            required
          />
        </div>
        <Button type="submit" loading={isPending}>
          Send Invitation
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        <Label id="registration-type-label">Registration Type</Label>
        <RadioGroup
          name="registrationType"
          value={registrationType}
          onValueChange={(value) =>
            setRegistrationType(value as "Local" | "Foreign")
          }
          aria-labelledby="registration-type-label"
          className="flex flex-row gap-4"
        >
          <label
            htmlFor="registrationType-foreign"
            className="flex items-center gap-2 text-sm"
          >
            <RadioGroupItem value="Foreign" id="registrationType-foreign" />
            Foreign
          </label>
          <label
            htmlFor="registrationType-local"
            className="flex items-center gap-2 text-sm"
          >
            <RadioGroupItem value="Local" id="registrationType-local" />
            Local
          </label>
        </RadioGroup>
      </div>
    </form>
  );
}
