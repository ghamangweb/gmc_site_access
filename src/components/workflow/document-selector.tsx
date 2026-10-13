"use client";

import { EyeIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useRegistrationLanguage } from "@/components/workflow/registration-language-provider";
import { DOCUMENT_LABELS, type DocType } from "@/lib/domain/types";
import type { Document } from "@/lib/services/document-service";
import { useUploadThing } from "@/lib/uploadthing/client";

const RECEPTION_DOCUMENT_TYPES: DocType[] = [
  "passport_biodata",
  "valid_visa",
  "mincom_letter",
  "work_residence_permit",
  "ghana_card",
  "assignment_letter",
  "insurance_proof",
];

function fileNameFromUrl(blobUrl: string): string {
  try {
    const segments = new URL(blobUrl).pathname.split("/");
    return decodeURIComponent(segments[segments.length - 1] || "file");
  } catch {
    return "file";
  }
}

type DocumentSelectorProps = {
  engagementId?: string;
  /** Public registration mode — uploads go to the token-authorized
   * `/api/register/documents` and attach to the invitation instead of an
   * engagement. Mutually exclusive with `engagementId`. */
  invitationToken?: string;
  mode?: "select" | "required";
  docTypes?: DocType[];
  requiredDocTypes?: DocType[];
  value?: DocType[];
  onChange?: (value: DocType[]) => void;
  uploadedDocuments: Document[];
  pendingFiles?: Partial<Record<DocType, File>>;
  onPendingFilesChange?: (files: Partial<Record<DocType, File>>) => void;
  disabled?: boolean;
};

export function DocumentSelector({
  engagementId,
  invitationToken,
  mode = "select",
  docTypes = RECEPTION_DOCUMENT_TYPES,
  requiredDocTypes,
  value = [],
  onChange,
  uploadedDocuments,
  pendingFiles = {},
  onPendingFilesChange,
  disabled,
}: DocumentSelectorProps) {
  const { t } = useRegistrationLanguage();

  function toggle(docType: DocType, checked: boolean) {
    onChange?.(
      checked ? [...value, docType] : value.filter((t) => t !== docType),
    );
  }

  function removePendingFile(docType: DocType) {
    const next = { ...pendingFiles };
    delete next[docType];
    onPendingFilesChange?.(next);
  }

  return (
    <div className="flex flex-col gap-3">
      {docTypes.map((docType) => {
        const uploaded = uploadedDocuments.find(
          (doc) => doc.docType === docType,
        );

        // A file that exists is always shown. Previously a document the
        // visitor had already uploaded stayed invisible until Reception
        // happened to tick its "applicable" box, which read as the upload
        // having been lost.
        const isApplicable =
          mode === "required" || value.includes(docType) || !!uploaded;

        return (
          <div
            key={docType}
            className="flex items-center justify-between gap-3"
          >
            {mode === "required" ? (
              <span className="text-sm text-foreground">
                {t(DOCUMENT_LABELS[docType])}
                {requiredDocTypes && !requiredDocTypes.includes(docType) && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {t("(optional)")}
                  </span>
                )}
              </span>
            ) : (
              <label
                htmlFor={`applicable-${docType}`}
                className="flex items-center gap-2 text-sm text-foreground"
              >
                <Checkbox
                  id={`applicable-${docType}`}
                  checked={isApplicable}
                  onCheckedChange={(checked) =>
                    toggle(docType, checked === true)
                  }
                  disabled={disabled}
                />
                {DOCUMENT_LABELS[docType]}
              </label>
            )}
            {isApplicable &&
              // An already-uploaded file is served by `UploadSlot` whichever
              // parent it hangs off: view and delete address it by document
              // id, so they work before an Engagement exists too.
              (uploaded || engagementId || invitationToken ? (
                <UploadSlot
                  engagementId={engagementId}
                  invitationToken={invitationToken}
                  docType={docType}
                  uploaded={uploaded}
                  optional={
                    !!requiredDocTypes && !requiredDocTypes.includes(docType)
                  }
                  disabled={disabled}
                />
              ) : (
                <PendingUploadSlot
                  file={pendingFiles[docType]}
                  onSelect={(file) =>
                    onPendingFilesChange?.({ ...pendingFiles, [docType]: file })
                  }
                  onRemove={() => removePendingFile(docType)}
                  disabled={disabled}
                />
              ))}
          </div>
        );
      })}
    </div>
  );
}

function PendingUploadSlot({
  file,
  onSelect,
  onRemove,
  disabled,
}: {
  file: File | undefined;
  onSelect: (file: File) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const { t } = useRegistrationLanguage();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) onSelect(selected);
  }

  if (file) {
    return (
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => previewUrl && window.open(previewUrl, "_blank")}
          className="max-w-40 truncate text-sm text-primary underline hover:text-primary/80"
        >
          {file.name}
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => previewUrl && window.open(previewUrl, "_blank")}
        >
          <EyeIcon />
          <span className="sr-only">{t("View")}</span>
        </Button>
        {!disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={onRemove}
          >
            <Trash2Icon />
            <span className="sr-only">{t("Remove")}</span>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {t("Choose file")}
      </Button>
      <span className="text-xs text-muted-foreground">{t("Required")}</span>
    </div>
  );
}

function UploadSlot({
  engagementId,
  invitationToken,
  docType,
  uploaded,
  optional,
  disabled,
}: {
  engagementId?: string;
  invitationToken?: string;
  docType: DocType;
  uploaded: Document | undefined;
  optional?: boolean;
  disabled?: boolean;
}) {
  const { t } = useRegistrationLanguage();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function clearInput() {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  // The endpoint decides which authorization the upload is checked against:
  // an invitation token for a public visitor, the staff session otherwise.
  // Bytes go straight from the browser to UploadThing — they never pass
  // through this app's server.
  const { startUpload, isUploading } = useUploadThing(
    invitationToken ? "registrationDocument" : "engagementDocument",
    {
      onClientUploadComplete: () => {
        toast.success(`${t(DOCUMENT_LABELS[docType])} ${t("uploaded")}`);
        clearInput();
        router.refresh();
      },
      onUploadError: (error) => {
        toast.error(t(error.message) || t("Upload failed"));
        clearInput();
      },
    },
  );

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const input = invitationToken
      ? { token: invitationToken, docType }
      : { engagementId: engagementId ?? "", docType };

    void startUpload([file], input);
  }

  async function handleView() {
    if (!uploaded) return;
    const url = invitationToken
      ? `/api/register/documents?token=${encodeURIComponent(invitationToken)}&documentId=${uploaded.id}`
      : `/api/documents/${uploaded.id}`;
    const response = await fetch(url).catch(() => null);
    if (!response?.ok) {
      toast.error(t("Couldn't load the document"));
      return;
    }
    const { data } = await response.json();
    window.open(data.url, "_blank", "noopener,noreferrer");
  }

  function handleDelete() {
    if (!uploaded) return;
    const confirmed = window.confirm(
      `Remove ${fileNameFromUrl(uploaded.fileUrl)}? You'll need to upload it again if it's still required.`,
    );
    if (!confirmed) return;

    setIsDeleting(true);
    const url = invitationToken
      ? `/api/register/documents?token=${encodeURIComponent(invitationToken)}&documentId=${uploaded.id}`
      : `/api/documents/${uploaded.id}`;
    fetch(url, { method: "DELETE" })
      .then((response) => response.json())
      .then((result) => {
        setIsDeleting(false);
        if (result.success) {
          toast.success(`${t(DOCUMENT_LABELS[docType])} ${t("removed")}`);
          router.refresh();
        } else {
          toast.error(t(result.error ?? "Failed to remove document"));
        }
      })
      .catch(() => {
        setIsDeleting(false);
        toast.error(t("Failed to remove document"));
      });
  }

  if (uploaded) {
    return (
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={handleView}
          className="max-w-40 truncate text-sm text-primary underline hover:text-primary/80"
        >
          {fileNameFromUrl(uploaded.fileUrl)}
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={handleView}
        >
          <EyeIcon />
          <span className="sr-only">{t("View")}</span>
        </Button>
        {!disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            loading={isDeleting}
            onClick={handleDelete}
          >
            <Trash2Icon />
            <span className="sr-only">{t("Remove")}</span>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        loading={isUploading}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {t("Upload file")}
      </Button>
      <span className="text-xs text-muted-foreground">
        {t(optional ? "Optional" : "Required")}
      </span>
    </div>
  );
}
