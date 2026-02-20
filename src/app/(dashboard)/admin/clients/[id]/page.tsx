import { requireAdmin } from "@/lib/auth";
import { getClient } from "@/actions/admin/clients";
import { ClientForm } from "@/components/admin/client-form";
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Client</h1>
          <p className="text-muted-foreground">{result.data.name}</p>
        </div>
        <DeleteClientButton clientId={id} clientName={result.data.name} />
      </div>
      <ClientForm client={result.data} />
    </div>
  );
}
