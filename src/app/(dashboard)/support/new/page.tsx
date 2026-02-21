import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewTicketPage } from "@/components/support/new-ticket-page";
import { DynamicSupportForm } from "@/components/support/dynamic-support-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { FormField, FormSettings } from "@/types/forms";

export default async function NewTicketRoute() {
  const user = await requireAuth();

  // Get website from ClientContact → Client
  const contact = await prisma.clientContact.findFirst({
    where: { clerkUserId: user.clerkUserId, isActive: true },
    include: { client: { select: { name: true, websiteUrl: true } } },
  });

  // Check for a dynamic support-request form
  const dynamicForm = await prisma.form.findFirst({
    where: { slug: "support-request", isActive: true },
  });

  const prefill = {
    name: contact?.client.name ?? user.name,
    email: user.email,
    website: contact?.client.websiteUrl ?? "",
  };

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

      {dynamicForm ? (
        <DynamicSupportForm
          formId={dynamicForm.id}
          fields={dynamicForm.fields as unknown as FormField[]}
          settings={dynamicForm.settings as unknown as FormSettings}
          prefill={prefill}
        />
      ) : (
        <NewTicketPage
          defaultName={contact?.client.name ?? user.name}
          defaultEmail={user.email}
          defaultWebsite={contact?.client.websiteUrl ?? ""}
        />
      )}
    </div>
  );
}
