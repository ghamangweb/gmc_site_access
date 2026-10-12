"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { isValidPhoneNumber } from "libphonenumber-js";
import { useState, useTransition } from "react";
import { type Control, type FieldPath, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { submitRegistrationRequestAction } from "@/actions/registration";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DocumentSelector } from "@/components/workflow/document-selector";
import { PhoneInput } from "@/components/workflow/phone-input";
import { useRegistrationLanguage } from "@/components/workflow/registration-language-provider";
import {
  DOCUMENT_LABELS,
  getRegistrationDocTypes,
  REGISTRATION_DOCUMENT_TYPES,
} from "@/lib/domain/types";
import type { Document } from "@/lib/services/document-service";
import { toUpperCase } from "@/lib/utils";

const ACCESS_LEVEL_OPTIONS = [
  "Visitor Access",
  "Contractor/Service Personnel Access",
  "Standard Employee Access",
  "Operational Employee Access",
  "High Security / Sensitive Areas",
  "Executive / Emergency Access",
];

type Casing = "title" | "sentence" | "none";

function applyCasing(value: string, casing: Casing): string {
  return casing === "none" ? value : toUpperCase(value);
}

const phoneFieldSchema = z.string().superRefine((value, ctx) => {
  const [code, ...rest] = value.trim().split(/\s+/);
  const number = rest.join(" ");
  if (!code || !code.startsWith("+")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Select a country code",
    });
    return;
  }
  if (!number) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required" });
    return;
  }
  if (!isValidPhoneNumber(`${code} ${number}`)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Enter a valid phone number for the selected country",
    });
  }
});

const localFormSchema = z.object({
  passportNo: z.string().min(1, "Required"),
  fullName: z.string().min(1, "Required"),
  dateOfBirth: z.string().min(1, "Required"),
  gender: z.string().min(1, "Required"),
  email: z.union([z.literal(""), z.email("Enter a valid email")]),
  phone: phoneFieldSchema,
  telephoneOnSite: phoneFieldSchema,
  emergencyContactName: z.string().min(1, "Required"),
  emergencyContactPhone: phoneFieldSchema,
  employmentStatus: z.string().min(1, "Required"),
  accessPurpose: z.enum(["Work", "Visit", "VisitMine"]),
  arrivalDate: z.string().min(1, "Required"),
  departureDate: z.string().min(1, "Required"),
  companyName: z.string().min(1, "Required"),
  contactNameMonthly: z.string().min(1, "Required"),
  contactEmail: z.union([z.literal(""), z.email("Enter a valid email")]),
  companyEmergencyName: z.string().min(1, "Required"),
  companyEmergencyTel: phoneFieldSchema,
  gmcLiaisonPerson: z.string().min(1, "Required"),
  reasonForRequest: z.string().min(1, "Required"),
  airportPickup: z.boolean(),
  transportTo: z.boolean(),
  transportFrom: z.boolean(),
  accommodationRequired: z.boolean(),
  permanentAccessBadge: z.boolean(),
  generalSiteInduction: z.boolean(),
  otherInductions: z.boolean(),
  bringingEquipment: z.boolean(),
  ppeRequired: z.boolean(),
  itAccessRequired: z.boolean(),
  accessLevel: z.string().min(1, "Required"),
  accommodationConfirmed: z.boolean(),
  itineraryAttached: z.boolean(),
  inflightUpdated: z.boolean(),
  remarks: z.string(),
});

type LocalFormValues = z.infer<typeof localFormSchema>;

const DEFAULT_VALUES: LocalFormValues = {
  passportNo: "",
  fullName: "",
  dateOfBirth: "",
  gender: "",
  email: "",
  phone: "",
  telephoneOnSite: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  employmentStatus: "",
  accessPurpose: "Work",
  arrivalDate: "",
  departureDate: "",
  companyName: "",
  contactNameMonthly: "",
  contactEmail: "",
  companyEmergencyName: "",
  companyEmergencyTel: "",
  gmcLiaisonPerson: "",
  reasonForRequest: "",
  airportPickup: false,
  transportTo: false,
  transportFrom: false,
  accommodationRequired: false,
  permanentAccessBadge: false,
  generalSiteInduction: false,
  otherInductions: false,
  bringingEquipment: false,
  ppeRequired: false,
  itAccessRequired: false,
  accessLevel: "",
  accommodationConfirmed: false,
  itineraryAttached: false,
  inflightUpdated: false,
  remarks: "",
};

export function LocalRegistrationForm({
  token,
  uploadedDocuments,
  defaultValues,
}: {
  token: string;
  uploadedDocuments: Document[];
  defaultValues?: Partial<LocalFormValues>;
}) {
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  const { t, tActionError } = useRegistrationLanguage();

  const form = useForm<LocalFormValues>({
    resolver: zodResolver(localFormSchema),
    defaultValues: { ...DEFAULT_VALUES, ...defaultValues },
  });

  // Mirrors the server-side guard in `createRegistrationRequest` so the
  // visitor sees what's outstanding before clicking submit.
  const missingRequiredDocs = REGISTRATION_DOCUMENT_TYPES.Local.filter(
    (docType) => !uploadedDocuments.some((doc) => doc.docType === docType),
  );

  function onSubmit(values: LocalFormValues) {
    startTransition(async () => {
      const payload = {
        person: {
          passportNo: values.passportNo,
          fullName: values.fullName,
          dateOfBirth: values.dateOfBirth,
          gender: values.gender,
          email: values.email || null,
          phone: values.phone,
          emergencyContactName: values.emergencyContactName,
          emergencyContactPhone: values.emergencyContactPhone,
        },
        accessPurpose: values.accessPurpose,
        arrivalDate: values.arrivalDate,
        departureDate: values.departureDate,
        registrationData: {
          employmentStatus: values.employmentStatus,
          telephoneOnSite: values.telephoneOnSite,
          companyName: values.companyName,
          contactNameMonthly: values.contactNameMonthly,
          contactEmail: values.contactEmail || undefined,
          companyEmergencyName: values.companyEmergencyName,
          companyEmergencyTel: values.companyEmergencyTel,
          gmcLiaisonPerson: values.gmcLiaisonPerson,
          reasonForRequest: values.reasonForRequest,
          airportPickup: values.airportPickup,
          transportTo: values.transportTo,
          transportFrom: values.transportFrom,
          accommodationRequired: values.accommodationRequired,
          permanentAccessBadge: values.permanentAccessBadge,
          generalSiteInduction: values.generalSiteInduction,
          otherInductions: values.otherInductions,
          bringingEquipment: values.bringingEquipment,
          ppeRequired: values.ppeRequired,
          itAccessRequired: values.itAccessRequired,
          accessLevel: values.accessLevel,
          accommodationConfirmed: values.accommodationConfirmed,
          itineraryAttached: values.itineraryAttached,
          inflightUpdated: values.inflightUpdated,
          remarks: values.remarks,
        },
      };

      const result = await submitRegistrationRequestAction(token, payload);
      if (!result.success) {
        toast.error(tActionError(result));
        return;
      }
      if (result.warning) {
        toast.warning(t(result.warning));
      }
      setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <Card className="flex flex-col items-center gap-4 p-10 text-center">
        <h2 className="text-lg font-semibold text-foreground">
          {t("Thank you — your pre-registration has been submitted")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("GMC staff will be in touch with next steps.")}
        </p>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6"
      >
        <Card className="flex flex-col gap-4 p-6">
          <h2 className="text-lg font-semibold text-foreground">
            {t("Visitor Details")}
          </h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <SelectField
              control={form.control}
              name="employmentStatus"
              label="Employment Status"
              options={["Employee", "Contractor", "Visitor(Expatriate)"]}
              disabled={isPending}
            />
            <TextField
              control={form.control}
              name="fullName"
              label="Full Name"
              casing="title"
              disabled={isPending}
            />
            <DateField
              control={form.control}
              name="dateOfBirth"
              label="Date of Birth"
              disabled={isPending}
              captionLayout="dropdown"
            />
            <SelectField
              control={form.control}
              name="gender"
              label="Gender"
              options={["Male", "Female", "Other"]}
              disabled={isPending}
            />
            <TextField
              control={form.control}
              name="passportNo"
              label="Ghana Card No."
              casing="none"
              disabled={isPending}
            />
            <TextField
              control={form.control}
              name="email"
              label="Email Address"
              type="email"
              casing="none"
              disabled={isPending}
              required={false}
            />
            <PhoneField
              control={form.control}
              name="phone"
              label="Telephone No. (Off Site)"
              disabled={isPending}
            />
            <PhoneField
              control={form.control}
              name="telephoneOnSite"
              label="Telephone No. (On Site)"
              disabled={isPending}
            />
            <TextField
              control={form.control}
              name="emergencyContactName"
              label="Emergency Contact Name"
              casing="title"
              disabled={isPending}
            />
            <PhoneField
              control={form.control}
              name="emergencyContactPhone"
              label="Emergency Contact No."
              disabled={isPending}
            />
            <SelectField
              control={form.control}
              name="accessPurpose"
              label="Access Purpose"
              options={["Work", "Visit", "VisitMine"]}
              optionLabels={{
                Work: "Coming to work",
                Visit: "Coming to visit (no mine site access)",
                VisitMine: "Coming to visit + mine site access",
              }}
              disabled={isPending}
            />
          </div>
        </Card>

        <Card className="flex flex-col gap-4 p-6">
          <h2 className="text-lg font-semibold text-foreground">
            {t("Company Details")}
          </h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div className="col-span-2">
              <TextField
                control={form.control}
                name="companyName"
                label="Company Name"
                casing="title"
                disabled={isPending}
              />
            </div>
            <TextField
              control={form.control}
              name="contactNameMonthly"
              label="Contact Name (Monthly Reporting)"
              casing="title"
              disabled={isPending}
            />
            <TextField
              control={form.control}
              name="contactEmail"
              label="Contact Email Address"
              type="email"
              casing="none"
              disabled={isPending}
              required={false}
            />
            <TextField
              control={form.control}
              name="companyEmergencyName"
              label="Emergency Contact Name (Company)"
              casing="title"
              disabled={isPending}
            />
            <PhoneField
              control={form.control}
              name="companyEmergencyTel"
              label="Emergency Tel. (Company)"
              disabled={isPending}
            />
          </div>
        </Card>

        <Card className="flex flex-col gap-4 p-6">
          <h2 className="text-lg font-semibold text-foreground">
            {t("Access Details")}
          </h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <TextField
              control={form.control}
              name="gmcLiaisonPerson"
              label="GMC Liaison Person"
              casing="title"
              disabled
            />
            <DateField
              control={form.control}
              name="arrivalDate"
              label="Date of Arrival"
              disabled={isPending}
            />
            <DateField
              control={form.control}
              name="departureDate"
              label="Date of Departure"
              disabled={isPending}
            />
            <div className="col-span-2">
              <TextAreaField
                control={form.control}
                name="reasonForRequest"
                label="Reason for Request"
                disabled={isPending}
              />
            </div>
          </div>
        </Card>

        <Card className="flex flex-col gap-4 p-6">
          <h2 className="text-lg font-semibold text-foreground">
            {t("Site Support Requirements")}
          </h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <YesNoField
              control={form.control}
              name="airportPickup"
              label="Airport Pickup / Protocol Required"
              disabled={isPending}
            />
            <YesNoField
              control={form.control}
              name="accommodationRequired"
              label="Accommodation Required"
              disabled={isPending}
            />
            <YesNoField
              control={form.control}
              name="permanentAccessBadge"
              label="Permanent Access Badge"
              disabled={isPending}
            />
            <YesNoField
              control={form.control}
              name="generalSiteInduction"
              label="General Site Induction"
              disabled={isPending}
            />
            <YesNoField
              control={form.control}
              name="bringingEquipment"
              label="Bringing Equipment on Site"
              disabled={isPending}
            />
            <YesNoField
              control={form.control}
              name="ppeRequired"
              label="PPE Required"
              disabled={isPending}
            />
            <YesNoField
              control={form.control}
              name="itAccessRequired"
              label="IT Access Required"
              disabled={isPending}
            />
            <YesNoField
              control={form.control}
              name="transportTo"
              label="Transport Required To"
              disabled={isPending}
            />
            <YesNoField
              control={form.control}
              name="transportFrom"
              label="Transport Required From"
              disabled={isPending}
            />
            <YesNoField
              control={form.control}
              name="otherInductions"
              label="Other Inductions / Training"
              disabled={isPending}
            />
            <SelectField
              control={form.control}
              name="accessLevel"
              label="Access Level"
              options={ACCESS_LEVEL_OPTIONS}
              disabled={isPending}
            />
          </div>
        </Card>

        <Card className="flex flex-col gap-4 p-6">
          <h2 className="text-lg font-semibold text-foreground">
            {t("Document Uploads")}
          </h2>
          <DocumentSelector
            invitationToken={token}
            mode="required"
            docTypes={getRegistrationDocTypes("Local")}
            requiredDocTypes={REGISTRATION_DOCUMENT_TYPES.Local}
            uploadedDocuments={uploadedDocuments}
            disabled={isPending}
          />
        </Card>

        <div className="flex flex-col gap-2">
          <Button
            type="submit"
            loading={isPending}
            disabled={missingRequiredDocs.length > 0}
            className="w-fit"
          >
            {t("Submit")}
          </Button>
          {missingRequiredDocs.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {t("Upload these documents to continue:")}{" "}
              {missingRequiredDocs
                .map((docType) => t(DOCUMENT_LABELS[docType]))
                .join(", ")}
            </p>
          )}
        </div>
      </form>
    </Form>
  );
}

type FieldProps<TName extends FieldPath<LocalFormValues>> = {
  control: Control<LocalFormValues>;
  name: TName;
  label: string;
  disabled?: boolean;
  required?: boolean;
};

function TextField<TName extends FieldPath<LocalFormValues>>({
  control,
  name,
  label,
  type = "text",
  casing = "sentence",
  disabled,
  required = true,
}: FieldProps<TName> & { type?: string; casing?: Casing }) {
  const { t } = useRegistrationLanguage();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {t(label)}
            {required && " *"}
          </FormLabel>
          <FormControl>
            <Input
              {...field}
              value={field.value as string}
              type={type}
              disabled={disabled}
              onChange={(e) =>
                field.onChange(applyCasing(e.target.value, casing))
              }
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function TextAreaField<TName extends FieldPath<LocalFormValues>>({
  control,
  name,
  label,
  disabled,
  required = true,
}: FieldProps<TName>) {
  const { t } = useRegistrationLanguage();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {t(label)}
            {required && " *"}
          </FormLabel>
          <FormControl>
            <Textarea
              {...field}
              value={field.value as string}
              disabled={disabled}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function DateField<TName extends FieldPath<LocalFormValues>>({
  control,
  name,
  label,
  disabled,
  required = true,
  captionLayout,
}: FieldProps<TName> & { captionLayout?: "label" | "dropdown" }) {
  const { t } = useRegistrationLanguage();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {t(label)}
            {required && " *"}
          </FormLabel>
          <FormControl>
            <DatePicker
              value={field.value as string}
              onChange={field.onChange}
              disabled={disabled}
              captionLayout={captionLayout}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function PhoneField<TName extends FieldPath<LocalFormValues>>({
  control,
  name,
  label,
  disabled,
  required = true,
}: FieldProps<TName>) {
  const { t } = useRegistrationLanguage();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {t(label)}
            {required && " *"}
          </FormLabel>
          <FormControl>
            <PhoneInput
              ref={field.ref}
              value={field.value as string}
              onChange={field.onChange}
              disabled={disabled}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function SelectField<TName extends FieldPath<LocalFormValues>>({
  control,
  name,
  label,
  options,
  optionLabels,
  disabled,
}: FieldProps<TName> & {
  options: string[];
  optionLabels?: Record<string, string>;
}) {
  const { t } = useRegistrationLanguage();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t(label)} *</FormLabel>
          <Select
            value={field.value as string}
            onValueChange={field.onChange}
            disabled={disabled}
          >
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {t(optionLabels?.[option] ?? option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function YesNoField<TName extends FieldPath<LocalFormValues>>({
  control,
  name,
  label,
  disabled,
}: FieldProps<TName>) {
  const { t } = useRegistrationLanguage();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t(label)} *</FormLabel>
          <FormControl>
            <RadioGroup
              value={field.value ? "yes" : "no"}
              onValueChange={(v) => field.onChange(v === "yes")}
              disabled={disabled}
              className="flex flex-row gap-4"
            >
              <label
                htmlFor={`${name}-yes`}
                className="flex items-center gap-2 text-sm"
              >
                <RadioGroupItem value="yes" id={`${name}-yes`} /> {t("Yes")}
              </label>
              <label
                htmlFor={`${name}-no`}
                className="flex items-center gap-2 text-sm"
              >
                <RadioGroupItem value="no" id={`${name}-no`} /> {t("No")}
              </label>
            </RadioGroup>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
