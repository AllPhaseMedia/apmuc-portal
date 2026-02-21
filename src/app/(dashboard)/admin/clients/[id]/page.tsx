import { requireAdmin } from "@/lib/auth";
import { getClient } from "@/actions/admin/clients";
import { ClientForm } from "@/components/admin/client-form";
import { ClientContacts } from "@/components/admin/client-contacts";
import { DeleteClientButton } from "@/components/admin/delete-client-button";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditClientPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const result = await getClient(id);

  if (!result.success) {
    notFound();
  }

  const client = result.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Client</h1>
          <p className="text-muted-foreground">{client.name}</p>
        </div>
        <DeleteClientButton clientId={id} clientName={client.name} />
      </div>
      <ClientForm client={client} />
      <ClientContacts clientId={id} contacts={client.contacts ?? []} />
    </div>
  );
}
