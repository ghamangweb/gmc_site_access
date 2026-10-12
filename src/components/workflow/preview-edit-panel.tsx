"use client";

import { EyeIcon, PencilIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

// Preview by default, edit on demand. Used by both Reception screens: turning
// a submission into an Engagement, and viewing an existing one.
//
// Only the mode flag lives here. The preview, the form and anything that sits
// under the preview are rendered on the server and passed in as nodes, so
// nothing is duplicated and the heavy parts stay server-rendered.
export function PreviewEditPanel({
  preview,
  editForm,
  belowPreview,
  previewHint,
  editHint,
  editLabel = "Edit",
}: {
  preview: React.ReactNode;
  editForm: React.ReactNode;
  belowPreview?: React.ReactNode;
  previewHint: string;
  editHint: string;
  editLabel?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-6 py-4">
        <p className="text-sm text-muted-foreground">
          {isEditing ? editHint : previewHint}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsEditing((previous) => !previous)}
        >
          {isEditing ? <EyeIcon /> : <PencilIcon />}
          {isEditing ? "Back to preview" : editLabel}
        </Button>
      </div>

      {isEditing ? (
        editForm
      ) : (
        <>
          {preview}
          {belowPreview}
        </>
      )}
    </div>
  );
}
