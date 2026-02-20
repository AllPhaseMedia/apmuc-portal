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
import { notFound } from "next/navigation";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  active: "default",
  pending: "secondary",
  closed: "outline",
  spam: "destructive",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function TicketDetailPage({ params }: Props) {
  await requireAuth();
  const { id } = await params;
  const conversationId = Number(id);

  if (isNaN(conversationId)) {
    notFound();
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

  // Filter to customer-visible threads (not internal notes)
  const visibleThreads = threads.filter(
    (t) => t.type === "customer" || t.type === "message" || t.type === "reply"
  );

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
          {format(new Date(ticket.createdAt), "MMMM d, yyyy h:mm a")}
        </p>
      </div>

      {/* Conversation threads */}
      <div className="space-y-4">
        {visibleThreads.map((thread) => {
          const isCustomer = thread.createdBy.type === "customer";
          return (
            <Card
              key={thread.id}
              className={isCustomer ? "" : "border-primary/20 bg-primary/5"}
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">
                    {isCustomer ? "You" : `${thread.createdBy.first} ${thread.createdBy.last}`.trim() || "Support"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(
                      new Date(thread.createdAt),
                      "MMM d, yyyy h:mm a"
                    )}
                  </p>
                </div>
                <div
                  className="prose prose-sm prose-neutral dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: thread.body }}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Reply form (only if ticket is not closed) */}
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
