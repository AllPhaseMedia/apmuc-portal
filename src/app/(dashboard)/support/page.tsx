import { requireAuth } from "@/lib/auth";
import { getTickets } from "@/actions/support";
import { resolveClientContext } from "@/lib/client-context";
import { isConfigured } from "@/lib/helpscout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, Inbox, Plus, ShieldX } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  active: "default",
  pending: "secondary",
  closed: "outline",
  spam: "destructive",
};

export default async function SupportPage() {
  await requireAuth();

  const ctx = await resolveClientContext();
  if (ctx && !ctx.permissions.support) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Support</h1>
          <p className="text-muted-foreground">
            Get help with your services.
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShieldX className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              You don&apos;t have permission to view support tickets.
              Contact your account administrator for access.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isConfigured()) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Support</h1>
          <p className="text-muted-foreground">
            Get help with your services.
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              Support ticketing is being set up. Please email us directly for
              now.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const result = await getTickets();

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Support</h1>
            <p className="text-muted-foreground">Get help with your services.</p>
          </div>
          <Button asChild>
            <Link href="/support/new">
              <Plus className="mr-2 h-4 w-4" />
              New Ticket
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">{result.error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tickets = result.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Support</h1>
          <p className="text-muted-foreground">
            {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild>
            <Link href="/support/new">
              <Plus className="mr-2 h-4 w-4" />
              New Ticket
            </Link>
          </Button>
      </div>

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Inbox className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              No support tickets yet. Create one if you need help!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Link key={ticket.id} href={`/support/${ticket.id}`}>
              <Card className="transition-colors hover:border-primary/50">
                <CardContent className="flex items-start gap-3 py-4">
                  <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">
                        {ticket.subject}
                      </h3>
                      <Badge variant={STATUS_VARIANT[ticket.status] ?? "secondary"}>
                        {ticket.status}
                      </Badge>
                    </div>
                    {ticket.preview && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                        {ticket.preview}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      #{ticket.number} &middot; Updated{" "}
                      {format(
                        new Date(ticket.userUpdatedAt),
                        "MMM d, yyyy h:mm a"
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
