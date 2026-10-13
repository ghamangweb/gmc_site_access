"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { activateAccessAction } from "@/actions/engagements";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DocumentSelector } from "@/components/workflow/document-selector";
import { ID_TYPES, type IdType } from "@/lib/domain/types";
import type { Document } from "@/lib/services/document-service";
import type { AccessProvisioning } from "@/lib/services/workflow-service";

const REQUIRED_DOCS = ["biometric_image", "passport_photo"] as const;

export function ItForm({
  engagementId,
  uploadedDocuments,
  departureDate,
  provisioning,
  readOnly,
}: {
  engagementId: string;
  uploadedDocuments: Document[];
  /** The access card may not outlive the visit. */
  departureDate: string;
  provisioning?: AccessProvisioning;
  readOnly: boolean;
}) {
  const [idType, setIdType] = useState<IdType>("Passport");
  const [biometricCaptured, setBiometricCaptured] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [isPending, startTransition] = useTransition();

  const disabled = readOnly || isPending;

  const missingDocs = REQUIRED_DOCS.filter(
    (docType) => !uploadedDocuments.some((doc) => doc.docType === docType),
  );

  // Mirrors the server-side rule so the problem is visible before submitting
  // rather than coming back as an error.
  const expiryTooLate = cardExpiry !== "" && cardExpiry > departureDate;

  const canSubmit =
    !disabled &&
    missingDocs.length === 0 &&
    cardNumber.trim().length > 0 &&
    cardExpiry !== "" &&
    !expiryTooLate;

  function handleSubmit() {
    startTransition(async () => {
      const result = await activateAccessAction(engagementId, {
        idType,
        biometricCaptured,
        accessCardNumber: cardNumber.trim(),
        accessCardExpiry: cardExpiry,
      });

      if (!result.success) {
        toast.error(result.error);

        return;
      }

      if (result.warning) {
        toast.warning(result.warning);
      } else {
        toast.success("Site access activated");
      }
    });
  }

  if (provisioning) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 font-semibold text-foreground text-lg">
          Access Active
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Access Card Number"
            value={provisioning.accessCardNumber}
          />
          <Field label="Card Expiry" value={provisioning.accessCardExpiry} />
          <Field label="ID Type" value={provisioning.idType} />
          <Field
            label="Biometric Captured"
            value={provisioning.biometricCaptured ? "Yes" : "No"}
          />
          <Field
            label="Activated"
            value={provisioning.activatedAt.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="mb-4 font-semibold text-foreground text-lg">
        Access Setup
      </h2>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label>Biometric & Photo *</Label>
          <DocumentSelector
            engagementId={engagementId}
            mode="required"
            docTypes={[...REQUIRED_DOCS]}
            uploadedDocuments={uploadedDocuments}
            disabled={disabled}
          />
        </div>

        <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label>ID Type *</Label>
            <Select
              value={idType}
              onValueChange={(next) => {
                // SAFETY: the Select's only options are ID_TYPES members.
                setIdType(next as IdType);
              }}
              disabled={disabled}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ID_TYPES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="access-card-number">Access Card Number *</Label>
            <Input
              id="access-card-number"
              value={cardNumber}
              onChange={(event) => setCardNumber(event.target.value)}
              disabled={disabled}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Access Card Expiry *</Label>
            <DatePicker
              value={cardExpiry}
              onChange={setCardExpiry}
              disabled={disabled}
            />
            {expiryTooLate ? (
              <p className="text-destructive text-xs">
                Cannot be later than the departure date ({departureDate}).
              </p>
            ) : (
              <p className="text-muted-foreground text-xs">
                Departure date is {departureDate}.
              </p>
            )}
          </div>

          <div className="flex items-end">
            <div className="flex items-center gap-2 pb-2">
              <Checkbox
                id="biometric-captured"
                checked={biometricCaptured}
                onCheckedChange={(checked) =>
                  setBiometricCaptured(checked === true)
                }
                disabled={disabled}
              />
              <Label
                htmlFor="biometric-captured"
                className="normal-case tracking-normal"
              >
                Biometric enrollment captured
              </Label>
            </div>
          </div>
        </div>

        {!readOnly && (
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              onClick={handleSubmit}
              loading={isPending}
              disabled={!canSubmit}
              className="w-fit"
            >
              Set Access Active
            </Button>
            {missingDocs.length > 0 && (
              <p className="text-muted-foreground text-xs">
                Upload the biometric capture and passport photograph to
                continue.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-medium text-muted-foreground text-xs">{label}</span>
      <span className="text-foreground text-sm">{value}</span>
    </div>
  );
}
