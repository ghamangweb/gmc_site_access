"use client";

import { X } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { issueInvitationAction } from "@/actions/registration";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type EmailRow = { id: number; email: string; error?: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function InviteForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRowId = useRef(1);
  const sendingRef = useRef(false);
  const [emails, setEmails] = useState<EmailRow[]>([]);
  const [draftEmail, setDraftEmail] = useState("");
  const [inputError, setInputError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);

  const [registrationType, setRegistrationType] = useState<"Local" | "Foreign">(
    "Foreign",
  );

  const [isPending, startTransition] = useTransition();

  function collectRecipients(): EmailRow[] | null {
    const email = draftEmail.trim();

    if (!email) return emails;

    if (!EMAIL_PATTERN.test(email) || !inputRef.current?.validity.valid) {
      setInputError("Enter a valid email address");
      inputRef.current?.focus();

      return null;
    }

    if (emails.some((row) => row.email.toLowerCase() === email.toLowerCase())) {
      setInputError("This email address has already been added");
      inputRef.current?.focus();

      return null;
    }

    return [...emails, { id: nextRowId.current++, email }];
  }

  function addEmail(): void {
    if (sendingRef.current) return;

    const recipients = collectRecipients();

    if (!recipients) return;

    setEmails(recipients);
    setDraftEmail("");
    setInputError("");
    inputRef.current?.focus();
  }

  function handleSubmit(): void {
    if (sendingRef.current) return;

    const recipients = collectRecipients();

    if (!recipients) return;

    if (recipients.length === 0) {
      setInputError("Add at least one email address");
      inputRef.current?.focus();

      return;
    }

    setEmails(recipients);
    setDraftEmail("");
    setInputError("");
    sendingRef.current = true;
    startTransition(async () => {
      const failed: EmailRow[] = [];
      const deliveryWarnings: string[] = [];
      let sent = 0;

      try {
        for (const row of recipients) {
          const formData = new FormData();
          formData.set("email", row.email);
          formData.set("registrationType", registrationType);

          try {
            const result = await issueInvitationAction(formData);

            if (!result.success) {
              failed.push({ ...row, error: result.error });
            } else if (result.warning) {
              deliveryWarnings.push(`${row.email}: ${result.warning}`);
            } else {
              sent += 1;
            }
          } catch {
            failed.push({
              ...row,
              error:
                "Couldn't confirm delivery. Check Invitations before retrying.",
            });
          }
        }

        setWarnings(deliveryWarnings);
        setEmails(failed);

        if (failed.length === 0) setRegistrationType("Foreign");

        if (sent > 0) {
          toast.success(
            sent === 1 ? "Invitation sent" : `${sent} invitations sent`,
          );
        }

        if (deliveryWarnings.length > 0) {
          toast.warning("Invitations created, but some emails failed to send", {
            description: "See the email addresses listed below the form.",
          });
        }

        if (failed.length > 0) {
          toast.error("Some invitations could not be sent", {
            description:
              "Review the remaining email addresses before retrying.",
          });
        }
      } finally {
        sendingRef.current = false;
      }
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Label htmlFor="visitor-email">Visitor Emails *</Label>
          <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-md border border-input bg-background p-2 focus-within:ring-1 focus-within:ring-ring">
            {emails.map((row) => (
              <Badge
                key={row.id}
                variant="secondary"
                className="max-w-full gap-1"
              >
                <span className="min-w-0 break-all whitespace-normal">
                  {row.email}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 shrink-0 rounded-full p-0"
                  disabled={isPending}
                  aria-label={`Remove ${row.email}`}
                  onClick={() =>
                    setEmails((current) =>
                      current.filter((entry) => entry.id !== row.id),
                    )
                  }
                >
                  <X aria-hidden="true" className="size-3" />
                </Button>
              </Badge>
            ))}
            <Input
              ref={inputRef}
              id="visitor-email"
              name="email"
              type="email"
              value={draftEmail}
              onChange={(event) => {
                setDraftEmail(event.target.value);
                setInputError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  addEmail();
                }
              }}
              placeholder="visitor@example.com"
              className="h-7 w-auto min-w-48 flex-1 border-0 bg-transparent p-0 focus-visible:ring-0"
              disabled={isPending}
              aria-invalid={inputError ? true : undefined}
              aria-describedby="visitor-email-help visitor-email-errors"
            />
          </div>
          <p id="visitor-email-help" className="text-xs text-muted-foreground">
            Press Enter or click Add more to add each email address.
          </p>
          <div
            id="visitor-email-errors"
            aria-live="polite"
            className="flex flex-col gap-2 text-xs text-destructive"
          >
            {inputError && <p>{inputError}</p>}
            {emails
              .filter((row) => row.error)
              .map((row) => (
                <p key={row.id}>
                  {row.email}: {row.error}
                </p>
              ))}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="mt-5"
          disabled={isPending || !draftEmail.trim()}
          onClick={addEmail}
        >
          Add more
        </Button>
        <Button type="submit" loading={isPending} className="mt-5">
          {emails.length + (draftEmail.trim() ? 1 : 0) > 1
            ? "Send Invitations"
            : "Send Invitation"}
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        <Label id="registration-type-label">Registration Type</Label>
        <RadioGroup
          name="registrationType"
          value={registrationType}
          disabled={isPending}
          onValueChange={(value) => {
            if (value === "Local" || value === "Foreign") {
              setRegistrationType(value);
            }
          }}
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
      {warnings.length > 0 && (
        <output className="flex flex-col gap-2 text-sm text-muted-foreground">
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </output>
      )}
    </form>
  );
}
