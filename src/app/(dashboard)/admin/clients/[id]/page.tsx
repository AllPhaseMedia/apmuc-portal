import { requireStaff } from "@/lib/auth";
import { getClient } from "@/actions/admin/clients";
import { ClientForm } from "@/components/admin/client-form";
import { ClientContacts } from "@/components/admin/client-contacts";
import { DeleteClientButton } from "@/components/admin/delete-client-button";
import { RestoreClientButton } from "@/components/admin/restore-client-button";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";

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
          {!client.isActive && <RestoreClientButton clientId={id} />}
          <DeleteClientButton clientId={id} clientName={client.name} />
        </div>
      </div>
      <ClientForm client={client} />
      {user.isAdmin && (
        <ClientContacts clientId={id} contacts={client.contacts ?? []} />
      )}
    </div>
  );
}
