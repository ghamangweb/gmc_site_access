"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignaturePad as DrawingPad } from "@/components/workflow/signature-pad";

export type SignatureValue = {
  mode: "draw" | "upload" | "type";
  value: string;
};

type SignatureFieldProps = {
  value: SignatureValue | null;
  onChange: (value: SignatureValue | null) => void;
  disabled?: boolean;
};

export function SignatureField({
  value,
  onChange,
  disabled,
}: SignatureFieldProps) {
  if (disabled) {
    return <SignaturePreview value={value} />;
  }

  return (
    <Tabs
      defaultValue={value?.mode ?? "draw"}
      onValueChange={() => onChange(null)}
    >
      <TabsList>
        <TabsTrigger value="draw">Draw</TabsTrigger>
        <TabsTrigger value="upload">Upload</TabsTrigger>
        <TabsTrigger value="type">Type</TabsTrigger>
      </TabsList>
      <TabsContent value="draw">
        <DrawingPad
          className="h-32 w-full rounded-md border border-input bg-accent"
          onChange={(dataUrl) =>
            onChange(dataUrl ? { mode: "draw", value: dataUrl } : null)
          }
        />
      </TabsContent>
      <TabsContent value="upload">
        <UploadSignature
          onChange={(dataUrl) => onChange({ mode: "upload", value: dataUrl })}
        />
      </TabsContent>
      <TabsContent value="type">
        <Input
          placeholder="Type your full name"
          value={value?.mode === "type" ? value.value : ""}
          onChange={(e) => onChange({ mode: "type", value: e.target.value })}
        />
      </TabsContent>
    </Tabs>
  );
}

function SignaturePreview({ value }: { value: SignatureValue | null }) {
  if (!value) {
    return <p className="text-xs text-muted-foreground">No signature</p>;
  }
  if (value.mode === "type") {
    return <p className="text-sm text-foreground">{value.value}</p>;
  }
  return (
    // biome-ignore lint/performance/noImgElement: dynamic data-URL/blob preview, not a next/image-optimizable static asset
    <img
      src={value.value}
      alt="Signature"
      className="h-24 rounded-md border border-border bg-background"
    />
  );
}

function UploadSignature({
  onChange,
}: {
  onChange: (dataUrl: string) => void;
}) {
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file");
      return;
    }
    const MAX_SIZE_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("Image exceeds the 5MB limit");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.onerror = () => {
      setFileName(null);
      toast.error("Failed to read image. Try again");
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
      >
        Choose image
      </Button>
      {fileName && (
        <span className="text-xs text-muted-foreground">{fileName}</span>
      )}
    </div>
  );
}
