import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewTicketPage } from "@/components/support/new-ticket-page";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NewTicketRoute() {
  const user = await requireAuth();

  const client = await prisma.client.findFirst({
    where: { clerkUserId: user.clerkUserId },
    select: { name: true, email: true, websiteUrl: true },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link
          href="/support"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Support
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          New Support Ticket
        </h1>
        <p className="text-muted-foreground">
          Describe your issue and we&apos;ll get back to you as soon as
          possible.
        </p>
      </div>
      <NewTicketPage
        defaultName={client?.name ?? user.name}
        defaultEmail={client?.email ?? user.email}
        defaultWebsite={client?.websiteUrl ?? ""}
      />
    </div>
  );
}
