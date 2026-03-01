"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CampaignSummary } from "@/actions/admin/email-campaigns";

type Props = {
  campaigns: CampaignSummary[];
};

export function EmailHistory({ campaigns }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No campaigns sent yet.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8" />
          <TableHead>Subject</TableHead>
          <TableHead>Recipients</TableHead>
          <TableHead>Sent By</TableHead>
          <TableHead>Sent At</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {campaigns.map((c) => {
          const isOpen = expanded.has(c.id);
          return (
            <>
              <TableRow
                key={c.id}
                className="cursor-pointer"
                onClick={() => toggle(c.id)}
              >
                <TableCell>
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </TableCell>
                <TableCell className="font-medium">{c.subject}</TableCell>
                <TableCell>{c.recipientCount}</TableCell>
                <TableCell>{c.sentByName}</TableCell>
                <TableCell>
                  {new Date(c.sentAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </TableCell>
              </TableRow>
              {isOpen && (
                <TableRow key={`${c.id}-detail`}>
                  <TableCell colSpan={5} className="bg-muted/50 p-4">
                    <div className="space-y-4">
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: c.body }}
                      />
                      <div>
                        <p className="text-sm font-medium mb-2">
                          Recipients ({c.recipients.length})
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm">
                          {c.recipients.map((r) => (
                            <div
                              key={r.email}
                              className="flex items-center gap-2"
                            >
                              <span>{r.name}</span>
                              <span className="text-muted-foreground">
                                {r.email}
                              </span>
                              {r.status === "failed" && (
                                <Badge variant="destructive" className="text-xs">
                                  Failed
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </>
          );
        })}
      </TableBody>
    </Table>
  );
}
