"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createEngagementFromRequestAction } from "@/actions/engagements";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DocumentSelector } from "@/components/workflow/document-selector";
import { NATIONALITIES } from "@/lib/domain/nationalities";
import {
  type ApplicableDocType,
  type DocType,
  VISA_TYPES,
  type VisaType,
} from "@/lib/domain/types";
import type { Document } from "@/lib/services/document-service";

// Everything the visitor was never asked for. A Local submission also needs
// nationality and the visa answers, which their form has no fields for.
export function RegistrationCompletionForm({
  registrationRequestId,
  isLocal,
  documents,
  defaultApplicableDocuments,
}: {
  registrationRequestId: string;
  isLocal: boolean;
  documents: Document[];
  defaultApplicableDocuments: ApplicableDocType[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Local-only answers; a Foreign submission already carries all three.
  const [nationality, setNationality] = useState("");

  const [ghanaVisaRequired, setGhanaVisaRequired] = useState(false);

  const [visaType, setVisaType] = useState<VisaType>("Tourist Visa");

  const [applicableDocuments, setApplicableDocuments] = useState<DocType[]>(
    defaultApplicableDocuments,
  );

  const [accommodationConfirmed, setAccommodationConfirmed] = useState(false);

  const [itineraryAttached, setItineraryAttached] = useState(false);

  const [inflightUpdated, setInflightUpdated] = useState(false);

  const [remarks, setRemarks] = useState("");

  // Only the Local path can be missing it; a Foreign submission always
  // carries a nationality and the field isn't rendered at all.
  const nationalityMissing = isLocal && nationality.length === 0;

  function handleSubmit() {
    startTransition(async () => {
      const result = await createEngagementFromRequestAction(
        registrationRequestId,
        {
          nationality: isLocal ? nationality : undefined,
          ghanaVisaRequired: isLocal ? ghanaVisaRequired : undefined,
          visaType: isLocal ? visaType : undefined,
          applicableDocuments: applicableDocuments.filter(
            (docType): docType is ApplicableDocType =>
              docType !== "hospital_fitness_form",
          ),
          accommodationConfirmed,
          itineraryAttached,
          inflightUpdated,
          remarks,
        },
      );

      if (!result.success) {
        toast.error(result.error);

        return;
      }

      if (result.warning) {
        toast.warning(result.warning);
      }

      toast.success("Engagement created");
      router.push(`/dashboard/reception/${result.engagementId}`);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-4 p-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Reception Completes
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The visitor was not asked for these.
          </p>
        </div>

        {isLocal && (
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div className="flex flex-col gap-2">
              <Label>Nationality *</Label>
              <Combobox
                value={nationality}
                onChange={setNationality}
                options={NATIONALITIES}
                placeholder="Select nationality"
                searchPlaceholder="Search nationality..."
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Visa Type</Label>
              <Select
                value={visaType}
                onValueChange={(next) => {
                  // SAFETY: the Select's only options are VISA_TYPES members,
                  // so `next` can be nothing else.
                  setVisaType(next as VisaType);
                }}
                disabled={isPending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VISA_TYPES.map((option: VisaType) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <CompletionCheckbox
              label="Ghana Visa Required"
              checked={ghanaVisaRequired}
              onChange={setGhanaVisaRequired}
              disabled={isPending}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <CompletionCheckbox
            label="Accommodation Confirmed"
            checked={accommodationConfirmed}
            onChange={setAccommodationConfirmed}
            disabled={isPending}
          />
          <CompletionCheckbox
            label="Itinerary Attached"
            checked={itineraryAttached}
            onChange={setItineraryAttached}
            disabled={isPending}
          />
          <CompletionCheckbox
            label="Inflight Updated"
            checked={inflightUpdated}
            onChange={setInflightUpdated}
            disabled={isPending}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="completion-remarks">
            Remarks / Other Information
          </Label>
          <Textarea
            id="completion-remarks"
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            disabled={isPending}
          />
        </div>
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Applicable Document Uploads
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tick every document this engagement requires. What the visitor
            already supplied is ticked and attached.
          </p>
        </div>
        <DocumentSelector
          mode="select"
          value={applicableDocuments}
          onChange={(next) => setApplicableDocuments(next)}
          uploadedDocuments={documents}
          disabled={isPending}
        />
      </Card>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          onClick={handleSubmit}
          loading={isPending}
          disabled={nationalityMissing}
          className="w-fit"
        >
          Create Engagement
        </Button>
        {nationalityMissing && (
          <p className="text-xs text-muted-foreground">
            Select a nationality to continue.
          </p>
        )}
      </div>
    </div>
  );
}

function CompletionCheckbox({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const id = `completion-${label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(next) => onChange(next === true)}
        disabled={disabled}
      />
      <Label htmlFor={id} className="normal-case tracking-normal">
        {label}
      </Label>
    </div>
  );
}
