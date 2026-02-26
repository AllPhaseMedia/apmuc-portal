import { requireStaff } from "@/lib/auth";
import { getClient } from "@/actions/admin/clients";
import { ClientForm } from "@/components/admin/client-form";
import { ClientContacts } from "@/components/admin/client-contacts";
import { DeleteClientButton } from "@/components/admin/delete-client-button";
import { RestoreClientButton } from "@/components/admin/restore-client-button";
import { SiteCheckButton } from "@/components/admin/site-check-button";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditClientPage({ params }: Props) {
  const user = await requireStaff();
  const { id } = await params;
  const result = await getClient(id);

  if (!result.success) {
    notFound();
  }

  const client = result.data;
  const latestCheck = client.siteChecks?.[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Edit Client</h1>
            <p className="text-muted-foreground">{client.name}</p>
          </div>
          {!client.isActive && <Badge variant="outline">Archived</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <SiteCheckButton clientId={id} hasWebsiteUrl={!!client.websiteUrl} />
          {!client.isActive && <RestoreClientButton clientId={id} />}
          <DeleteClientButton clientId={id} clientName={client.name} />
        </div>
      </div>

      {latestCheck && (
        <div className="rounded-lg border p-4 text-sm space-y-1">
          <p className="font-medium">Latest Site Check</p>
          <p className="text-muted-foreground">
            Checked: {format(new Date(latestCheck.checkedAt), "MMM d, yyyy h:mm a")}
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-muted-foreground">
            <span>SSL: {latestCheck.sslValid != null ? (latestCheck.sslValid ? "Valid" : "Invalid") : "N/A"}</span>
            <span>Domain: {latestCheck.domainRegistrar ?? "N/A"}</span>
            <span>Expires: {latestCheck.domainExpiresAt ? format(new Date(latestCheck.domainExpiresAt), "MMM d, yyyy") : "N/A"}</span>
          </div>
        </div>
      )}

      <ClientForm client={client} isAdmin={user.isAdmin} />
      <ClientContacts clientId={id} contacts={client.contacts ?? []} />
    </div>
  );
}
