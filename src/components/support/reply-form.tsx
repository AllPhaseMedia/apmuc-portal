"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { replyToTicket } from "@/actions/support";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Upload, X, FileText, ImageIcon, File, Paperclip } from "lucide-react";

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

async function fileToBase64(file: File): Promise<string> {
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

type Props = {
  conversationId: number;
};

export function ReplyForm({ conversationId }: Props) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const maxSize = 10 * 1024 * 1024;

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

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;

    const pastedFiles: File[] = [];
    for (const item of Array.from(items)) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) pastedFiles.push(file);
      }
    }

    if (pastedFiles.length > 0) {
      addFiles(pastedFiles);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() && files.length === 0) return;

    setLoading(true);

    const attachments = await Promise.all(
      files.map(async ({ file }) => ({
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        data: await fileToBase64(file),
      }))
    );

    const result = await replyToTicket(conversationId, body, attachments);
    if (result.success) {
      toast.success("Reply sent");
      setBody("");
      setFiles([]);
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-lg transition-colors ${
          dragOver ? "ring-2 ring-primary ring-offset-2" : ""
        }`}
      >
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onPaste={handlePaste}
          rows={4}
          placeholder="Type your reply... (paste or drag files here)"
          required={files.length === 0}
        />
        {dragOver && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-primary/10 border-2 border-dashed border-primary">
            <div className="flex items-center gap-2 text-primary font-medium">
              <Upload className="h-5 w-5" />
              Drop files here
            </div>
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map(({ file, id }) => {
            const Icon = getFileIcon(file.type);
            return (
              <div
                key={id}
                className="flex items-center gap-3 rounded-md border px-3 py-1.5 text-sm"
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatSize(file.size)}
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(id)}
                  className="shrink-0 rounded-sm p-0.5 hover:bg-muted"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Paperclip className="h-4 w-4" />
          Attach files
        </button>
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
        <Button type="submit" disabled={loading || (!body.trim() && files.length === 0)}>
          <Send className="mr-2 h-4 w-4" />
          {loading ? "Sending..." : "Send Reply"}
        </Button>
      </div>
    </form>
  );
}
