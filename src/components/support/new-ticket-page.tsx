"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createTicket } from "@/actions/support";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, FileText, ImageIcon, File } from "lucide-react";

type FileWithPreview = {
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

type Props = {
  defaultName: string;
  defaultEmail: string;
  defaultWebsite: string;
};

export function NewTicketPage({ defaultName, defaultEmail, defaultWebsite }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const maxSize = 10 * 1024 * 1024; // 10MB per file

    for (const f of fileArray) {
      if (f.size > maxSize) {
        toast.error(`${f.name} is too large (max 10MB)`);
        return;
      }
    }

    setFiles((prev) => [
      ...prev,
      ...fileArray.map((file) => ({
        file,
        id: `${file.name}-${Date.now()}-${Math.random()}`,
      })),
    ]);
  }, []);

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }

  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:mime;base64, prefix
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const website = formData.get("website") as string;
    const content = formData.get("content") as string;

    // Build subject from first line or truncated content
    const subject = website
      ? `Support Request — ${website}`
      : "Support Request";

    // Build body with all fields
    const body = `**Name:** ${name}\n**Email:** ${email}\n**Website:** ${website}\n\n---\n\n${content}`;

    // Convert files to base64 attachments
    const attachments = await Promise.all(
      files.map(async ({ file }) => ({
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        data: await fileToBase64(file),
      }))
    );

    const result = await createTicket(subject, body, attachments);
    if (result.success) {
      toast.success("Ticket created! We'll get back to you soon.");
      router.push("/support");
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  }

  return (
    <form onSubmit={onSubmit}>
      <Card>
        <CardContent className="space-y-6 pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={defaultName}
                placeholder="Your name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={defaultEmail}
                placeholder="your@email.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website *</Label>
            <Input
              id="website"
              name="website"
              defaultValue={defaultWebsite}
              placeholder="https://yourwebsite.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Detailed Instructions / Content *</Label>
            <Textarea
              id="content"
              name="content"
              rows={24}
              className="min-h-[400px]"
              placeholder="Please describe your issue or request in detail..."
              required
            />
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>File Attachments</Label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors
                ${dragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
                }
              `}
            >
              <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">
                Drag & drop files here, or click to browse
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Max 10MB per file. Images, PDFs, documents, etc.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>

            {files.length > 0 && (
              <div className="space-y-2 mt-3">
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
                      <button
                        type="button"
                        onClick={() => removeFile(id)}
                        className="shrink-0 rounded-sm p-1 hover:bg-muted"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit Ticket"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/support")}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
