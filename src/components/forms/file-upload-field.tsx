"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, FileText, ImageIcon, File } from "lucide-react";
import { toast } from "sonner";

export type FileAttachment = {
  file: File;
  id: string;
};

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return ImageIcon;
  if (type.includes("pdf") || type.includes("document")) return FileText;
  return File;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FileUploadFieldProps {
  files: FileAttachment[];
  onChange: (files: FileAttachment[]) => void;
  maxFileSize?: number; // MB
  acceptedTypes?: string; // e.g. "image/*,.pdf"
  disabled?: boolean;
}

export function FileUploadField({
  files,
  onChange,
  maxFileSize = 10,
  acceptedTypes,
  disabled = false,
}: FileUploadFieldProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles);
      const maxBytes = maxFileSize * 1024 * 1024;

      for (const f of fileArray) {
        if (f.size > maxBytes) {
          toast.error(`${f.name} is too large (max ${maxFileSize}MB)`);
          return;
        }
      }

      onChange([
        ...files,
        ...fileArray.map((file) => ({
          file,
          id: `${file.name}-${Date.now()}-${Math.random()}`,
        })),
      ]);
    },
    [files, onChange, maxFileSize]
  );

  function removeFile(id: string) {
    onChange(files.filter((f) => f.id !== id));
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (!disabled) setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (!disabled && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`
          relative cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }
        `}
      >
        <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium">
          Drag & drop files here, or click to browse
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Max {maxFileSize}MB per file
          {acceptedTypes ? ` — ${acceptedTypes}` : ""}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes || undefined}
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map(({ file, id }) => {
            const Icon = getFileIcon(file.type);
            return (
              <div
                key={id}
                className="flex items-center gap-3 rounded-md border px-3 py-2"
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-sm">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatSize(file.size)}
                </span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(id);
                    }}
                    className="shrink-0 rounded-sm p-1 hover:bg-muted"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
