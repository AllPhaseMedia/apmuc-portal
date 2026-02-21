import { requireStaff } from "@/lib/auth";
import { ClientForm } from "@/components/admin/client-form";

export default async function NewClientPage() {
  await requireStaff();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Client</h1>
        <p className="text-muted-foreground">Add a new client to the portal.</p>
      </div>
      <ClientForm />
    </div>
  );
}
