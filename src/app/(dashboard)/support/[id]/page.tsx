import { requireAuth } from "@/lib/auth";
import { getTicket } from "@/actions/support";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function TicketDetailPage({ params }: Props) {
  console.log("[support/[id]] === PAGE START ===");

  let user;
  try {
    user = await requireAuth();
    console.log("[support/[id]] Auth OK, user:", user.email);
  } catch (e) {
    console.error("[support/[id]] Auth failed:", e);
    return (
      <Card>
        <CardContent className="py-6">
          <p>Auth failed: {e instanceof Error ? e.message : "Unknown"}</p>
          <Link href="/support" className="text-sm text-primary underline mt-2 block">Back to Support</Link>
        </CardContent>
      </Card>
    );
  }

  const { id } = await params;
  console.log("[support/[id]] Param id:", id);
  const conversationId = Number(id);

  if (isNaN(conversationId)) {
    return (
      <Card>
        <CardContent className="py-6">
          <p>Invalid ticket ID: {id}</p>
          <Link href="/support" className="text-sm text-primary underline mt-2 block">Back to Support</Link>
        </CardContent>
      </Card>
    );
  }

  let result;
  try {
    result = await getTicket(conversationId);
    console.log("[support/[id]] getTicket result success:", result.success);
  } catch (e) {
    console.error("[support/[id]] getTicket threw:", e);
    return (
      <Card>
        <CardContent className="py-6">
          <p>getTicket error: {e instanceof Error ? e.message : "Unknown"}</p>
          <Link href="/support" className="text-sm text-primary underline mt-2 block">Back to Support</Link>
        </CardContent>
      </Card>
    );
  }

  if (!result.success) {
    return (
      <Card>
        <CardContent className="py-6">
          <p>Ticket error: {result.error}</p>
          <Link href="/support" className="text-sm text-primary underline mt-2 block">Back to Support</Link>
        </CardContent>
      </Card>
    );
  }

  const ticket = result.data;
  console.log("[support/[id]] Ticket subject:", ticket.subject, "threads:", ticket._embedded?.threads?.length ?? 0);

  return (
    <div className="space-y-4">
      <Link href="/support" className="text-sm text-primary underline">Back to Support</Link>
      <h1 className="text-2xl font-bold">{ticket.subject ?? "No subject"}</h1>
      <p className="text-sm text-muted-foreground">
        Status: {ticket.status ?? "unknown"} | ID: {ticket.id} | #{ticket.number}
      </p>
      <div className="space-y-3">
        {(ticket._embedded?.threads ?? []).map((thread) => (
          <Card key={thread.id}>
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground mb-1">
                Type: {thread.type ?? "?"} | By: {thread.createdBy?.first ?? "?"} {thread.createdBy?.last ?? ""} ({thread.createdBy?.type ?? "system"})
              </p>
              <p className="text-sm whitespace-pre-wrap">{thread.body ? thread.body.substring(0, 200) + "..." : "(no body)"}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
