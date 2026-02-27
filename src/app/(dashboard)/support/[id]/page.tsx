import { requireAuth } from "@/lib/auth";
import { getTicket } from "@/actions/support";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ReplyForm } from "@/components/support/reply-form";
import { format } from "date-fns";
import { FileText, ImageIcon, File, Download } from "lucide-react";
import Link from "next/link";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  active: "default",
  pending: "secondary",
  closed: "outline",
  spam: "destructive",
};

function safeFormat(dateStr: unknown, pattern: string): string {
  try {
    if (!dateStr || typeof dateStr !== "string") return "Unknown date";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Unknown date";
    return format(d, pattern);
  } catch {
    return "Unknown date";
  }
}

/**
 * Lightweight HTML sanitizer that doesn't require JSDOM.
 * Strips scripts and event handlers while preserving safe formatting.
 */
function lightSanitize(html: string): string {
  if (!html) return "";
  return html
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    // Remove event handler attributes
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "")
    // Remove javascript: URLs
    .replace(/href\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, 'href="#"')
    .replace(/src\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, 'src=""');
}

type Props = {
  params: Promise<{ id: string }>;
};

export default async function TicketDetailPage({ params }: Props) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return (
      <Card><CardContent className="py-6">
        <p className="text-sm text-muted-foreground">Please sign in to view this ticket.</p>
        <Link href="/support" className="text-sm text-primary underline mt-2 block">Back to Support</Link>
      </CardContent></Card>
    );
  }

  const { id } = await params;
  const conversationId = Number(id);

  if (isNaN(conversationId)) {
    return (
      <Card><CardContent className="py-6">
        <p className="text-sm text-muted-foreground">Invalid ticket ID.</p>
        <Link href="/support" className="text-sm text-primary underline mt-2 block">Back to Support</Link>
      </CardContent></Card>
    );
  }

  const result = await getTicket(conversationId);

  if (!result.success) {
    return (
      <div className="space-y-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/support">Support</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Ticket</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">{result.error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const ticket = result.data;
  const threads = ticket._embedded?.threads ?? [];

  const visibleThreads = threads
    .filter((t) => t.type === "customer" || t.type === "message" || t.type === "reply")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/support">Support</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>#{ticket.number}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            {ticket.subject}
          </h1>
          <Badge variant={STATUS_VARIANT[ticket.status] ?? "secondary"}>
            {ticket.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Ticket #{ticket.number} &middot; Created{" "}
          {safeFormat(ticket.createdAt, "MMMM d, yyyy h:mm a")}
        </p>
      </div>

      <div className="space-y-4">
        {visibleThreads.map((thread) => {
          const isCustomer = thread.createdBy?.type === "customer";
          const attachments = thread._embedded?.attachments ?? thread.attachments ?? [];
          const authorName = isCustomer
            ? "You"
            : `${thread.createdBy?.first ?? ""} ${thread.createdBy?.last ?? ""}`.trim() || "Support";

          return (
            <Card
              key={thread.id}
              className={isCustomer ? "" : "border-primary/20 bg-primary/5"}
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">{authorName}</p>
                  <p className="text-xs text-muted-foreground">
                    {safeFormat(thread.createdAt, "MMM d, yyyy h:mm a")}
                  </p>
                </div>
                {thread.body && (
                  <div
                    className="prose prose-sm prose-neutral dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: lightSanitize(thread.body) }}
                  />
                )}
                {attachments.length > 0 && (
                  <div className="mt-3 space-y-1.5 border-t pt-3">
                    <p className="text-xs font-medium text-muted-foreground">Attachments</p>
                    {attachments.map((att) => {
                      const mimeType = att.mimeType ?? "";
                      const Icon = mimeType.startsWith("image/")
                        ? ImageIcon
                        : mimeType.includes("pdf") || mimeType.includes("document")
                          ? FileText
                          : File;
                      const size = att.size
                        ? att.size < 1024
                          ? `${att.size} B`
                          : att.size < 1024 * 1024
                            ? `${(att.size / 1024).toFixed(1)} KB`
                            : `${(att.size / (1024 * 1024)).toFixed(1)} MB`
                        : "";
                      const downloadUrl = att._links?.download?.href ?? att._links?.data?.href;
                      return (
                        <a
                          key={att.id}
                          href={downloadUrl ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors no-underline"
                        >
                          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="flex-1 truncate">{att.filename}</span>
                          {size && <span className="text-xs text-muted-foreground">{size}</span>}
                          <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        </a>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {ticket.status !== "closed" && (
        <>
          <Separator />
          <div>
            <h2 className="text-lg font-semibold mb-3">Reply</h2>
            <ReplyForm conversationId={ticket.id} />
          </div>
        </>
      )}
    </div>
  );
}
