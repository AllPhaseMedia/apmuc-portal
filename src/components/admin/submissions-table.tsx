"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye, Archive, Trash2, Download, Loader2 } from "lucide-react";
import { updateSubmissionStatus, deleteSubmissions, exportSubmissionsCsv } from "@/actions/admin/submissions";
import type { FormSubmission, SubmissionStatus } from "@prisma/client";
import type { FormField } from "@/types/forms";

interface SubmissionsTableProps {
  submissions: FormSubmission[];
  fields: FormField[];
  formId: string;
  total: number;
}

const STATUS_COLORS: Record<SubmissionStatus, "default" | "secondary" | "outline"> = {
  NEW: "default",
  READ: "secondary",
  ARCHIVED: "outline",
};

export function SubmissionsTable({ submissions, fields, formId, total }: SubmissionsTableProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewSubmission, setViewSubmission] = useState<FormSubmission | null>(null);
  const [acting, setActing] = useState(false);

  const previewFields = fields
    .filter((f) => !f.type.match(/^(heading|divider)$/))
    .slice(0, 3);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === submissions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(submissions.map((s) => s.id)));
    }
  };

  const handleBulkAction = async (action: "READ" | "ARCHIVED" | "delete") => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;

    setActing(true);
    try {
      if (action === "delete") {
        const result = await deleteSubmissions(ids);
        if (result.success) toast.success(`Deleted ${result.data} submission(s)`);
        else toast.error(result.error);
      } else {
        const result = await updateSubmissionStatus(ids, action);
        if (result.success) toast.success(`Updated ${result.data} submission(s)`);
        else toast.error(result.error);
      }
      setSelected(new Set());
      router.refresh();
    } finally {
      setActing(false);
    }
  };

  const handleExport = async () => {
    setActing(true);
    try {
      const result = await exportSubmissionsCsv(formId);
      if (result.success) {
        const blob = new Blob([result.data], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `submissions-${formId}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("CSV exported");
      } else {
        toast.error(result.error);
      }
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{total} total submissions</p>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <span className="text-sm text-muted-foreground">{selected.size} selected</span>
              <Button variant="outline" size="sm" onClick={() => handleBulkAction("READ")} disabled={acting}>
                Mark Read
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleBulkAction("ARCHIVED")} disabled={acting}>
                <Archive className="h-3.5 w-3.5 mr-1" />
                Archive
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleBulkAction("delete")} disabled={acting}>
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Delete
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={handleExport} disabled={acting}>
            {acting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />}
            Export CSV
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">
              <Checkbox
                checked={selected.size === submissions.length && submissions.length > 0}
                onCheckedChange={toggleAll}
              />
            </TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            {previewFields.map((f) => (
              <TableHead key={f.id}>{f.label}</TableHead>
            ))}
            <TableHead className="w-[60px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {submissions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4 + previewFields.length} className="text-center text-muted-foreground py-8">
                No submissions yet
              </TableCell>
            </TableRow>
          ) : (
            submissions.map((sub) => {
              const data = sub.data as Record<string, unknown>;
              return (
                <TableRow key={sub.id} className={sub.status === "NEW" ? "font-medium" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(sub.id)}
                      onCheckedChange={() => toggleSelect(sub.id)}
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(sub.createdAt), "MMM d, yyyy h:mm a")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_COLORS[sub.status]}>{sub.status}</Badge>
                  </TableCell>
                  {previewFields.map((f) => (
                    <TableCell key={f.id} className="max-w-[200px] truncate">
                      {Array.isArray(data[f.id])
                        ? (data[f.id] as string[]).join(", ")
                        : String(data[f.id] || "\u2014")}
                    </TableCell>
                  ))}
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setViewSubmission(sub)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <Dialog open={!!viewSubmission} onOpenChange={() => setViewSubmission(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submission Detail</DialogTitle>
          </DialogHeader>
          {viewSubmission && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {format(new Date(viewSubmission.createdAt), "MMMM d, yyyy 'at' h:mm a")}
              </p>
              {fields
                .filter((f) => !f.type.match(/^(heading|divider)$/))
                .map((f) => {
                  const val = (viewSubmission.data as Record<string, unknown>)[f.id];
                  return (
                    <div key={f.id}>
                      <p className="text-sm font-medium">{f.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {Array.isArray(val) ? val.join(", ") : String(val || "\u2014")}
                      </p>
                    </div>
                  );
                })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
