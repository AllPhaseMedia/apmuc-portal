"use client";

import { useCallback, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";

type Props = {
  label: string;
  value: string; // base64 data URL
  onChange: (dataUrl: string) => void;
};

const MAX_SIZE_KB = 500;
const ACCEPTED = "image/png,image/svg+xml,image/webp";

export function LogoUploadField({ label, value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const processFile = useCallback(
    (file: File) => {
      if (file.size > MAX_SIZE_KB * 1024) {
        alert(`File must be under ${MAX_SIZE_KB}KB`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        onChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    },
    [onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {value ? (
        <div className="flex items-center gap-3">
          <div className="relative h-16 w-16 rounded-md border bg-muted/50 p-1">
            <img
              src={value}
              alt="Logo preview"
              className="h-full w-full object-contain"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange("")}
          >
            <X className="h-4 w-4 mr-1" />
            Remove
          </Button>
        </div>
      ) : (
        <div
          className={`flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-6 transition-colors ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <Upload className="h-6 w-6 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Click or drag to upload
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PNG, SVG, or WebP &mdash; max {MAX_SIZE_KB}KB
          </p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
