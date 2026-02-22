import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus, Inbox } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import type { HelpScoutConversation } from "@/lib/helpscout";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  active: "default",
  pending: "secondary",
  closed: "outline",
  spam: "destructive",
};

type Props = {
  tickets: HelpScoutConversation[];
};

export function RecentSupportCard({ tickets }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <MessageSquare className="h-4 w-4" />
          Recent Support Requests
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/support/new">
              <Plus className="mr-1 h-3 w-3" />
              New Ticket
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/support">View All</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center py-6">
            <Inbox className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No support tickets yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/support/${ticket.id}`}
                className="flex items-center justify-between gap-3 rounded-md border p-3 transition-colors hover:border-primary/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{ticket.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    #{ticket.number}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={STATUS_VARIANT[ticket.status] ?? "secondary"} className="text-xs">
                    {ticket.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(ticket.userUpdatedAt), "MMM d")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
